// Bluetooth contract with the Arduino Nano 33 BLE Sense firmware (HEALTH-Test / Edge Impulse).
// These values MUST match the sketch:
//   BLEService coughService("19B10000-E8F2-537E-4F6C-D104768A1214");
//   BLECharacteristic resultChar("19B10001-...", BLERead | BLENotify, 3);
//   data[0] = TB %, data[1] = noise %, data[2] = non-TB %   (order of the Edge Impulse labels)

export const DEVICE_NAME = 'CoughCounter';
export const SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1214';
export const RESULT_UUID = '19b10001-e8f2-537e-4f6c-d104768a1214';

/** One classifier result from the device (about one per second). Values are percentages, 0 to 100. */
export type Reading = { at: number; tb: number; noise: number; nonTb: number };

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** react-native-ble-plx gives characteristic values as base64. */
export function base64ToBytes(b64: string): number[] {
  const out: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const ch of b64) {
    const v = B64.indexOf(ch);
    if (v < 0) continue; // skips "=" padding
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buf >> bits) & 0xff);
      buf &= (1 << bits) - 1;
    }
  }
  return out;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Turns the 3 notification bytes into a Reading. Returns null for a malformed packet. */
export function parseReading(bytes: number[], at: number): Reading | null {
  if (bytes.length < 3) return null;
  return { at, tb: clamp(bytes[0]), noise: clamp(bytes[1]), nonTb: clamp(bytes[2]) };
}
