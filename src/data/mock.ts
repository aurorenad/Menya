// Shared types and the signed-in health-worker account.
// Cough counts, alerts, and chats come from this phone, not from sample people.
import type { Status } from '@/theme';

export type Skin = '#8D5A3C' | '#6B4229' | '#A06B47' | '#5A3825' | '#B9825C';
export type Person = {
  id: string;
  name: string;
  phone: string;
  skin: string;
  hair: string;
  tone: string; // background tint of avatar
};

export type DayCount = { day: number; night: number };

export type Patient = Person & {
  age: number;
  village: string;
  status: Status;
  reasonKey?: string;
  reasonDays?: number;
  lastSyncMin: number;
  monitorDay: number; // days since the first cough the device counted
  series: DayCount[]; // 30 entries, last one is "today"
  deviceBattery: number;
};

/** Demo patient. Signing in with this number opens Christian's record. */
export const DEMO_PATIENT_NAME = 'Christian';
export const DEMO_PATIENT_PHONE = '+250781940884';

/** Demo community health worker. The only health worker in this demo. */
export const CHW_USER: Person & { area: string } = {
  id: 'temana',
  name: 'Temana',
  phone: '',
  skin: '#6B4229',
  hair: '#1B1B1B',
  tone: '#CFE8EE',
  area: '',
};

/** The person using this phone. Their cough record is built from the device. */
export const PATIENT_USER_ID = 'me';

export type ChatMessage = {
  id: string;
  /** `${patientId}:${chwId}` so both people open the same conversation. */
  thread: string;
  from: 'patient' | 'chw';
  text: string;
  at: number;
  seen: boolean;
};

export type AlertItem = {
  id: string;
  patientId: string;
  minutesAgo: number;
  reasonKey: string;
  reasonDays?: number;
  isNew: boolean;
  smsSent: boolean;
};

export const RISK: Record<Status, number> = { followup: 3, watch: 2, normal: 1 };

export function todayTotal(p: Patient) {
  const t = p.series[p.series.length - 1];
  return t.day + t.night;
}

export function riskScore(p: Patient) {
  return RISK[p.status] * 1000 + todayTotal(p);
}

export function sortedByRisk(list: Patient[]) {
  return [...list].sort((a, b) => riskScore(b) - riskScore(a));
}

export function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

/** A person is watched for at least this many days before Menya suggests testing. */
export const WATCH_DAYS = 7;

export type Chw = Person & {
  sector: string;
  village: string;
  distanceKm: number;
  days: number[]; // 0 = Sunday
  hours: string;
};

/** Health workers a patient can message. This demo has Temana only. */
export const CHW_DIRECTORY: Chw[] = [
  { ...CHW_USER, sector: '', village: '', distanceKm: 0, days: [], hours: '' },
];

export function chwsInSector(sector: string) {
  return CHW_DIRECTORY.filter((c) => c.sector === sector).sort((a, b) => a.distanceKm - b.distanceKm);
}
