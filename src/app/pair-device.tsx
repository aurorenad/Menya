// Pairing flow. It scans and connects through `useDevice()` (src/device).
// In a development build that is the real Arduino over Bluetooth (react-native-ble-plx).
// In Expo Go and on the web it is a built-in demo device, so the prototype still runs.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, FadeIn, Glass, Header, IconName, Pill, Screen, Txt, Spinner } from '@/components/ui';
import { colors, fonts } from '@/theme';
import { useStore } from '@/store';
import { useDevice } from '@/device/DeviceProvider';
import { goBack } from '@/nav';

type Phase = 'intro' | 'searching' | 'found' | 'connecting' | 'connected' | 'error';
const DEVICE = 'Menya Nano · A4F2';

function Ring({ delay }: { delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 2400, delay, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }));
    loop.start();
    return () => loop.stop();
  }, [v, delay]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 3,
        borderColor: '#fff',
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.5] }) }],
      }}
    />
  );
}

function SearchingRing({ icon = 'bluetooth', pulsing = true, ok }: { icon?: IconName; pulsing?: boolean; ok?: boolean }) {
  return (
    <View style={{ height: 230, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden>
      {pulsing && (
        <>
          <Ring delay={0} />
          <Ring delay={800} />
          <Ring delay={1600} />
        </>
      )}
      <View
        style={{
          width: 108,
          height: 108,
          borderRadius: 54,
          backgroundColor: ok ? colors.normal : '#fff',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name={icon} size={46} color={ok ? '#fff' : colors.teal} />
      </View>
    </View>
  );
}

export default function PairDevice() {
  const { t, deviceName, syncNow, lastSynced } = useStore();
  const device = useDevice();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromSettings = from === 'settings';
  const fromCheck = from === 'check';
  const [forcedError, setForcedError] = useState(false); // the "Error view" demo switch
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { cancelScan } = device;
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      cancelScan();
    },
    [cancelScan],
  );

  // The screen follows the real connection state.
  const phase: Phase = forcedError
    ? 'error'
    : device.phase === 'scanning'
      ? 'searching'
      : device.phase === 'idle'
        ? deviceName && device.isReal // a saved real device is being reconnected; the demo device only counts while streaming
          ? 'connected'
          : 'intro'
        : device.phase;
  const foundName = device.found?.name ?? deviceName ?? DEVICE;

  const startSearch = () => {
    setForcedError(false);
    device.scan();
  };
  const connect = () => {
    if (device.found) device.connect(device.found);
  };
  const errorText =
    device.error === 'bluetooth_off' ? t('pair.err.bluetooth_off') : device.error === 'permission' ? t('pair.err.permission') : t('pair.errorText');
  const leave = () => goBack(fromCheck ? '/check' : fromSettings ? '/settings' : '/home');
  const steps: { icon: IconName; text: string }[] = [
    { icon: 'power', text: t('pair.step1') },
    { icon: 'smartphone', text: t('pair.step2') },
    { icon: 'search', text: t('pair.step3') },
  ];

  return (
    <Screen>
      <Header
        title={phase === 'connected' ? t('pair.connectedTitle') : t('pair.title')}
        subtitle={phase === 'intro' ? t('pair.subtitle') : undefined}
        back={fromSettings || fromCheck || phase !== 'intro' ? leave : undefined}
      />

      {phase === 'intro' && (
        <FadeIn>
          <Glass>
            {steps.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 10 }} accessible accessibilityLabel={`${i + 1}. ${s.text}`}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt v="h3" color="#fff">
                    {i + 1}
                  </Txt>
                </View>
                <Txt v="body" style={{ flex: 1 }}>
                  {s.text}
                </Txt>
                <Feather name={s.icon} size={24} color={colors.teal} />
              </View>
            ))}
          </Glass>
          <View style={{ marginTop: 14, gap: 8, alignItems: 'flex-start' }}>
            <Pill icon="wifi-off" text={t('pair.noInternet')} />
            {!device.isReal && <Pill icon="cpu" text={t('live.demoMode')} />}
          </View>
          <Button title={t('pair.search')} icon="search" onPress={startSearch} style={{ marginTop: 22 }} />
          {!fromSettings && <Button title={t('pair.skip')} variant="glass" onPress={() => router.replace('/home')} style={{ marginTop: 12 }} />}
        </FadeIn>
      )}

      {phase === 'searching' && (
        <FadeIn>
          <SearchingRing />
          <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 6 }}>
            <Txt v="h2" style={{ textAlign: 'center' }}>
              {t('pair.searching')}
            </Txt>
            <Txt v="body" color={colors.inkSoft} style={{ textAlign: 'center' }}>
              {t('pair.searchingHint')}
            </Txt>
          </View>
        </FadeIn>
      )}

      {phase === 'found' && (
        <FadeIn>
          <SearchingRing pulsing={false} />
          <Txt v="h3" style={{ marginBottom: 10 }}>
            {t('pair.found')}
          </Txt>
          <Glass strong>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="cpu" size={26} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Txt v="bodyMedium" style={{ fontFamily: fonts.semibold }}>
                  {foundName}
                </Txt>
                <Txt v="caption" color={colors.inkSoft}>
                  {t('pair.veryClose')}
                </Txt>
              </View>
              <Feather name="bluetooth" size={22} color={colors.teal} />
            </View>
          </Glass>
          <Button title={t('pair.connect')} icon="link" onPress={connect} style={{ marginTop: 22 }} />
        </FadeIn>
      )}

      {phase === 'connecting' && (
        <FadeIn>
          <SearchingRing />
          <View style={{ alignItems: 'center', gap: 10 }} accessibilityLiveRegion="polite">
            <Spinner color={colors.teal} size={28} />
            <Txt v="h2">{t('pair.connecting')}</Txt>
          </View>
        </FadeIn>
      )}

      {phase === 'error' && (
        <FadeIn>
          <SearchingRing icon="bluetooth" pulsing={false} />
          <Glass>
            <View accessibilityRole="alert" style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Feather name="alert-circle" size={24} color={colors.alertText} />
                <Txt v="h3" style={{ flex: 1 }}>
                  {t('pair.errorTitle')}
                </Txt>
              </View>
              <Txt v="body" color={colors.inkSoft}>
                {errorText}
              </Txt>
            </View>
          </Glass>
          <Button
            title={t('common.retry')}
            icon="refresh-cw"
            onPress={() => {
              setForcedError(false);
              device.scan();
            }}
            style={{ marginTop: 22 }}
          />
        </FadeIn>
      )}

      {phase === 'connected' && (
        <FadeIn>
          <SearchingRing icon="check" pulsing={false} ok />
          <Glass>
            <View accessible accessibilityLabel={deviceName ?? DEVICE}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Feather name="check-circle" size={22} color={colors.normalText} />
                <Txt v="bodyMedium" style={{ fontFamily: fonts.semibold, flex: 1 }}>
                  {deviceName ?? DEVICE}
                </Txt>
                <Pill icon="bluetooth" text={device.phase === 'connected' ? t('pair.connectedPill') : t('pair.reconnecting')} tone="white" />
              </View>
              <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 14 }}>
                {t('live.noBattery')}
              </Txt>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <Pill icon="radio" text={t('pair.veryClose')} />
                {lastSynced > 0 ? <Pill icon="clock" text={t('pair.lastSync', { m: Math.max(1, Math.round((Date.now() - lastSynced) / 60000)) })} /> : null}
              </View>
            </View>
          </Glass>
          {fromCheck ? (
            <Button title={t('check.start')} icon="mic" onPress={leave} style={{ marginTop: 22 }} />
          ) : (
            <>
              <Button title={t('live.seeLive')} icon="activity" onPress={() => router.navigate('/live')} style={{ marginTop: 22 }} />
              <Button title={fromSettings ? t('common.done') : t('common.continue')} icon="arrow-right" variant="glass" onPress={leave} style={{ marginTop: 12 }} />
            </>
          )}
          <Button title={t('home.syncNow')} variant="glass" icon="refresh-cw" onPress={syncNow} style={{ marginTop: 12 }} />
          {fromSettings && <Button title={t('pair.disconnect')} variant="glass" icon="x-circle" onPress={device.disconnect} style={{ marginTop: 12 }} />}
        </FadeIn>
      )}
    </Screen>
  );
}
