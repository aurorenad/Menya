// App state. Offline-first: everything is persisted to the phone (AsyncStorage) and every
// change a health worker makes is queued in `pending` until the network is back.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Lang, makeT, TFunc } from '@/i18n';
import { AlertItem, ChatMessage, CHW_USER, DayCount, DEMO_PATIENT_NAME, DEMO_PATIENT_PHONE, PATIENT_USER_ID, Patient, WATCH_DAYS } from '@/data/mock';
import { CoughEvent, Conclusion, analyse, buildSeries } from '@/analysis';
import type { SavedCough } from '@/checkSession';

export type Role = 'patient' | 'chw';
export type Note = { id: string; text: string; at: number };
export type PatientActions = { visitedAt?: number; referredAt?: number; receivedAt?: number };
export type PendingItem = { id: string; label: string; at: number };
export type SentSample = { id: string; at: number; patientId: string; chwId: string; tb: number; other: number; noise: number };

type Persisted = {
  lang: Lang;
  role: Role | null;
  consented: boolean;
  signedIn: boolean;
  phone: string;
  displayName: string;
  patientName: string;
  patientPhone: string;
  deviceName: string | null;
  battery: number;
  notifications: { inApp: boolean; sms: boolean; daily: boolean };
  notes: Record<string, Note[]>;
  actions: Record<string, PatientActions>;
  alerts: AlertItem[];
  alertsBaseTime: number;
  pending: PendingItem[];
  lastSynced: number;
  listening: boolean; // keep counting coughs in the background (needs a connected device)
  chwContactedAt: number | null; // when the PERSON chose to message their health worker (Menya never does it)
  deviceId: string | null; // Bluetooth id of the paired Arduino (for reconnecting)
  coughEvents: CoughEvent[]; // one entry per cough detected by the device (or by the demo device)
  spotChecks: SavedCough[]; // cough scores kept from a recording, including the device's real percentages
  chats: ChatMessage[]; // messages the person chose to send. Menya never sends one on its own.
  samples: SentSample[]; // cough scores the person chose to send to their health worker. No voice.
};

const initial = (): Persisted => ({
  lang: 'en',
  role: null,
  consented: false,
  signedIn: false,
  phone: '',
  displayName: '',
  patientName: DEMO_PATIENT_NAME,
  patientPhone: DEMO_PATIENT_PHONE,
  deviceName: null,
  battery: 0,
  notifications: { inApp: true, sms: true, daily: false },
  notes: {},
  actions: {},
  alerts: [],
  alertsBaseTime: Date.now(),
  pending: [],
  lastSynced: 0,
  listening: true,
  chwContactedAt: null,
  deviceId: null,
  coughEvents: [],
  spotChecks: [],
  chats: [],
  samples: [],
});

const MAX_EVENTS = 5000;
const KEEP_MS = 31 * 24 * 3600 * 1000;

type Store = Persisted & {
  hydrated: boolean;
  t: TFunc;
  isOnline: boolean;
  syncing: boolean;
  justSynced: boolean;
  toast: string | null;
  patients: Patient[];
  me: Patient; // the logged-in patient's own record
  /** Conclusion drawn from the real device's cough events (demo data is not included). */
  conclusion: Conclusion;
  addCoughEvents: (events: CoughEvent[]) => void;
  clearCoughEvents: (src: CoughEvent['src'] | 'all') => void;
  addSpotCough: (cough: SavedCough) => void;
  sendChat: (thread: string, from: 'patient' | 'chw', text: string) => void;
  markChatSeen: (thread: string, mine: 'patient' | 'chw') => void;
  removeCough: (at: number) => void;
  sendSample: (text: string) => boolean;
  enterDemo: (who: 'christian' | 'temana') => void;
  update: (patch: Partial<Persisted>) => void;
  addNote: (patientId: string, text: string) => void;
  toggleAction: (patientId: string, key: 'visitedAt' | 'referredAt' | 'receivedAt') => void;
  markAlertSeen: (id: string) => void;
  syncNow: () => void;
  showToast: (msg: string) => void;
  signOut: () => void;
  deleteLocalData: () => void;
};

