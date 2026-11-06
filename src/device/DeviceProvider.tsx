// Keeps ONE Bluetooth connection alive for the whole app. It scans, connects, reconnects when the link
// drops, and turns the device's readings into cough events that are saved on the phone.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EventDetector } from '@/analysis';
import { useStore } from '@/store';
import { link } from './link';
import type { Reading } from './protocol';
import type { Connection, FoundDevice, InjectKind, LinkError } from './types';

export type DevicePhase = 'idle' | 'scanning' | 'found' | 'connecting' | 'connected' | 'error';

type DeviceCtx = {
  phase: DevicePhase;
  found: FoundDevice | null;
  error: LinkError | null;
  /** The newest reading from the device (about one per second). */
  latest: Reading | null;
  /** true = real Bluetooth. false = built-in demo device. */
  isReal: boolean;
  /** Trying to get a paired device back after the link dropped. */
  reconnecting: boolean;
  scan: () => void;
  cancelScan: () => void;
  connect: (d: FoundDevice) => void;
  disconnect: () => void;
  inject: (kind: InjectKind) => void;
  /** Every reading from the connected device, including while background listening is paused. */
  subscribe: (onReading: (r: Reading) => void) => () => void;
};

const Ctx = createContext<DeviceCtx | null>(null);
const RETRY_MS = 10000;

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const { hydrated, deviceId, deviceName, listening, update, addCoughEvents } = useStore();
  const [phase, setPhase] = useState<DevicePhase>('idle');
  const [found, setFound] = useState<FoundDevice | null>(null);
  const [error, setError] = useState<LinkError | null>(null);
  const [latest, setLatest] = useState<Reading | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  const conn = useRef<Connection | null>(null);
  const stopScan = useRef<(() => void) | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detector = useRef(new EventDetector());
  const wantLink = useRef(false); // the person wants the device connected, so reconnect if it drops
  const listeners = useRef(new Set<(r: Reading) => void>());
  const listeningRef = useRef(listening);
  const addRef = useRef(addCoughEvents);
  const connectRef = useRef<(id: string, name: string, auto: boolean) => void>(() => {});
  const startedRef = useRef(false);

  useEffect(() => {
    listeningRef.current = listening;
    addRef.current = addCoughEvents;
  }, [listening, addCoughEvents]);

  const onReading = useCallback((r: Reading) => {
    const watching = listeners.current.size > 0;
    // Background counting can be paused. A live recording still needs every sample.
    if (!listeningRef.current && !watching) return;
    setLatest(r);
    listeners.current.forEach((fn) => fn(r));
    if (!listeningRef.current) return;
    const ev = detector.current.push(r, link.isReal ? 'device' : 'sim');
    if (ev) addRef.current([ev]);
  }, []);

  const clearRetry = () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = null;
  };

  const connectTo = useCallback(
    async (id: string, name: string, auto: boolean) => {
      clearRetry();
      wantLink.current = true;
      if (auto) setReconnecting(true);
      else setPhase('connecting');
      setError(null);
      try {
        conn.current?.disconnect();
        conn.current = await link.connect(id, {
          onReading,
          onDisconnect: () => {
            conn.current = null;
            setPhase('idle');
            if (wantLink.current && link.isReal) {
              setReconnecting(true);
              retryTimer.current = setTimeout(() => connectRef.current(id, name, true), RETRY_MS);
            }
          },
        });
        setReconnecting(false);
        setPhase('connected');
        update({ deviceName: name, deviceId: id });
      } catch (e) {
        if (auto) {
          retryTimer.current = setTimeout(() => connectRef.current(id, name, true), RETRY_MS);
        } else {
          setError((e as LinkError) ?? 'failed');
          setPhase('error');
        }
      }
    },
    [onReading, update],
  );

  useEffect(() => {
    connectRef.current = connectTo;
  }, [connectTo]);

  // On launch, get a previously paired real device back automatically.
  useEffect(() => {
    if (!hydrated || startedRef.current) return;
    startedRef.current = true;
    if (!link.isReal) return;
    // A saved demo pairing is not a real board. Drop it so the screen does not look connected.
    if (deviceId === 'demo-1') {
      update({ deviceName: null, deviceId: null });
      return;
    }
    if (deviceId && deviceName) connectTo(deviceId, deviceName, true);
  }, [hydrated, deviceId, deviceName, connectTo, update]);

  // Stop everything when the app shuts down.
  useEffect(
    () => () => {
      clearRetry();
      stopScan.current?.();
      conn.current?.disconnect();
    },
    [],
  );

  const scan = useCallback(() => {
    stopScan.current?.();
    setPhase('scanning');
    setError(null);
    setFound(null);
    stopScan.current = link.scan(
      (d) => {
        stopScan.current?.();
        stopScan.current = null;
        setFound(d);
        setPhase('found');
      },
      (e) => {
        stopScan.current?.();
        stopScan.current = null;
        if (e === 'cancelled') {
          setPhase('idle');
          return;
        }
        setError(e);
        setPhase('error');
      },
    );
  }, []);

  const cancelScan = useCallback(() => {
    stopScan.current?.();
    stopScan.current = null;
    setPhase((p) => (p === 'scanning' || p === 'found' || p === 'error' ? 'idle' : p));
  }, []);

  const connect = useCallback((d: FoundDevice) => connectTo(d.id, d.name, false), [connectTo]);

  const disconnect = useCallback(() => {
    wantLink.current = false;
    clearRetry();
    stopScan.current?.();
    stopScan.current = null;
    conn.current?.disconnect();
    conn.current = null;
    detector.current.flush('device');
    setReconnecting(false);
    setLatest(null);
    setFound(null);
    setPhase('idle');
    update({ deviceName: null, deviceId: null });
  }, [update]);

  const inject = useCallback((kind: InjectKind) => conn.current?.inject?.(kind), []);

  const subscribe = useCallback((fn: (r: Reading) => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  const value = useMemo<DeviceCtx>(
    () => ({ phase, found, error, latest, isReal: link.isReal, reconnecting, scan, cancelScan, connect, disconnect, inject, subscribe }),
    [phase, found, error, latest, reconnecting, scan, cancelScan, connect, disconnect, inject, subscribe],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDevice() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDevice outside DeviceProvider');
  return v;
}
