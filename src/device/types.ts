import type { Reading } from './protocol';

export type FoundDevice = { id: string; name: string };
export type LinkError = 'bluetooth_off' | 'permission' | 'failed' | 'cancelled';
export type InjectKind = 'tb' | 'other' | 'quiet';

export type Connection = {
  disconnect: () => void;
  /** Optional. A real radio does not use this. */
  inject?: (kind: InjectKind) => void;
};

export interface DeviceLink {
  /** true when this build can talk to a real Bluetooth radio. */
  readonly isReal: boolean;
  /** Starts a scan. Returns a function that stops it. */
  scan(onFound: (d: FoundDevice) => void, onError: (e: LinkError) => void): () => void;
  /** Connects and starts the reading stream. Rejects with a LinkError. */
  connect(id: string, h: { onReading: (r: Reading) => void; onDisconnect: () => void }): Promise<Connection>;
}