const Ctx = createContext<Store | null>(null);
const KEY = 'menya.v2';
const EMPTY_SERIES: DayCount[] = Array.from({ length: 30 }, () => ({ day: 0, night: 0 }));

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(initial);
  const [hydrated, setHydrated] = useState(false);
  const [netOnline, setNetOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved data from the phone.
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setState({ ...initial(), ...JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  // Save on every change.
  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated]);

  // Real connectivity.
  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) => setNetOnline(s.isConnected !== false && s.isInternetReachable !== false));
    return unsub;
  }, []);

  const isOnline = netOnline;
  const t = useMemo(() => makeT(state.lang), [state.lang]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const update = useCallback((patch: Partial<Persisted>) => setState((s) => ({ ...s, ...patch })), []);

  const queue = (s: Persisted, label: string): Persisted => ({
    ...s,
    pending: [...s.pending, { id: String(Date.now() + Math.random()), label, at: Date.now() }],
  });

  const addCoughEvents = useCallback((events: CoughEvent[]) => {
    if (events.length === 0) return;
    setState((s) => {
      const cutoff = Date.now() - KEEP_MS;
      const all = [...s.coughEvents, ...events].filter((e) => e.at >= cutoff);
      return { ...s, coughEvents: all.length > MAX_EVENTS ? all.slice(all.length - MAX_EVENTS) : all };
    });
  }, []);

  const clearCoughEvents = useCallback((src: CoughEvent['src'] | 'all') => {
    setState((s) => ({ ...s, coughEvents: src === 'all' ? [] : s.coughEvents.filter((e) => e.src !== src) }));
  }, []);

  const addSpotCough = useCallback((cough: SavedCough) => {
    setState((s) => ({ ...s, spotChecks: [...s.spotChecks, cough].slice(-50) }));
  }, []);

  const sendChat = useCallback((thread: string, from: 'patient' | 'chw', text: string) => {
    const clean = text.trim().slice(0, 500);
    if (!clean) return;
    setState((s) => {
      const msg: ChatMessage = { id: String(Date.now()), thread, from, text: clean, at: Date.now(), seen: false };
      let next: Persisted = { ...s, chats: [...(s.chats ?? []), msg].slice(-200) };
      if (from === 'patient') {
        const [patientId, chwId] = thread.split(':');
        next = { ...next, chwContactedAt: s.chwContactedAt ?? Date.now() };
        const already = s.alerts.some((a) => a.patientId === patientId && a.reasonKey === 'chat.alertReason');
        if (chwId === 'chw1' && patientId && !already) {
          const alert: AlertItem = {
            id: 'chat' + Date.now(),
            patientId,
            minutesAgo: 0,
            reasonKey: 'chat.alertReason',
            isNew: true,
            smsSent: false,
          };
          next = { ...next, alerts: [alert, ...s.alerts] };
        }
      }
      return queue(next, 'chat');
    });
  }, []);

  const removeCough = useCallback((at: number) => {
    setState((s) => ({
      ...s,
      coughEvents: s.coughEvents.filter((e) => e.at !== at),
      spotChecks: s.spotChecks.filter((c) => c.at !== at),
    }));
    showToast(t('cough.removed'));
  }, [showToast, t]);

  const sendSample = useCallback((text: string) => {
    let sent = false;
    setState((s) => {
      const spot = s.spotChecks[s.spotChecks.length - 1];
      const ev = s.coughEvents[s.coughEvents.length - 1];
      if (!spot && !ev) return s;
      sent = true;
      const sample: SentSample = {
        id: String(Date.now()),
        at: spot?.at ?? ev?.at ?? Date.now(),
        patientId: PATIENT_USER_ID,
        chwId: CHW_USER.id,
        tb: spot?.tb ?? ev?.tb ?? (ev?.kind === 'tb' ? ev.conf : 0),
        other: spot?.other ?? ev?.other ?? (ev?.kind === 'other' ? ev.conf : 0),
        noise: spot?.noise ?? ev?.noise ?? 0,
      };
      const msg: ChatMessage = {
        id: 'sample' + sample.id,
        thread: `${PATIENT_USER_ID}:${CHW_USER.id}`,
        from: 'patient',
        text,
        at: Date.now(),
        seen: false,
      };
      const already = s.alerts.some((a) => a.patientId === PATIENT_USER_ID && a.reasonKey === 'sample.alert' && a.isNew);
      const alert: AlertItem = {
        id: 'sample-alert' + sample.id,
        patientId: PATIENT_USER_ID,
        minutesAgo: 0,
        reasonKey: 'sample.alert',
        isNew: true,
        smsSent: false,
      };
      return queue(
        {
          ...s,
          samples: [...(s.samples ?? []), sample].slice(-30),
          chats: [...(s.chats ?? []), msg].slice(-200),
          alerts: already ? s.alerts : [alert, ...s.alerts],
          chwContactedAt: s.chwContactedAt ?? Date.now(),
        },
        'sample',
      );
    });
    if (sent) showToast(t('sample.sent', { name: CHW_USER.name }));
    else showToast(t('sample.none'));
    return sent;
  }, [showToast, t]);

  const enterDemo = useCallback((who: 'christian' | 'temana') => {
    setState((s) =>
      who === 'christian'
        ? { ...s, role: 'patient', signedIn: true, consented: true, phone: DEMO_PATIENT_PHONE, displayName: DEMO_PATIENT_NAME, patientName: DEMO_PATIENT_NAME, patientPhone: DEMO_PATIENT_PHONE }
        : { ...s, role: 'chw', signedIn: true, consented: true, phone: '', displayName: CHW_USER.name, patientName: s.patientName || DEMO_PATIENT_NAME, patientPhone: s.patientPhone || DEMO_PATIENT_PHONE },
    );
  }, []);

  const markChatSeen = useCallback((thread: string, mine: 'patient' | 'chw') => {
    setState((s) => {
      let changed = false;
      const chats = (s.chats ?? []).map((m) => {
        if (m.thread === thread && m.from !== mine && !m.seen) {
          changed = true;
          return { ...m, seen: true };
        }
        return m;
      });
      return changed ? { ...s, chats } : s;
    });
  }, []);

  const addNote = useCallback((patientId: string, text: string) => {
    setState((s) => {
      const note: Note = { id: String(Date.now()), text, at: Date.now() };
      return queue({ ...s, notes: { ...s.notes, [patientId]: [note, ...(s.notes[patientId] ?? [])] } }, 'note');
    });
  }, []);

  const toggleAction = useCallback((patientId: string, key: 'visitedAt' | 'referredAt' | 'receivedAt') => {
    setState((s) => {
      const cur = s.actions[patientId] ?? {};
      const next = { ...cur, [key]: cur[key] ? undefined : Date.now() };
      return queue({ ...s, actions: { ...s.actions, [patientId]: next } }, key);
    });
  }, []);

  const markAlertSeen = useCallback((id: string) => {
    setState((s) => ({ ...s, alerts: s.alerts.map((a) => (a.id === id ? { ...a, isNew: false } : a)) }));
  }, []);

  const syncNow = useCallback(() => {
    if (!isOnline) {
      showToast(state.lang === 'rw' ? 'Nta interineti. Amakuru abitswe kuri telefoni.' : 'No internet. Your data is saved on this phone.');
      return;
    }
    setSyncing(true);
    setTimeout(() => {
      setState((s) => ({ ...s, lastSynced: Date.now(), pending: [] }));
      setSyncing(false);
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);
    }, 1400);
  }, [isOnline, showToast, state.lang]);

  // When the network returns, send the queued changes automatically.
  useEffect(() => {
    if (hydrated && isOnline && state.pending.length > 0 && !syncing) {
      const id = setTimeout(syncNow, 1200);
      return () => clearTimeout(id);
    }
  }, [hydrated, isOnline, state.pending.length, syncing, syncNow]);

  const signOut = useCallback(() => {
    // Leave the account, but keep the conversation on this phone so the other role can read it.
    setState((s) => ({
      ...initial(),
      lang: s.lang,
      chats: s.chats,
      alerts: s.alerts,
      coughEvents: s.coughEvents,
      spotChecks: s.spotChecks,
      notes: s.notes,
      actions: s.actions,
      chwContactedAt: s.chwContactedAt,
      patientName: s.patientName,
      patientPhone: s.patientPhone,
      samples: s.samples,
    }));
  }, []);

  const deleteLocalData = useCallback(() => {
    setState((s) => ({ ...initial(), lang: s.lang }));
    AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);

  // The clock for the live analysis moves once a minute.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const deviceEvents = useMemo(() => state.coughEvents.filter((e) => e.src === 'device'), [state.coughEvents]);
  const conclusion = useMemo(() => analyse(deviceEvents, nowMs), [deviceEvents, nowMs]);
  const hasLive = deviceEvents.length > 0;

  const me = useMemo((): Patient => {
    const reason: Pick<Patient, 'reasonKey' | 'reasonDays'> = !hasLive
      ? {}
      : conclusion.kind === 'followup'
        ? conclusion.persistentDays >= 14
          ? { reasonKey: 'reason.persistent', reasonDays: conclusion.persistentDays }
          : { reasonKey: 'reason.week', reasonDays: WATCH_DAYS }
        : conclusion.kind === 'watch'
          ? { reasonKey: 'reason.higher', reasonDays: Math.min(3, conclusion.day) }
          : {};
    return {
      id: PATIENT_USER_ID,
      name: state.patientName || state.displayName || state.phone,
      phone: state.patientPhone || state.phone,
      age: 0,
      village: '',
      skin: '#A06B47',
      hair: '#241915',
      tone: '#D9ECD4',
      status: hasLive ? conclusion.status : 'normal',
      monitorDay: hasLive ? conclusion.day : 0,
      series: hasLive ? buildSeries(deviceEvents, nowMs) : EMPTY_SERIES,
      lastSyncMin: hasLive ? 0 : -1,
      deviceBattery: 100,
      ...reason,
    };
  }, [hasLive, conclusion, deviceEvents, nowMs, state.patientName, state.patientPhone, state.displayName, state.phone]);

  // People on this phone: the local record once the device has counted coughs, plus anyone who wrote in chat.
  const patients = useMemo(() => {
    const ids = new Set<string>([PATIENT_USER_ID]);
    for (const m of state.chats) {
      const patientId = m.thread.split(':')[0];
      if (patientId) ids.add(patientId);
    }
    return [...ids].map((id): Patient =>
      id === PATIENT_USER_ID
        ? me
        : {
            id,
            name: '',
            phone: '',
            age: 0,
            village: '',
            skin: '#6B4229',
            hair: '#1A120D',
            tone: '#F6E3B8',
            status: 'watch',
            monitorDay: 0,
            series: EMPTY_SERIES,
            lastSyncMin: -1,
            deviceBattery: 100,
            reasonKey: 'chat.alertReason',
          },
    );
  }, [hasLive, state.chats, me]);

  const value: Store = {
    ...state,
    hydrated,
    t,
    isOnline,
    syncing,
    justSynced,
    toast,
    patients,
    me,
    conclusion,
    addCoughEvents,
    clearCoughEvents,
    addSpotCough,
    sendChat,
    markChatSeen,
    removeCough,
    sendSample,
    enterDemo,
    update,
    addNote,
    toggleAction,
    markAlertSeen,
    syncNow,
    showToast,
    signOut,
    deleteLocalData,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}
