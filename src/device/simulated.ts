// Used only when this build has no Bluetooth radio (Expo Go, or a browser without Web Bluetooth).
// It does not invent a device or cough readings.
import type { DeviceLink } from './types';

export const simulatedLink: DeviceLink = {
  isReal: false,
  scan(_onFound, onError) {
    onError('failed');
    return () => {};
  },
  async connect() {
    throw 'failed';
  },
};
