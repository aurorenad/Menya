// Decision support built on the classifier output. Pure functions: no React, no Bluetooth.
//
//  readings (about 1 per second)  ->  EventDetector  ->  cough events (one per cough)
//  cough events over days         ->  analyse()      ->  conclusion (status + reasons + next step)
//
// IMPORTANT: this is SCREENING guidance, not a diagnosis. The numbers below are design defaults.
// Tune them with real data from the pilot (see README "Tuning the decision rules").
import { WATCH_DAYS, type DayCount } from '@/data/mock'; // WATCH_DAYS: days of watching before testing is suggested
import type { Reading } from '@/device/protocol';
import type { Status } from '@/theme';

// ---------- thresholds (all in one place) ----------
/** A reading counts as "a cough was heard" when TB% + non-TB% is at least this (so noise is below 40%). */
export const COUGH_MIN = 60;
/** A cough is "TB-like" when its TB score is at least this and higher than the other cough score. */
export const TB_MIN = 50;
/** Longest burst of readings that is treated as one cough. */
const MAX_BURST = 6;
/** Fewest coughs in the last 7 days before we say anything. */
export const MIN_EVENTS = 10;
/** Share of TB-like coughs that counts as "some" and "a lot". */
export const TB_SOME = 0.25;
export const TB_HIGH = 0.5;

export type CoughEvent = {
  at: number;
  kind: 'tb' | 'other';
  /** How sure the model was, 0 to 100. */
  conf: number;
  /** Real classifier scores from the device, 0 to 100. */
  tb?: number;
  other?: number;
  noise?: number;
  /** 'device' = real Arduino. 'sim' = demo data. */
  src: 'device' | 'sim';
};

export type FrameKind = 'quiet' | 'tb' | 'other';

/** What a single reading means. Used for the "what the device hears now" line. */
export function frameKind(r: Reading): FrameKind {
  if (r.tb + r.nonTb < COUGH_MIN) return 'quiet';
  return r.tb >= TB_MIN && r.tb >= r.nonTb ? 'tb' : 'other';
}

/** Groups consecutive "cough" readings into one cough event. */
export class EventDetector {
  private burst: Reading[] = [];

  push(r: Reading, src: CoughEvent['src']): CoughEvent | null {
    if (r.tb + r.nonTb >= COUGH_MIN) {
      this.burst.push(r);
      return this.burst.length >= MAX_BURST ? this.flush(src) : null;
    }
    return this.flush(src);
  }

  flush(src: CoughEvent['src']): CoughEvent | null {
    if (this.burst.length === 0) return null;
    const b = this.burst;
    this.burst = [];
    const n = b.length;
    const tb = Math.round(b.reduce((s, x) => s + x.tb, 0) / n);
    const other = Math.round(b.reduce((s, x) => s + x.nonTb, 0) / n);
    const noise = Math.round(b.reduce((s, x) => s + x.noise, 0) / n);
    const isTb = tb >= TB_MIN && tb >= other;
    return { at: b[0].at, kind: isTb ? 'tb' : 'other', conf: isTb ? tb : other, tb, other, noise, src };
  }
}

// ---------- conclusion ----------
export type Reason = { key: string; p?: Record<string, string | number> };
export type Confidence = 'low' | 'medium' | 'high';
export type ConclusionKind = 'collecting' | 'normal' | 'watch' | 'followup';

export type Conclusion = {
  kind: ConclusionKind;
  status: Status;
  /** Day of watching, starting at 1 on the first cough. */
  day: number;
  today: { total: number; tb: number; other: number; night: number };
  week: { total: number; tb: number; tbShare: number };
  rising: boolean;
  persistentDays: number;
  confidence: Confidence;
  reasons: Reason[];
};

const DAY = 86400000;
const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const daysAgo = (at: number, now: number) => Math.round((startOfDay(now) - startOfDay(at)) / DAY);
const isNight = (at: number) => {
  const h = new Date(at).getHours();
  return h >= 20 || h < 6;
};

