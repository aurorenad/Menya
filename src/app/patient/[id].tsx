import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  Avatar, Button, CircleButton, Disclaimer, ErrorState, FadeIn, Field, Glass, Header, LoadingState, Pill, Screen, SectionTitle,
  StatusChip, TrendChart, Txt, useScreenState,
} from '@/components/ui';
import { colors } from '@/theme';
import { useStore } from '@/store';
import { useOpen } from '@/hooks';
import { WATCH_DAYS } from '@/data/mock';
import { agoFrom, dateLabel, daysAgoDate, total } from '@/format';

export default function PatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, patients, notes, actions, addNote, toggleAction, isOnline, showToast, samples } = useStore();
  const open = useOpen();
  const { status, retry } = useScreenState();
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const p = patients.find((x) => x.id === id);
  if (!p) {
    return (
      <Screen>
        <Header title={t('patient.notFound')} back />
        <Txt>{t('error.text')}</Txt>
      </Screen>
    );
  }
  const phone = p.phone.replace(/\s/g, '');
  const totals = p.series.map(total);
  const last14 = totals.slice(-14);
  const usual = Math.round(totals.slice(0, 20).reduce((a, b) => a + b, 0) / 20);
  const today = totals[totals.length - 1];
  const avg7 = Math.round(totals.slice(-7).reduce((a, b) => a + b, 0) / 7);
  const week = p.series.slice(-7);
  const nightPct = Math.round((week.reduce((a, d) => a + d.night, 0) / Math.max(1, week.reduce((a, d) => a + d.day + d.night, 0))) * 100);
  const act = actions[p.id] ?? {};
  const started = p.monitorDay > 0;
  const inWatchWeek = started && p.monitorDay < WATCH_DAYS;
  const displayName = p.name || t('role.patient');
  const place = [p.age ? String(p.age) : '', p.village].filter(Boolean).join(' · ');
  const myNotes = notes[p.id] ?? [];

  const save = () => {
    const text = draft.trim();
    if (!text) {
      setErr(t('patient.noteEmpty'));
      return;
    }
    addNote(p.id, text);
    setDraft('');
    setErr(null);
    showToast(isOnline ? t('patient.noteSaved') : t('patient.noteSavedOffline'));
  };

  const toggle = (key: 'visitedAt' | 'referredAt' | 'receivedAt') => {
    toggleAction(p.id, key);
    if (!act[key]) showToast(isOnline ? t('patient.actionSaved') : t('patient.noteSavedOffline'));
  };

  return (
    <Screen>
      <Header title={displayName} subtitle={place || undefined} back />

      {status === 'loading' && <LoadingState blocks={[110, 220, 100, 160]} />}
      {status === 'error' && <ErrorState onRetry={retry} />}

      {(status === 'ready' || status === 'empty') && (
        <>
          <FadeIn>
            <Glass strong>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Avatar person={p} size={76} ring />
                <View style={{ flex: 1, gap: 8 }}>
                  <StatusChip status={p.status} large />
                  {p.reasonKey && p.status !== 'normal' ? <Pill icon="alert-circle" text={t(p.reasonKey, { n: p.reasonDays ?? 0 })} tone="white" /> : null}
                  {started ? <Pill icon="calendar" text={inWatchWeek ? t('follow.weekDay', { d: p.monitorDay, n: WATCH_DAYS }) : t('follow.weekDone')} /> : null}
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 }}>
                {phone ? <CircleButton icon="phone-call" label={`${t('follow.call')} ${displayName}`} caption={t('follow.call')} dark onPress={() => open(`tel:${phone}`)} /> : null}
                <CircleButton
                  icon="message-circle"
                  label={`${t('follow.sms')} ${displayName}`}
                  caption={t('follow.sms')}
                  onPress={() => router.push({ pathname: '/chat/[id]', params: { id: p.id } })}
                />
              </View>
            </Glass>
          </FadeIn>

          {(samples ?? []).some((s) => s.patientId === p.id) ? (
            <>
              <SectionTitle>{t('sample.received')}</SectionTitle>
              <FadeIn>
                <Glass>
                  {(samples ?? [])
                    .filter((s) => s.patientId === p.id)
                    .slice(-3)
                    .reverse()
                    .map((s) => (
                      <View key={s.id} style={{ marginBottom: 8 }}>
                        <Txt v="bodyMedium">{t('sample.scores', { tb: s.tb, other: s.other, noise: s.noise })}</Txt>
                        <Txt v="caption" color={colors.inkSoft}>
                          {agoFrom(t, s.at)}
                        </Txt>
                      </View>
                    ))}
                </Glass>
              </FadeIn>
            </>
          ) : null}

          <SectionTitle>{t('patient.trend')}</SectionTitle>
          <FadeIn delay={80}>
            <Glass padding={14}>
              {status === 'empty' ? (
                <Txt v="body" color={colors.inkSoft}>
                  {t('history.emptyText')}
                </Txt>
              ) : (
                <TrendChart
                  values={last14}
                  usual={usual}
                  usualLabel={t('patient.usual')}
                  startLabel={dateLabel(t, daysAgoDate(13))}
                  endLabel={t('home.today')}
                />
              )}
            </Glass>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              {[
                { icon: 'activity' as const, v: String(today), l: t('home.today') },
                { icon: 'bar-chart-2' as const, v: String(avg7), l: t('patient.avg7') },
                { icon: 'moon' as const, v: `${nightPct}%`, l: t('history.night') },
              ].map((s) => (
                <Glass key={s.l} style={{ flex: 1 }} padding={12}>
                  <View accessible accessibilityLabel={`${s.l}: ${s.v}`} style={{ alignItems: 'center' }}>
                    <Feather name={s.icon} size={20} color={colors.teal} />
                    <Txt v="h2">{s.v}</Txt>
                    <Txt v="caption" color={colors.inkSoft} style={{ textAlign: 'center', fontSize: 13 }}>
                      {s.l}
                    </Txt>
                  </View>
                </Glass>
              ))}
            </View>
            <View style={{ marginTop: 12 }}>
              <Disclaimer />
            </View>
          </FadeIn>

          <SectionTitle>{t('patient.actions')}</SectionTitle>
          {inWatchWeek ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.watchBg, borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1.5, borderColor: colors.watch }}>
              <Feather name="calendar" size={20} color={colors.watchText} />
              <Txt v="caption" color={colors.watchText} style={{ flex: 1 }}>
                {t('patient.weekHint')}
              </Txt>
            </View>
          ) : null}
          <View style={{ gap: 12 }}>
            {(
              [
                { key: 'visitedAt' as const, icon: 'home' as const, label: t('patient.markVisited'), done: t('patient.visited') },
                { key: 'referredAt' as const, icon: 'clipboard' as const, label: t('patient.markReferred'), done: t('patient.referred') },
                { key: 'receivedAt' as const, icon: 'inbox' as const, label: t('patient.markReceived'), done: t('patient.received') },
              ] as const
            ).map((a) => {
              const at = act[a.key];
              return (
                <View key={a.key}>
                  <Button
                    title={at ? `${a.done} ✓` : a.label}
                    icon={at ? 'check-circle' : a.icon}
                    variant={at ? 'light' : 'primary'}
                    onPress={() => toggle(a.key)}
                    hint={at ? t('patient.undoHint') : undefined}
                  />
                  {at ? (
                    <Txt v="caption" color={colors.inkSoft} style={{ textAlign: 'center', marginTop: 4 }}>
                      {agoFrom(t, at)} · {isOnline ? t('patient.sent') : t('patient.waitingSync')} · {t('patient.tapUndo')}
                    </Txt>
                  ) : null}
                </View>
              );
            })}
          </View>

          <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 10 }}>
            {t('patient.bringNote')}
          </Txt>

          <SectionTitle>{t('patient.notes')}</SectionTitle>
          <Glass>
            <Field
              label={t('patient.addNote')}
              placeholder={t('patient.notePlaceholder')}
              value={draft}
              onChangeText={(v) => {
                setDraft(v);
                setErr(null);
              }}
              multiline
              error={err}
              style={{ minHeight: 64, textAlignVertical: 'top' }}
            />
            <Button title={t('patient.saveNote')} icon="save" onPress={save} style={{ marginTop: 14 }} />
          </Glass>

          {myNotes.length === 0 ? (
            <Txt v="body" color={colors.inkSoft} style={{ marginTop: 12, textAlign: 'center' }}>
              {t('patient.noNotes')}
            </Txt>
          ) : (
            <View style={{ gap: 10, marginTop: 12 }}>
              {myNotes.map((n) => (
                <Glass key={n.id} padding={14}>
                  <Txt v="body">{n.text}</Txt>
                  <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 4 }}>
                    {agoFrom(t, n.at)}
                  </Txt>
                </Glass>
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
