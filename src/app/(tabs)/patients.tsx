import { View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  Avatar, EmptyState, ErrorState, FadeIn, Glass, Header, LangToggle, LoadingState, Pill, Screen, StatusChip, Txt, useScreenState,
} from '@/components/ui';
import { colors, Status, statusMeta } from '@/theme';
import { useStore } from '@/store';
import { sortedByRisk, WATCH_DAYS } from '@/data/mock';
import { timeAgo, total } from '@/format';

export default function Patients() {
  const { t, patients, actions } = useStore();
  const { status, retry } = useScreenState();
  const list = sortedByRisk(patients);
  const counts = (['followup', 'watch', 'normal'] as Status[]).map((s) => ({ s, n: patients.filter((p) => p.status === s).length }));

  return (
    <Screen tabs>
      <Header title={t('chw.title')} subtitle={t('chw.subtitle')} right={<LangToggle />} />

      {status === 'loading' && <LoadingState blocks={[90, 120, 120, 120]} />}
      {status === 'error' && <ErrorState onRetry={retry} />}
      {(status === 'empty' || (status === 'ready' && list.length === 0)) && <EmptyState icon="users" title={t('chw.emptyTitle')} text={t('chw.emptyText')} />}

      {status === 'ready' && list.length > 0 && (
        <>
          <FadeIn>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {counts.map(({ s, n }) => {
                const m = statusMeta[s];
                return (
                  <Glass key={s} style={{ flex: 1 }} padding={12}>
                    <View accessible accessibilityLabel={`${n} ${t(m.labelKey)}`} style={{ alignItems: 'center', gap: 2 }}>
                      <Feather name={m.icon} size={22} color={m.text} />
                      <Txt v="h1">{n}</Txt>
                      <Txt v="caption" style={{ textAlign: 'center', fontSize: 13, lineHeight: 17 }} color={colors.inkSoft}>
                        {t(m.labelKey)}
                      </Txt>
                    </View>
                  </Glass>
                );
              })}
            </View>
          </FadeIn>

          <View style={{ gap: 12, marginTop: 16 }}>
            {list.map((p, i) => {
              const today = total(p.series[p.series.length - 1]);
              const prevAvg = Math.round(p.series.slice(-8, -1).map(total).reduce((a, b) => a + b, 0) / 7);
              const up = today > prevAvg * 1.15;
              const down = today < prevAvg * 0.85;
              const act = actions[p.id];
              return (
                <FadeIn key={p.id} delay={Math.min(i, 6) * 70}>
                  <Glass
                    onPress={() => router.push({ pathname: '/patient/[id]', params: { id: p.id } })}
                    label={`${p.name || t('role.patient')}. ${t(statusMeta[p.status].labelKey)}. ${today} ${t('history.coughs')}`}
                    padding={16}
                  >
                    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                      <Avatar person={p} size={60} ring />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Txt v="h3" numberOfLines={2}>
                          {p.name || t('role.patient')}
                        </Txt>
                        {p.phone ? (
                          <Txt v="caption" color={colors.inkSoft}>
                            {p.phone.replace(/^\+250/, '0').replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}
                          </Txt>
                        ) : null}
                        {[p.age ? String(p.age) : '', p.village].filter(Boolean).length > 0 ? (
                          <Txt v="caption" color={colors.inkSoft}>
                            {[p.age ? String(p.age) : '', p.village].filter(Boolean).join(' · ')}
                          </Txt>
                        ) : null}
                        <StatusChip status={p.status} />
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Txt v="h1">{today}</Txt>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Feather name={up ? 'arrow-up-right' : down ? 'arrow-down-right' : 'arrow-right'} size={16} color={colors.ink} />
                          <Txt v="caption">{up ? t('chw.up') : down ? t('chw.down') : t('chw.same')}</Txt>
                        </View>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                      {p.reasonKey && p.status !== 'normal' ? <Pill icon="alert-circle" text={t(p.reasonKey, { n: p.reasonDays ?? 0 })} tone="white" /> : null}
                      {p.monitorDay > 0 && p.monitorDay < WATCH_DAYS ? <Pill icon="calendar" text={t('follow.weekDay', { d: p.monitorDay, n: WATCH_DAYS })} /> : null}
                      {p.lastSyncMin >= 0 ? <Pill icon="refresh-cw" text={timeAgo(t, p.lastSyncMin)} /> : null}
                      {p.deviceBattery > 0 && p.deviceBattery < 25 ? <Pill icon="battery" text={t('chw.lowBattery')} tone="white" /> : null}
                      {act?.visitedAt ? <Pill icon="home" text={t('patient.visited')} tone="dark" /> : null}
                      {act?.referredAt ? <Pill icon="clipboard" text={t('patient.referred')} tone="dark" /> : null}
                      {act?.receivedAt ? <Pill icon="inbox" text={t('patient.received')} tone="dark" /> : null}
                    </View>
                  </Glass>
                </FadeIn>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}