export function analyse(events: CoughEvent[], now: number): Conclusion {
  const perDay = new Array<number>(14).fill(0);
  const today = { total: 0, tb: 0, other: 0, night: 0 };
  let weekTotal = 0;
  let weekTb = 0;
  let weekNight = 0;
  let first = now;

  for (const e of events) {
    first = Math.min(first, e.at);
    const d = daysAgo(e.at, now);
    if (d < 0 || d >= 14) continue;
    perDay[d] += 1;
    if (d === 0) {
      today.total += 1;
      if (e.kind === 'tb') today.tb += 1;
      else today.other += 1;
      if (isNight(e.at)) today.night += 1;
    }
    if (d < 7) {
      weekTotal += 1;
      if (e.kind === 'tb') weekTb += 1;
      if (isNight(e.at)) weekNight += 1;
    }
  }

  const day = events.length ? Math.max(1, daysAgo(first, now) + 1) : 0;
  const tbShare = weekTotal ? weekTb / weekTotal : 0;
  const pct = Math.round(tbShare * 100);

  // Rising: the last 3 days (including today, which is only partly done) against the 4 days before.
  const recent = (perDay[0] + perDay[1] + perDay[2]) / 3;
  const prevSum = perDay[3] + perDay[4] + perDay[5] + perDay[6];
  const prev = prevSum / 4;
  const rising = prevSum > 0 && recent >= prev * 1.25 && recent - prev >= 2;

  // Persistent: days in a row with at least 3 coughs.
  let persistentDays = 0;
  for (let i = perDay[0] >= 3 ? 0 : 1; i < 14 && perDay[i] >= 3; i++) persistentDays += 1;

  const avgPerDay = weekTotal / Math.max(1, Math.min(day, 7));
  const confidence: Confidence = weekTotal >= 40 && day >= WATCH_DAYS ? 'high' : weekTotal >= 15 ? 'medium' : 'low';
  const base = { day, today, week: { total: weekTotal, tb: weekTb, tbShare }, rising, persistentDays, confidence };

  // Not enough to say anything yet.
  if (weekTotal < MIN_EVENTS) {
    const reasons: Reason[] = [{ key: 'live.why.few', p: { n: weekTotal, min: MIN_EVENTS } }];
    if (day > 0 && day < WATCH_DAYS) reasons.push({ key: 'live.why.day', p: { d: day, n: WATCH_DAYS } });
    return { ...base, kind: 'collecting', status: 'normal', reasons };
  }

  const strongTb = tbShare >= TB_HIGH;
  const someTb = tbShare >= TB_SOME;

  const reasons: Reason[] = [
    strongTb
      ? { key: 'live.why.tbHigh', p: { pct } }
      : someTb
        ? { key: 'live.why.tbSome', p: { pct } }
        : { key: 'live.why.tbLow', p: { pct } },
    rising ? { key: 'live.why.rising' } : { key: 'live.why.steady' },
  ];
  if (persistentDays >= 3) reasons.push({ key: 'live.why.persistent', p: { d: persistentDays } });
  if (weekTotal > 0 && weekNight / weekTotal >= 0.4) reasons.push({ key: 'live.why.night' });

  // The first week is only about watching. Testing is suggested after it, never before.
  if (day < WATCH_DAYS) {
    reasons.push({ key: 'live.why.day', p: { d: day, n: WATCH_DAYS } });
    return { ...base, kind: rising || someTb ? 'watch' : 'normal', status: rising || someTb ? 'watch' : 'normal', reasons };
  }

  const followup = (rising && someTb) || (strongTb && avgPerDay >= 5) || (persistentDays >= 14 && avgPerDay >= 3);
  if (followup) return { ...base, kind: 'followup', status: 'followup', reasons };
  if (rising || someTb) return { ...base, kind: 'watch', status: 'watch', reasons };
  return { ...base, kind: 'normal', status: 'normal', reasons };
}

/** 30 days of day/night counts, last entry = today. Same shape the charts already use. */
export function buildSeries(events: CoughEvent[], now: number): DayCount[] {
  const out: DayCount[] = Array.from({ length: 30 }, () => ({ day: 0, night: 0 }));
  for (const e of events) {
    const d = daysAgo(e.at, now);
    if (d < 0 || d > 29) continue;
    const slot = out[29 - d];
    if (isNight(e.at)) slot.night += 1;
    else slot.day += 1;
  }
  return out;
}
