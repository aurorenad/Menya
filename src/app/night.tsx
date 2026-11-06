// Night listening keeps each cough the device scores, with the real percentages.
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Disclaimer, FadeIn, Glass, Header, Screen, Txt } from '@/components/ui';
import { colors } from '@/theme';
import { useStore } from '@/store';
import { useDevice } from '@/device/DeviceProvider';
import { timeLabel } from '@/format';

function isNight(at: number) {
  const h = new Date(at).getHours();
  return h >= 20 || h < 6;
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}%`} style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Txt v="bodyMedium">{label}</Txt>
        <Txt v="h3">{value}%</Txt>
      </View>
      <View style={{ height: 12, borderRadius: 6, backgroundColor: 'rgba(14,59,69,0.18)', overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(2, Math.min(100, value))}%`, height: '100%', backgroundColor: color, borderRadius: 6 }} />
      </View>
    </View>
  );
}

export default function Night() {
  const { t, deviceName, listening, update, coughEvents, spotChecks, removeCough } = useStore();
  const device = useDevice();
  const on = !!deviceName && listening;
  const live = device.latest;

  const saved = useMemo(() => {
    const rows: { at: number; tb: number; other: number; noise: number }[] = [];
    for (const e of coughEvents) {
      if (e.src !== 'device') continue;
      rows.push({
        at: e.at,
        tb: e.tb ?? (e.kind === 'tb' ? e.conf : 0),
        other: e.other ?? (e.kind === 'other' ? e.conf : 0),
        noise: e.noise ?? 0,
      });
    }
    for (const s of spotChecks) {
      if (rows.some((r) => Math.abs(r.at - s.at) < 3000)) continue;
      rows.push({ at: s.at, tb: s.tb, other: s.other, noise: s.noise ?? 0 });
    }
    return rows.sort((a, b) => b.at - a.at);
  }, [coughEvents, spotChecks]);

  const nightCount = saved.filter((r) => isNight(r.at)).length;
  const avg = (key: 'tb' | 'other' | 'noise') => (saved.length ? Math.round(saved.reduce((s, r) => s + r[key], 0) / saved.length) : 0);

  return (
    <Screen>
      <Header title={t('night.title')} subtitle={t('night.subtitle')} back />

      <FadeIn>
        <Glass strong>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: on ? colors.normalBg : 'rgba(255,255,255,0.7)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="moon" size={26} color={on ? colors.normalText : colors.inkSoft} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="h3">{listening ? t('check.listening') : deviceName ? t('listen.off') : t('listen.noDevice')}</Txt>
              <Txt v="caption" color={colors.inkSoft}>
                {listening ? t('listen.onText') : deviceName ? t('listen.offText') : t('home.emptyText')}
              </Txt>
            </View>
          </View>
          <Button
            title={listening ? t('check.stop') : t('check.start')}
            icon={listening ? 'stop-circle' : 'mic'}
            variant={listening ? 'glass' : 'primary'}
            onPress={() => update({ listening: !listening })}
            style={{ marginTop: 14 }}
          />
          {!deviceName ? (
            <Button
              title={t('pair.search')}
              icon="bluetooth"
              variant="glass"
              onPress={() => router.push({ pathname: '/pair-device', params: { from: 'settings' } })}
              style={{ marginTop: 10 }}
            />
          ) : null}
          {live && listening ? (
            <View style={{ marginTop: 8 }}>
              <Bar label={t('check.mix.tb')} value={live.tb} color={colors.alert} />
              <Bar label={t('check.mix.other')} value={live.nonTb} color={colors.watch} />
              <Bar label={t('check.mix.noise')} value={live.noise} color={colors.teal} />
            </View>
          ) : null}
        </Glass>
      </FadeIn>

      <FadeIn delay={80}>
        <Glass style={{ marginTop: 14 }}>
          <Txt v="caption" color={colors.inkSoft}>
            {t('night.count')}
          </Txt>
          <Txt v="h1" style={{ marginTop: 4 }}>
            {nightCount}
          </Txt>
          <Txt v="body" color={colors.inkSoft}>
            {t('night.saved', { n: saved.length })}
          </Txt>
          {saved.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              <Txt v="caption" color={colors.inkSoft}>
                {t('night.avg')}
              </Txt>
              <Bar label={t('check.mix.tb')} value={avg('tb')} color={colors.alert} />
              <Bar label={t('check.mix.other')} value={avg('other')} color={colors.watch} />
              <Bar label={t('check.mix.noise')} value={avg('noise')} color={colors.teal} />
            </View>
          ) : (
            <Txt v="body" color={colors.inkSoft} style={{ marginTop: 6 }}>
              {t('night.none')}
            </Txt>
          )}
        </Glass>
      </FadeIn>

      {saved.length > 0 ? (
        <FadeIn delay={120}>
          <Glass style={{ marginTop: 14 }}>
            {saved.slice(0, 12).map((r, i) => (
              <View key={`${r.at}-${i}`} style={{ marginTop: i === 0 ? 0 : 12 }}>
                <Txt v="bodyMedium">{timeLabel(new Date(r.at))}</Txt>
                <Txt v="body" color={colors.inkSoft}>
                  {t('night.scores', { tb: r.tb, other: r.other, noise: r.noise })}
                </Txt>
                <Pressable onPress={() => removeCough(r.at)} accessibilityRole="button" accessibilityLabel={t('cough.notMine')} style={{ marginTop: 4, minHeight: 44, justifyContent: 'center' }}>
                  <Txt v="bodyMedium" color={colors.teal}>
                    {t('cough.notMine')}
                  </Txt>
                </Pressable>
              </View>
            ))}
          </Glass>
        </FadeIn>
      ) : null}

      <View style={{ marginTop: 16 }}>
        <Disclaimer />
      </View>
    </Screen>
  );
}
