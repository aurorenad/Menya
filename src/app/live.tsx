// Live result: 1) what the device hears now, 2) the coughs it counted, 3) the conclusion.
// The conclusion comes from src/analysis.ts and is screening guidance, never a diagnosis.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Disclaimer, EmptyState, FadeIn, Glass, Header, IconName, Pill, Screen, SectionTitle, StatusChip, Txt } from '@/components/ui';
import { colors, fonts } from '@/theme';
import { useStore } from '@/store';
import { useDevice } from '@/device/DeviceProvider';
import { analyse, frameKind } from '@/analysis';
import { agoFrom, timeLabel } from '@/format';

function ProbBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: IconName }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}%`} style={{ marginTop: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Feather name={icon} size={18} color={colors.ink} />
          <Txt v="bodyMedium" style={{ flex: 1 }}>
            {label}
          </Txt>
        </View>
        <Txt v="h3">{value}%</Txt>
      </View>
      <View style={{ height: 14, borderRadius: 7, backgroundColor: 'rgba(14,59,69,0.18)', overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(2, value)}%`, height: '100%', backgroundColor: color, borderRadius: 7 }} />
      </View>
    </View>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }} accessible accessibilityLabel={`${label}: ${n}`}>
      <Txt v="h1">{n}</Txt>
      <Txt v="caption" color={colors.inkSoft} style={{ textAlign: 'center' }}>
        {label}
      </Txt>
    </View>
  );
}

