// One recording of up to a minute. The person can stop it sooner.
// The device model then keeps the cough moments and removes the noise.
// The last page says what to do next. No sound file is kept.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Disclaimer, FadeIn, Glass, Header, Pill, Screen, Txt } from '@/components/ui';
import { colors, fonts } from '@/theme';
import { useStore } from '@/store';
import { useDevice } from '@/device/DeviceProvider';
import type { Reading } from '@/device/protocol';
import { timeLabel } from '@/format';
import { CHW_USER } from '@/data/mock';
import {
  RECORD_MS,
  MinuteRecorder,
  concludeSpot,
  type CoughType,
  type FilteredRecording,
  type Mix,
  type SpotConclusion,
  type StopReason,
} from '@/checkSession';

function typeName(t: (key: string, p?: Record<string, string | number>) => string, type: CoughType) {
  if (type === 'dry') return t('check.type.dry');
  if (type === 'wet') return t('check.type.wet');
  if (type === 'productive') return t('check.type.productive');
  if (type === 'barking') return t('check.type.barking');
  return t('check.type.uncertain');
}

function clock(ms: number) {
  const s = Math.min(60, Math.max(0, Math.floor(ms / 1000)));
  return `0:${String(s).padStart(2, '0')}`;
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

function MixBars({ mix, t }: { mix: Mix; t: (key: string) => string }) {
  return (
    <>
      <Bar label={t('check.mix.noise')} value={mix.noise} color={colors.teal} />
      <Bar label={t('check.mix.tb')} value={mix.tb} color={colors.alert} />
      <Bar label={t('check.mix.other')} value={mix.other} color={colors.watch} />
    </>
  );
}

export default function Check() {
  const { t, addSpotCough, addCoughEvents, spotChecks, listening, removeCough, sendSample } = useStore();
  const device = useDevice();
  const connected = device.phase === 'connected';
  const useLive = device.isReal && connected;
  const waitingLink = device.isReal && (device.reconnecting || device.phase === 'connecting');

  const [phase, setPhase] = useState<'idle' | 'listening' | 'filtered' | 'recommend'>('idle');
  const [live, setLive] = useState<Mix | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<FilteredRecording | null>(null);
  const [advice, setAdvice] = useState<SpotConclusion | null>(null);

  const recorder = useRef(new MinuteRecorder());
  const finished = useRef(false);
  const clockTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopListen = useRef<(() => void) | null>(null);
  const startedAt = useRef(0);

  const stopTimers = () => {
    if (clockTimer.current) clearInterval(clockTimer.current);
    clockTimer.current = null;
    stopListen.current?.();
    stopListen.current = null;
  };

  const finish = (reason: StopReason) => {
    if (finished.current) return;
    finished.current = true;
    stopTimers();
    const next = recorder.current.finish(reason);
    next.coughs.forEach((c) => addSpotCough(c));
    // Background listening already stores these. Otherwise keep the device scores with the cough history.
    if (!listening && next.coughs.length > 0) {
      addCoughEvents(
        next.coughs.map((c) => ({
          at: c.at,
          kind: c.tb >= 50 && c.tb >= c.other ? ('tb' as const) : ('other' as const),
          conf: Math.max(c.tb, c.other),
          tb: c.tb,
          other: c.other,
          noise: c.noise,
          src: 'device' as const,
        })),
      );
    }
    setResult(next);
    setAdvice(concludeSpot(next.coughs));
    setPhase('filtered');
  };

  useEffect(
    () => () => {
      if (clockTimer.current) clearInterval(clockTimer.current);
      stopListen.current?.();
    },
    [],
  );

  const begin = () => {
    stopTimers();
    finished.current = false;
    recorder.current = new MinuteRecorder();
    startedAt.current = Date.now();
    setElapsed(0);
    setLive(null);
    setResult(null);
    setAdvice(null);
    setPhase('listening');
    clockTimer.current = setInterval(() => {
      const ms = Date.now() - startedAt.current;
      setElapsed(ms);
      if (ms >= RECORD_MS) finish('minute');
    }, 200);
  };

  const pushFrame = (frame: Reading) => {
    if (finished.current) return;
    recorder.current.push(frame);
    setLive({ noise: frame.noise, tb: frame.tb, other: frame.nonTb });
  };

  const playDevice = () => {
    begin();
    const started = startedAt.current;
    stopListen.current = device.subscribe((r) => {
      if (finished.current || r.at < started) return;
      pushFrame(r);
    });
  };

  const openPairing = () => router.push({ pathname: '/pair-device', params: { from: 'check' } });

  const recordCough = () => {
    if (!device.isReal || waitingLink) return;
    if (!connected) {
      openPairing();
      return;
    }
    playDevice();
  };

  const recent = [...spotChecks].slice(-6).reverse();
  const progress = Math.min(100, (elapsed / RECORD_MS) * 100);

  return (
    <Screen>
      <Header
        title={phase === 'recommend' ? t('check.nextTitle') : t('check.title')}
        subtitle={phase === 'recommend' ? t('check.nextSub') : t('check.subtitle')}
        back
      />

      {phase === 'idle' && (
        <FadeIn>
          <Glass strong>
            <Txt v="h3">{t('check.howTitle')}</Txt>
            <Txt v="body" style={{ marginTop: 8 }}>
              {t('check.how1')}
            </Txt>
            <Txt v="body" style={{ marginTop: 6 }}>
              {t('check.how2')}
            </Txt>
            <Txt v="body" style={{ marginTop: 6 }}>
              {t('check.how3')}
            </Txt>
            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              <Pill
                icon="bluetooth"
                text={connected ? t('live.connected') : waitingLink ? t('pair.reconnecting') : t('live.notConnected')}
                tone="white"
              />
            </View>
            <Button
              title={!device.isReal ? t('check.start') : !connected ? (waitingLink ? t('pair.reconnecting') : t('live.pair')) : t('check.start')}
              icon={!device.isReal || connected ? 'mic' : 'bluetooth'}
              onPress={recordCough}
              disabled={!device.isReal || waitingLink}
              style={{ marginTop: 16 }}
            />
            <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 12 }}>
              {!device.isReal ? t('check.noBluetooth') : useLive ? t('check.deviceNote') : t('check.connectFirst')}
            </Txt>
          </Glass>

          <Glass style={{ marginTop: 14 }}>
            <Txt v="h3">{t('check.keptList')}</Txt>
            {recent.length === 0 ? (
              <Txt v="body" color={colors.inkSoft} style={{ marginTop: 6 }}>
                {t('check.keptNone')}
              </Txt>
            ) : (
              recent.map((c, i) => (
                <View key={`${c.at}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <Feather name="check" size={18} color={colors.teal} />
                  <Txt v="body" style={{ width: 56 }}>
                    {timeLabel(new Date(c.at))}
                  </Txt>
                  <Txt v="bodyMedium" style={{ flex: 1 }}>
                    {typeName(t, c.type)}
                  </Txt>
                  <Txt v="caption" color={colors.inkSoft}>
                    {t('night.scores', { tb: c.tb, other: c.other, noise: c.noise ?? 0 })}
                  </Txt>
                  <Pressable onPress={() => removeCough(c.at)} accessibilityRole="button" accessibilityLabel={t('cough.notMine')} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Txt v="caption" color={colors.teal}>
                      {t('cough.notMine')}
                    </Txt>
                  </Pressable>
                </View>
              ))
            )}
          </Glass>
        </FadeIn>
      )}

      {phase === 'listening' && (
        <FadeIn>
          <Glass strong>
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="mic" size={40} color="#fff" />
              </View>
            </View>
            <Txt v="h3" style={{ textAlign: 'center' }}>
              {t('check.listening')}
            </Txt>
            <Txt v="body" color={colors.inkSoft} style={{ textAlign: 'center', marginTop: 4 }}>
              {t('check.listeningHint')}
            </Txt>
            <Txt v="h2" style={{ textAlign: 'center', marginTop: 12 }} accessibilityLabel={t('check.timer', { time: clock(elapsed) })}>
              {clock(elapsed)}
            </Txt>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(14,59,69,0.18)', overflow: 'hidden', marginTop: 8 }}>
              <View style={{ width: `${Math.max(2, progress)}%`, height: '100%', backgroundColor: colors.teal, borderRadius: 4 }} />
            </View>
            <Txt v="caption" color={colors.inkSoft} style={{ textAlign: 'center', marginTop: 6 }}>
              {t('check.timer', { time: clock(elapsed) })}
            </Txt>
            {live ? (
              <MixBars mix={live} t={t} />
            ) : useLive ? (
              <Txt v="caption" color={colors.inkSoft} style={{ textAlign: 'center', marginTop: 12 }}>
                {t('live.now.wait')}
              </Txt>
            ) : null}
            <Button title={t('check.stop')} icon="stop-circle" variant="glass" onPress={() => finish('user')} style={{ marginTop: 16 }} />
          </Glass>
        </FadeIn>
      )}

      {phase === 'filtered' && result && (
        <FadeIn>
          <Glass strong>
            <Txt v="h3">{result.reason === 'minute' ? t('check.stoppedMinute') : t('check.stoppedUser')}</Txt>
            <Txt v="bodyMedium" style={{ marginTop: 14, fontFamily: fonts.semibold }}>
              {t('check.filterTitle')}
            </Txt>
            <Txt v="body" style={{ marginTop: 4 }}>
              {t('check.filterLead', { n: result.noiseShare })}
            </Txt>
            <MixBars mix={result.noiseMix} t={t} />
            <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 8 }}>
              {t('check.noiseNotSaved')}
            </Txt>
          </Glass>

          <Glass style={{ marginTop: 12 }}>
            {result.coughs.length > 0 ? (
              <>
                <Txt v="h3">{t('check.keptTitle')}</Txt>
                <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 4 }}>
                  {t('check.keptText')}
                </Txt>
                {result.coughs.map((c, i) => (
                  <View key={`${c.at}-${i}`} style={{ marginTop: 12 }}>
                    <Txt v="bodyMedium">
                      {i + 1}. {typeName(t, c.type)}
                    </Txt>
                    <Bar label={t('check.mix.tb')} value={c.tb} color={colors.alert} />
                    <Bar label={t('check.mix.other')} value={c.other} color={colors.watch} />
                    <Bar label={t('check.mix.noise')} value={c.noise ?? 0} color={colors.teal} />
                    <Pressable onPress={() => removeCough(c.at)} accessibilityRole="button" accessibilityLabel={t('cough.notMine')} style={{ marginTop: 6, minHeight: 44, justifyContent: 'center' }}>
                      <Txt v="bodyMedium" color={colors.teal}>
                        {t('cough.notMine')}
                      </Txt>
                    </Pressable>
                  </View>
                ))}
              </>
            ) : (
              <Txt v="body">{t('check.noSave')}</Txt>
            )}
            <Button title={t('check.seeNext')} icon="arrow-right" onPress={() => setPhase('recommend')} style={{ marginTop: 16 }} />
            {result.coughs.length > 0 ? (
              <>
                <Button
                  title={t('sample.send', { name: CHW_USER.name })}
                  icon="upload"
                  variant="glass"
                  onPress={() => {
                    const c = result.coughs[result.coughs.length - 1];
                    sendSample(t('sample.chat', { tb: c.tb, other: c.other, noise: c.noise ?? 0 }));
                  }}
                  style={{ marginTop: 10 }}
                />
                <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 8 }}>
                  {t('sample.note')}
                </Txt>
              </>
            ) : null}
          </Glass>
        </FadeIn>
      )}

      {phase === 'recommend' && advice && (
        <FadeIn>
          <Glass strong>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather
                name={advice.kind === 'talk' ? 'alert-circle' : advice.kind === 'again' ? 'wind' : 'check-circle'}
                size={26}
                color={advice.kind === 'talk' ? colors.alertText : colors.ink}
              />
              <Txt v="h2" style={{ flex: 1 }}>
                {advice.kind === 'talk'
                  ? t('check.nextTalk')
                  : advice.kind === 'watch'
                    ? t('check.nextWatch')
                    : advice.kind === 'usual'
                      ? t('check.nextUsual', { type: typeName(t, advice.type) })
                      : t('check.nextAgain')}
              </Txt>
            </View>
            {advice.kind !== 'again' ? (
              <Txt v="body" style={{ marginTop: 12 }}>
                {t('check.mean', { tb: advice.tb, other: advice.other, n: result?.coughs.length ?? 0 })}
              </Txt>
            ) : null}
            <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 8 }}>
              {t('check.nextWhy')}
            </Txt>
            {advice.kind === 'talk' ? (
              <Button title={t('home.findChw')} icon="map-pin" onPress={() => router.navigate('/followup')} style={{ marginTop: 16 }} />
            ) : advice.kind === 'watch' || advice.kind === 'usual' ? (
              <Button title={t('live.seeLive')} icon="activity" onPress={() => router.navigate('/live')} style={{ marginTop: 16 }} />
            ) : (
              <Button title={t('check.start')} icon="mic" onPress={recordCough} style={{ marginTop: 16 }} />
            )}
            <Button
              title={t('check.restart')}
              icon="refresh-cw"
              variant="glass"
              onPress={() => {
                setResult(null);
                setAdvice(null);
                setPhase('idle');
              }}
              style={{ marginTop: 10 }}
            />
          </Glass>
        </FadeIn>
      )}

      <View style={{ marginTop: 16 }}>
        <Disclaimer />
      </View>
    </Screen>
  );
}
