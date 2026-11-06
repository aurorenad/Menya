// One cough check listens for up to one minute. The person can stop it sooner.
//
// The model on the Menya device scores every moment as noise, Not-Normal cough,
// or other cough. After the recording stops, noise moments are shown and thrown
// away. Only cough scores stay on the phone. There is no sound file at any step.
//
// The next-step page is screening guidance, not a diagnosis.
import type { Reading } from '@/device/protocol';

/** A recording stops itself after this long. */
export const RECORD_MS = 60_000;
/** A moment is a cough when TB% + other-cough% is at least this, so noise is under 40%. */
const COUGH_MIN = 60;

export type CoughType = 'dry' | 'wet' | 'productive' | 'barking' | 'uncertain';
export type StopReason = 'user' | 'minute';
export type SpotKind = 'usual' | 'watch' | 'talk';
export type NextKind = SpotKind | 'again';

/** Percentages that add up to 100. Used on screen for the part we do not save. */
export type Mix = { noise: number; tb: number; other: number };

/** What stays on the phone: the device's own percentages for that cough. */
export type SavedCough = {
  at: number;
  type: CoughType;
  tb: number;
  other: number;
  noise: number;
};

/** The recording after noise moments have been removed. */
export type FilteredRecording = {
  reason: StopReason;
  /** Mix of the moments that were not a cough. Show it, then drop it. */
  noiseMix: Mix;
  /** Share of the recording that was noise, 0 to 100. Not stored. */
  noiseShare: number;
  coughs: SavedCough[];
};

export type SpotConclusion = {
  kind: NextKind;
  type: CoughType;
  tb: number;
  other: number;
};

const isCough = (r: Reading) => r.tb + r.nonTb >= COUGH_MIN;

function roundMix(rows: Reading[]): Mix {
  if (rows.length === 0) return { noise: 100, tb: 0, other: 0 };
  const n = rows.length;
  const tb = Math.round(rows.reduce((s, r) => s + r.tb, 0) / n);
  const other = Math.round(rows.reduce((s, r) => s + r.nonTb, 0) / n);
  const noise = Math.max(0, Math.min(100, 100 - tb - other));
  return { noise, tb, other };
}

/** Mean of the scores the device actually sent for these moments. */
function meanScores(rows: Reading[]): { tb: number; other: number; noise: number } {
  const n = rows.length;
  if (n === 0) return { tb: 0, other: 0, noise: 100 };
  return {
    tb: Math.round(rows.reduce((s, r) => s + r.tb, 0) / n),
    other: Math.round(rows.reduce((s, r) => s + r.nonTb, 0) / n),
    noise: Math.round(rows.reduce((s, r) => s + r.noise, 0) / n),
  };
}

export function coughType(tb: number, other: number): CoughType {
  if (tb >= 50 && tb >= other) return 'uncertain';
  if (other >= 75) return 'dry';
  if (other >= 60) return 'wet';
  if (other >= 48) return 'productive';
  return 'barking';
}

/** Groups the minute into coughs and drops the noise between them. */
export function filterRecording(windows: Reading[], reason: StopReason): FilteredRecording {
  const coughs: SavedCough[] = [];
  let burst: Reading[] = [];
  const closeBurst = () => {
    if (burst.length === 0) return;
    const kept = meanScores(burst);
    coughs.push({ at: burst[0].at, type: coughType(kept.tb, kept.other), tb: kept.tb, other: kept.other, noise: kept.noise });
    burst = [];
  };
  for (const row of windows) {
    if (isCough(row)) burst.push(row);
    else closeBurst();
  }
  closeBurst();

  const noiseRows = windows.filter((r) => !isCough(r));
  const noiseShare = windows.length ? Math.round((noiseRows.length / windows.length) * 100) : 100;
  return { reason, noiseMix: roundMix(noiseRows), noiseShare, coughs };
}

/** Collects every sample until the person stops, or the minute ends. */
export class MinuteRecorder {
  private windows: Reading[] = [];

  push(r: Reading) {
    this.windows.push(r);
  }

  finish(reason: StopReason): FilteredRecording {
    return filterRecording(this.windows, reason);
  }
}

export function concludeSpot(coughs: SavedCough[]): SpotConclusion {
  if (coughs.length === 0) return { kind: 'again', type: 'uncertain', tb: 0, other: 0 };
  const tb = Math.round(coughs.reduce((s, c) => s + c.tb, 0) / coughs.length);
  const other = 100 - tb;
  const counts = new Map<CoughType, number>();
  for (const c of coughs) counts.set(c.type, (counts.get(c.type) ?? 0) + 1);
  const type = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const tbLike = coughs.filter((c) => c.tb >= 50 && c.tb >= c.other).length;
  const mixed = counts.size > 1;
  const kind: SpotKind = tbLike >= 2 ? 'talk' : tbLike === 1 || mixed ? 'watch' : 'usual';
  return { kind, type, tb, other };
}