export default function Live() {
  const { t, coughEvents, listening, update, removeCough } = useStore();
  const device = useDevice();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const events = useMemo(() => coughEvents.filter((e) => e.src === 'device'), [coughEvents]);
  const c = useMemo(() => analyse(events, now), [events, now]);
  const recent = useMemo(() => [...events].sort((a, b) => b.at - a.at).slice(0, 4), [events]);

  const r = device.latest;
  const kind = r ? frameKind(r) : null;
  const connected = device.phase === 'connected';
  const nowText =
    kind === 'tb' ? t('live.now.tb') : kind === 'other' ? t('live.now.other') : kind === 'quiet' ? t('live.now.quiet') : t('live.now.wait');
  const nowIcon: IconName = kind === 'tb' ? 'alert-circle' : kind === 'other' ? 'activity' : 'mic-off';

  const title = t(`live.c.${c.kind}`);
  const next = t(`live.n.${c.kind}`);
  const showStatus = c.kind !== 'collecting';

  return (
    <Screen>
      <Header title={t('live.title')} subtitle={t('live.subtitle')} back />

      {/* ---------- 1. the result ---------- */}
      <SectionTitle>{t('live.s1')}</SectionTitle>
      <FadeIn>
        <Glass strong>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <Pill
              icon="bluetooth"
              text={connected ? t('live.connected') : device.reconnecting ? t('pair.reconnecting') : t('live.notConnected')}
              tone="white"
            />
            {!device.isReal && <Pill icon="bluetooth" text={t('live.noRadio')} tone="white" />}
            {!listening && <Pill icon="moon" text={t('listen.off')} tone="white" />}
          </View>
          {!listening ? (
            <Txt v="body" color={colors.inkSoft}>
              {connected ? t('listen.offText') : t('listen.noDevice')}
            </Txt>
          ) : !r && !connected ? (
            <EmptyState
              icon="bluetooth"
              title={t('live.notConnected')}
              text={t('listen.noDevice')}
              action={{ title: t('live.pair'), onPress: () => router.push({ pathname: '/pair-device', params: { from: 'settings' } }) }}
            />
          ) : (
            <View accessibilityLiveRegion="polite">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Feather name={nowIcon} size={26} color={kind === 'tb' ? colors.alertText : colors.ink} />
                <Txt v="h3" style={{ flex: 1 }}>
                  {nowText}
                </Txt>
              </View>
              <ProbBar label={t('live.tb')} value={r?.tb ?? 0} color={colors.alert} icon="alert-circle" />
              <ProbBar label={t('live.nonTb')} value={r?.nonTb ?? 0} color={colors.watch} icon="activity" />
              <ProbBar label={t('live.noise')} value={r?.noise ?? 0} color={colors.teal} icon="wind" />
              {r ? (
                <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 10 }}>
                  {t('live.updated', { when: agoFrom(t, r.at) })}
                </Txt>
              ) : (
                <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 10 }}>
                  {t('live.now.wait')}
                </Txt>
              )}
            </View>
          )}
          <Button
            title={listening ? t('check.stop') : t('check.start')}
            icon={listening ? 'stop-circle' : 'mic'}
            variant={listening ? 'glass' : 'primary'}
            onPress={() => update({ listening: !listening })}
            style={{ marginTop: 16 }}
          />
          {!connected && !listening ? (
            <Button
              title={t('live.pair')}
              icon="bluetooth"
              variant="glass"
              onPress={() => router.push({ pathname: '/pair-device', params: { from: 'settings' } })}
              style={{ marginTop: 10 }}
            />
          ) : null}
        </Glass>
      </FadeIn>

      {/* ---------- 2. what was counted ---------- */}
      <SectionTitle>{t('live.s2')}</SectionTitle>
      <FadeIn delay={80}>
        <Glass>
          <View style={{ flexDirection: 'row' }}>
            <Stat n={c.today.total} label={t('live.today')} />
            <Stat n={c.today.tb} label={t('live.tbLike')} />
            <Stat n={c.today.other} label={t('live.other')} />
          </View>
          <Txt v="bodyMedium" style={{ marginTop: 14, fontFamily: fonts.semibold }}>
            {t('live.recent')}
          </Txt>
          {recent.length === 0 ? (
            <Txt v="body" color={colors.inkSoft} style={{ marginTop: 4 }}>
              {t('live.noneYet')}
            </Txt>
          ) : (
            recent.map((e, i) => (
              <View
                key={`${e.at}-${i}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}
                accessible
                accessibilityLabel={`${timeLabel(new Date(e.at))}. ${t('night.scores', { tb: e.tb ?? e.conf, other: e.other ?? 0, noise: e.noise ?? 0 })}`}
              >
                <Feather name={e.kind === 'tb' ? 'alert-circle' : 'activity'} size={18} color={e.kind === 'tb' ? colors.alertText : colors.ink} />
                <Txt v="body" style={{ width: 62 }}>
                  {timeLabel(new Date(e.at))}
                </Txt>
                <View style={{ flex: 1 }}>
                  <Txt v="bodyMedium">{t(e.kind === 'tb' ? 'live.kind.tb' : 'live.kind.other')}</Txt>
                  <Txt v="caption" color={colors.inkSoft}>
                    {t('night.scores', { tb: e.tb ?? (e.kind === 'tb' ? e.conf : 0), other: e.other ?? (e.kind === 'other' ? e.conf : 0), noise: e.noise ?? 0 })}
                  </Txt>
                  <Pressable onPress={() => removeCough(e.at)} accessibilityRole="button" accessibilityLabel={t('cough.notMine')} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Txt v="caption" color={colors.teal}>
                      {t('cough.notMine')}
                    </Txt>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </Glass>
      </FadeIn>

      {/* ---------- 3. the conclusion ---------- */}
      <SectionTitle>{t('live.s3')}</SectionTitle>
      <FadeIn delay={160}>
        <Glass strong>
          <View accessible accessibilityLabel={`${title}. ${next}`}>
            <View style={{ gap: 10 }}>
              {showStatus ? <StatusChip status={c.status} large /> : <Pill icon="clock" text={t('live.c.collecting')} tone="white" />}
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Pill icon="cpu" text={t('live.ai')} tone="white" />
                <Pill icon="bar-chart-2" text={t(`live.conf.${c.confidence}`)} tone="white" />
              </View>
            </View>
            <Txt v="h2" style={{ marginTop: 14 }}>
              {title}
            </Txt>
          </View>

          <Txt v="bodyMedium" style={{ marginTop: 14, fontFamily: fonts.semibold }}>
            {t('live.why')}
          </Txt>
          {c.reasons.map((x, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <Feather name="chevron-right" size={18} color={colors.teal} style={{ marginTop: 3 }} />
              <Txt v="body" style={{ flex: 1 }}>
                {t(x.key, x.p)}
              </Txt>
            </View>
          ))}

          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 16, padding: 12, marginTop: 14 }}>
            <Feather name="arrow-right-circle" size={22} color={colors.teal} />
            <Txt v="bodyMedium" style={{ flex: 1 }}>
              {next}
            </Txt>
          </View>

          {c.kind === 'followup' ? (
            <Button title={t('home.findChw')} icon="map-pin" onPress={() => router.navigate('/followup')} style={{ marginTop: 14 }} />
          ) : c.kind === 'watch' ? (
            <Button title={t('home.seeFollowup')} icon="heart" variant="glass" onPress={() => router.navigate('/followup')} style={{ marginTop: 14 }} />
          ) : null}
        </Glass>
      </FadeIn>

      {!device.isReal ? (
        <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 12 }}>
          {t('live.noRadio')}
        </Txt>
      ) : null}

      <View style={{ marginTop: 16 }}>
        <Disclaimer />
      </View>
    </Screen>
  );
}
