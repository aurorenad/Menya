import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Avatar, FadeIn, LangToggle, Screen, Txt } from '@/components/ui';
import { colors, fonts, shadow } from '@/theme';
import { useStore } from '@/store';

const RING = [
  { skin: '#8D5A3C', hair: '#1B1B1B', tone: '#F6D6C8', chw: true },
  { skin: '#A06B47', hair: '#241915', tone: '#D9ECD4', chw: false },
  { skin: '#5A3825', hair: '#8C8C8C', tone: '#E9DDF3', chw: false },
  { skin: '#6B4229', hair: '#1B1B1B', tone: '#FCE8C2', chw: true },
  { skin: '#B9825C', hair: '#241915', tone: '#F9D5E1', chw: false },
];
const CENTER = { skin: '#6B4229', hair: '#1B1B1B', tone: '#CFE8EE' };
const SIZE = 330;

function AvatarRing() {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 60000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' })).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0, duration: 2200, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ).start();
  }, [spin, pulse]);
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const counter = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
  const R = 128;
  return (
    <View style={{ width: SIZE, height: SIZE, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden>
      <View style={{ position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE, backgroundColor: 'rgba(255,255,255,0.10)' }} />
      <Animated.View
        style={{
          position: 'absolute',
          width: 230,
          height: 230,
          borderRadius: 230,
          backgroundColor: 'rgba(255,255,255,0.16)',
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.04] }) }],
        }}
      />
      {/* satellites */}
      <Animated.View style={{ position: 'absolute', width: SIZE, height: SIZE, transform: [{ rotate: rot }] }}>
        {RING.map((p, i) => {
          const a = (i / (RING.length + 1)) * Math.PI * 2 - Math.PI / 2;
          const s = i % 2 ? 54 : 62;
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left: SIZE / 2 + R * Math.cos(a) - s / 2,
                top: SIZE / 2 + R * Math.sin(a) - s / 2,
                transform: [{ rotate: counter }],
              }}
            >
              <Avatar person={p} chw={p.chw} size={s} ring />
            </Animated.View>
          );
        })}
        {/* icon bubble, like the stethoscope in the reference */}
        {(() => {
          const a = (RING.length / (RING.length + 1)) * Math.PI * 2 - Math.PI / 2;
          return (
            <Animated.View
              style={{
                position: 'absolute',
                left: SIZE / 2 + R * Math.cos(a) - 24,
                top: SIZE / 2 + R * Math.sin(a) - 24,
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(255,255,255,0.85)',
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ rotate: counter }],
              }}
            >
              <Feather name="activity" size={22} color={colors.teal} />
            </Animated.View>
          );
        })()}
      </Animated.View>
      <Avatar person={CENTER} chw size={118} ring style={shadow} />
    </View>
  );
}

export default function Welcome() {
  const { t, signedIn, role } = useStore();
  if (signedIn && role) return <Redirect href={role === 'chw' ? '/patients' : '/home'} />;
  return (
    <Screen deep scroll={false} contentStyle={{ justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="wind" size={20} color={colors.teal} />
          </View>
          <Txt v="h3" color="#fff">
            Menya
          </Txt>
        </View>
        <LangToggle light />
      </View>

      <FadeIn>
        <AvatarRing />
      </FadeIn>

      <FadeIn delay={150}>
        <Txt v="display" color="#fff" accessibilityRole="header" style={{ textShadowColor: 'rgba(14,59,69,0.35)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } }}>
          {t('welcome.title')}
        </Txt>
        <Txt v="body" color="#fff" style={{ marginTop: 6, fontSize: 18, lineHeight: 26 }}>
          {t('welcome.subtitle')}
        </Txt>
      </FadeIn>

      <FadeIn delay={300} style={{ alignItems: 'center', gap: 10 }}>
        <Pressable
          onPress={() => router.push('/consent')}
          accessibilityRole="button"
          accessibilityLabel={t('welcome.start')}
          style={({ pressed }) => [
            {
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: '#fff',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
            shadow,
          ]}
        >
          <Feather name="arrow-right" size={40} color={colors.teal} />
        </Pressable>
        <Txt v="bodyMedium" color="#fff" style={{ fontFamily: fonts.semibold }}>
          {t('welcome.start')}
        </Txt>
        <Pressable onPress={() => router.push('/design-system')} accessibilityRole="link" accessibilityLabel={t('ds.title')} style={{ minHeight: 48, justifyContent: 'center' }}>
          <Txt v="caption" color="rgba(255,255,255,0.9)" style={{ textDecorationLine: 'underline' }}>
            {t('ds.title')}
          </Txt>
        </Pressable>
      </FadeIn>
    </Screen>
  );
}
