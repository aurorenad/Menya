import type { TFunc } from '@/i18n';

export function timeAgo(t: TFunc, minutes: number): string {
  if (minutes < 1) return t('time.now');
  if (minutes < 60) return t('time.min', { n: Math.round(minutes) });
  const h = Math.round(minutes / 60);
  if (h < 24) return t('time.hour', { n: h });
  return t('time.day', { n: Math.round(h / 24) });
}

export function agoFrom(t: TFunc, ms: number) {
  return timeAgo(t, (Date.now() - ms) / 60000);
}

export function dayShort(t: TFunc, d: Date) {
  return t(`day.${d.getDay()}`);
}

export function dateLabel(t: TFunc, d: Date) {
  return `${d.getDate()} ${t(`month.${d.getMonth()}`)}`;
}

export function timeLabel(d: Date) {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function daysAgoDate(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export const total = (d: { day: number; night: number }) => d.day + d.night;

/** [1,2,3,4,5,6] -> "Mon?Sat"; [2,4,6] -> "Tue, Thu, Sat" */
export function daysLabel(t: TFunc, days: number[]) {
  const names = days.map((d) => t(`day.${d}`));
  const consecutive = days.length > 2 && days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  return consecutive ? `${names[0]}\u2013${names[names.length - 1]}` : names.join(', ');
}
