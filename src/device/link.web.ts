// Browser Bluetooth for the web preview (Chrome and Edge on http://localhost).
// The Arduino Nano 33 BLE Sense runs the trained model and notifies this page.
// Each notification is 3 bytes: TB %, noise %, non-TB %.
// A browser without Web Bluetooth reports that Bluetooth is unavailable.
import { DEVICE_NAME, RESULT_UUID, SERVICE_UUID, parseReading } from './protocol';
import { simulatedLink } from './simulated';
import type { DeviceLink, LinkError } from './types';

type BleChar = EventTarget & {
  value: DataView | null;
  startNotifications: () => Promise<BleChar>;
};

type BleServer = {
  getPrimaryService: (uuid: string) => Promise<{ getCharacteristic: (uuid: string) => Promise<BleChar> }>;
};

type BleDevice = EventTarget & {
  id: string;
  name?: string;
  gatt?: { connect: () => Promise<BleServer>; disconnect: () => void; connected: boolean };
};

type BluetoothApi = {
  requestDevice: (options: {
    filters: Array<{ name?: string; services?: string[] }>;
    optionalServices?: string[];
  }) => Promise<BleDevice>;
  getDevices?: () => Promise<BleDevice[]>;
};

function bluetoothApi(): BluetoothApi | null {
  if (typeof navigator === 'undefined') return null;
  const api = (navigator as Navigator & { bluetooth?: BluetoothApi }).bluetooth;
  return api ?? null;
}

const picked = new Map<string, BleDevice>();

function remember(device: BleDevice) {
  picked.set(device.id, device);
  return device;
}

async function resolveDevice(id: string): Promise<BleDevice | null> {
  const known = picked.get(id);
  if (known) return known;
  const api = bluetoothApi();
  if (!api?.getDevices) return null;
  const all = await api.getDevices();
  const found = all.find((d) => d.id === id);
  return found ? remember(found) : null;
}

function mapRequestError(err: unknown): LinkError {
  const message = err instanceof Error ? err.message : '';
  if (/adapter|turned off|disabled|not available/i.test(message)) return 'bluetooth_off';
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotFoundError') return 'cancelled';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'permission';
  return 'failed';
}

function emit(view: DataView | null, onReading: (r: NonNullable<ReturnType<typeof parseReading>>) => void) {
  if (!view || view.byteLength < 3) return;
  const reading = parseReading([view.getUint8(0), view.getUint8(1), view.getUint8(2)], Date.now());
  if (reading) onReading(reading);
}

export const link: DeviceLink = {
  get isReal() {
    return bluetoothApi() !== null;
  },

  scan(onFound, onError) {
    const api = bluetoothApi();
    if (!api) return simulatedLink.scan(onFound, onError);

    let stopped = false;
    // requestDevice must run inside the button click, so it is called with no await above it.
    api
      .requestDevice({
        filters: [{ services: [SERVICE_UUID] }, { name: DEVICE_NAME }],
        optionalServices: [SERVICE_UUID],
      })
      .then((device) => {
        if (stopped) return;
        remember(device);
        onFound({ id: device.id, name: device.name || DEVICE_NAME });
      })
      .catch((err) => {
        if (!stopped) onError(mapRequestError(err));
      });

    return () => {
      stopped = true;
    };
  },

  async connect(id, h) {
    const api = bluetoothApi();
    if (!api) return simulatedLink.connect(id, h);

    const device = await resolveDevice(id);
    if (!device?.gatt) {
      const missing: LinkError = 'failed';
      throw missing;
    }

    try {
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(RESULT_UUID);
      const onValue = () => emit(characteristic.value, h.onReading);
      const onDrop = () => h.onDisconnect();
      characteristic.addEventListener('characteristicvaluechanged', onValue);
      device.addEventListener('gattserverdisconnected', onDrop);
      await characteristic.startNotifications();
      emit(characteristic.value, h.onReading);

      return {
        disconnect: () => {
          characteristic.removeEventListener('characteristicvaluechanged', onValue);
          device.removeEventListener('gattserverdisconnected', onDrop);
          if (device.gatt?.connected) device.gatt.disconnect();
        },
      };
    } catch (err) {
      if (device.gatt?.connected) device.gatt.disconnect();
      throw mapRequestError(err);
    }
  },
};
