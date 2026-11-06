// Real Bluetooth for iOS and Android, using react-native-ble-plx.
// Expo Go does not include this native module. Without it, scanning reports that Bluetooth is unavailable.
// A development build uses the real radio.
import { PermissionsAndroid, Platform } from 'react-native';
import type { BleManager } from 'react-native-ble-plx';
import { RESULT_UUID, SERVICE_UUID, base64ToBytes, parseReading } from './protocol';
import { simulatedLink } from './simulated';
import type { DeviceLink, LinkError } from './types';

let manager: BleManager | null | undefined;
function getManager(): BleManager | null {
  if (manager !== undefined) return manager;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { BleManager: Ble } = require('react-native-ble-plx') as typeof import('react-native-ble-plx');
    manager = new Ble();
  } catch {
    manager = null; // native module missing (Expo Go)
  }
  return manager;
}

async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const P = PermissionsAndroid.PERMISSIONS;
  if (Number(Platform.Version) >= 31) {
    const r = await PermissionsAndroid.requestMultiple([P.BLUETOOTH_SCAN, P.BLUETOOTH_CONNECT]);
    return Object.values(r).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
  }
  return (await PermissionsAndroid.request(P.ACCESS_FINE_LOCATION)) === PermissionsAndroid.RESULTS.GRANTED;
}

/** Resolves true when Bluetooth is on, false if it is off, blocked or missing. */
function bluetoothOn(m: BleManager): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: boolean) => {
      if (done) return;
      done = true;
      sub.remove();
      clearTimeout(timer);
      resolve(v);
    };
    const sub = m.onStateChange((s) => {
      if (s === 'PoweredOn') finish(true);
      else if (s === 'PoweredOff' || s === 'Unauthorized' || s === 'Unsupported') finish(false);
    }, true);
    const timer = setTimeout(() => finish(false), 6000);
  });
}

export const link: DeviceLink = {
  get isReal() {
    return getManager() !== null;
  },

  scan(onFound, onError) {
    const m = getManager();
    if (!m) return simulatedLink.scan(onFound, onError);
    let stopped = false;
    (async () => {
      if (!(await ensurePermissions())) return !stopped && onError('permission');
      if (!(await bluetoothOn(m))) return !stopped && onError('bluetooth_off');
      if (stopped) return;
      m.startDeviceScan([SERVICE_UUID], null, (err, dev) => {
        if (stopped) return;
        if (err) return onError('failed');
        if (dev) onFound({ id: dev.id, name: dev.localName ?? dev.name ?? 'CoughCounter' });
      });
    })().catch(() => !stopped && onError('failed'));
    return () => {
      stopped = true;
      m.stopDeviceScan().catch(() => {});
    };
  },

  async connect(id, h) {
    const m = getManager();
    if (!m) return simulatedLink.connect(id, h);
    try {
      m.stopDeviceScan().catch(() => {});
      const dev = await m.connectToDevice(id, { timeout: 12000 });
      await dev.discoverAllServicesAndCharacteristics();
      const notifications = dev.monitorCharacteristicForService(SERVICE_UUID, RESULT_UUID, (err, ch) => {
        if (err || !ch?.value) return; // a dropped link is reported by onDeviceDisconnected below
        const reading = parseReading(base64ToBytes(ch.value), Date.now());
        if (reading) h.onReading(reading);
      });
      const dropped = m.onDeviceDisconnected(id, () => h.onDisconnect());
      return {
        disconnect: () => {
          notifications.remove();
          dropped.remove();
          m.cancelDeviceConnection(id).catch(() => {});
        },
      };
    } catch {
      const e: LinkError = 'failed';
      throw e;
    }
  },
};
