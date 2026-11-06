import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  Avatar, BarChart, Disclaimer, EmptyState, ErrorState, FadeIn, Glass, Header, LoadingState, Pill, Screen, SectionTitle, Txt, useScreenState,
} from '@/components/ui';
import { colors, Status, statusMeta } from '@/theme';
import { useStore } from '@/store';
import { dayShort, daysAgoDate, total } from '@/format';

export default function Trends() {
  const { t, patients, actions } = useStore();
  const { status, retry } = useScreenState();

  const week = Array.from({ length: 7 }, (_, i) => patients.reduce((sum, p) => sum + total(p.series[p.series.length - 7 + i]), 0));
  const labels = week.map((_, i) => dayShort(t, daysAgoDate(6 - i)));
  const needVisit = patients.filter((p) => p.status === 'followup' && !actions[p.id]?.visitedAt && !actions[p.id]?.receivedAt);
  const attention = patients.filter((p) => p.deviceBattery < 25 || p.lastSyncMin > 120);

  return (
    <Screen tabs>
      <Header title={t('trends.title')} subtitle={t('trends.subtitle')} />

      {status === 'loading' && <LoadingState blocks={[200, 130, 160]} />}
      {status === 'error' && <ErrorState onRetry={retry} />}
      {(status === 'empty' || (status === 'ready' && patients.length === 0)) && <EmptyState icon="trending-up" title={t('chw.emptyTitle')} text={t('chw.emptyText')} />}

      {status === 'ready' && patients.length > 0 && (
        <FadeIn>
          <Glass>
            <Txt v="h3" style={{ marginBottom: 10 }}>
              {t('trends.total')}
            </Txt>
            <BarChart values={week} labels={labels} height={110} a11y={`${t('trends.total')}: ${week.join(', ')}`} />
          </Glass>

          <SectionTitle>{t('trends.byStatus')}</SectionTitle>
          <Glass>
            <View style={{ gap: 14 }}>
              {(['followup', 'watch', 'normal'] as Status[]).map((s) => {
                const n = patients.filter((p) => p.status === s).length;
                const m = statusMeta[s];
                return (
                  <View key={s} accessible accessibilityLabel={`${t(m.labelKey)}: ${n}`} style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name={m.icon} size={20} color={m.text} />
                      <Txt v="bodyMedium" style={{ flex: 1 }}>
                        {t(m.labelKey)}
                      </Txt>
                      <Txt v="h3">{n}</Txt>
                    </View>
                    <View style={{ height: 12, borderRadius: 6, backgroundColor: 'rgba(14,59,69,0.15)', overflow: 'hidden' }}>
                      <View style={{ width: `${(n / patients.length) * 100}%`, height: '100%', backgroundColor: m.color, borderRadius: 6 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </Glass>

          <SectionTitle>{t('trends.needVisit')}</SectionTitle>
          {needVisit.length === 0 ? (
            <Glass>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Feather name="check-circle" size={26} color={colors.normalText} />
                <Txt v="body" style={{ flex: 1 }}>
                  {t('trends.allVisited')}
                </Txt>
              </View>
            </Glass>
          ) : (
            <View style={{ gap: 10 }}>
              {needVisit.map((p) => (
                <Glass key={p.id} padding={14} onPress={() => router.push({ pathname: '/patient/[id]', params: { id: p.id } })} label={p.name || t('role.patient')}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Avatar person={p} size={48} />
                    <View style={{ flex: 1 }}>
                      <Txt v="bodyMedium">{p.name || t('role.patient')}</Txt>
                      <Txt v="caption" color={colors.inkSoft}>
                        {p.reasonKey ? t(p.reasonKey, { n: p.reasonDays ?? 0 }) : ''}
                      </Txt>
                    </View>
                    <Feather name="chevron-right" size={22} color={colors.ink} />
                  </View>
                </Glass>
              ))}
            </View>
          )}

          <SectionTitle>{t('trends.devices')}</SectionTitle>
          <Glass>
            {attention.length === 0 ? (
              <Txt v="body">{t('trends.devicesOk')}</Txt>
            ) : (
              <View style={{ gap: 10 }}>
                {attention.map((p) => (
                  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <Txt v="bodyMedium" style={{ flex: 1, minWidth: 140 }}>
                      {p.name || t('role.patient')}
                    </Txt>
                    {p.deviceBattery > 0 && p.deviceBattery < 25 ? <Pill icon="battery" text={`${p.deviceBattery}%`} tone="white" /> : null}
                    {p.lastSyncMin > 120 ? <Pill icon="clock" text={`${Math.round(p.lastSyncMin / 60)} h`} tone="white" /> : null}
                  </View>
                ))}
              </View>
            )}
          </Glass>

          <View style={{ marginTop: 16 }}>
            <Disclaimer />
          </View>
        </FadeIn>
      )}
    </Screen>
  );
}
