import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle, Defs, G, Line, LinearGradient as SvgGrad, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname, type Href } from 'expo-router';
import { goBack } from '@/nav';
import { colors, fonts, MIN_TAP, radius, shadow, Status, statusMeta, type } from '@/theme';
import { useStore } from '@/store';
import type { DayCount, Person } from '@/data/mock';

export type IconName = React.ComponentProps<typeof Feather>['name'];

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */
type Variant = keyof typeof type;
export function Txt({
  v = 'body',
  color = colors.ink,
  style,
  children,
  ...rest
}: {
  v?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
} & React.ComponentProps<typeof Text>) {
  return (
    <Text style={[type[v], { color }, style]} {...rest}>
      {children}
    </Text>
  );
}

/* ------------------------------------------------------------------ */
/* Animations                                                          */
/* ------------------------------------------------------------------ */
export function FadeIn({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        style,
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Screen shell                                                        */
/* ------------------------------------------------------------------ */
export function Screen({
  children,
  scroll = true,
  tabs = false,
  deep = false,
  contentStyle,
  banner = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  tabs?: boolean;
  deep?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  banner?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const body = [
    { paddingTop: insets.top + 8, paddingBottom: (tabs ? 112 : 24) + (tabs ? 0 : insets.bottom), paddingHorizontal: 20 },
    contentStyle,
  ];
  return (
    <View style={{ flex: 1, backgroundColor: colors.gradientTop }}>
      <LinearGradient
        colors={deep ? [colors.gradientDeep, colors.gradientTop, colors.gradientBottom] : [colors.gradientTop, colors.gradientBottom]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* soft decorative circles, like the reference */}
      <View pointerEvents="none" style={[styles.blob, { top: -80, right: -90, width: 260, height: 260 }]} />
      <View pointerEvents="none" style={[styles.blob, { bottom: 120, left: -120, width: 280, height: 280 }]} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
        >
          {banner && <OfflineBanner />}
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, ...body]}>
          {banner && <OfflineBanner />}
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)' },
});

/* ------------------------------------------------------------------ */
/* Glass card                                                          */
/* ------------------------------------------------------------------ */
export function Glass({
  children,
  style,
  strong,
  padding = 20,
  onPress,
  label,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  strong?: boolean;
  padding?: number;
  onPress?: () => void;
  label?: string;
}) {
  const inner = (
    <>
      {Platform.OS !== 'android' && <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />}
      <View style={{ padding, backgroundColor: strong ? colors.glassStrong : colors.glass }}>{children}</View>
    </>
  );
  const frame: ViewStyle = {
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [frame, shadow, { transform: [{ scale: pressed ? 0.985 : 1 }] }, style]}
      >
        {inner}
      </Pressable>
    );
  }
  return <View style={[frame, shadow, style]}>{inner}</View>;
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */
export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  style,
  loading,
  hint,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'glass' | 'light' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  hint?: string;
}) {
  const bg =
    variant === 'primary' ? colors.teal : variant === 'light' ? colors.white : variant === 'danger' ? colors.danger : 'rgba(255,255,255,0.4)';
  const fg = variant === 'primary' || variant === 'danger' ? colors.white : variant === 'light' ? colors.teal : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={({ pressed }) => [
        {
          minHeight: 56,
          borderRadius: radius.pill,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingHorizontal: 24,
          opacity: disabled ? 0.5 : 1,
          borderWidth: variant === 'glass' ? 1.5 : 0,
          borderColor: colors.glassBorder,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        variant !== 'glass' && shadow,
        style,
      ]}
    >
      {loading ? <Spinner color={fg} /> : icon ? <Feather name={icon} size={22} color={fg} /> : null}
      <Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: fg }} numberOfLines={2}>
        {title}
      </Text>
    </Pressable>
  );
}

export function CircleButton({
  icon,
  label,
  onPress,
  size = 56,
  dark,
  caption,
  style,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  size?: number;
  dark?: boolean;
  caption?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [{ alignItems: 'center', gap: 6, transform: [{ scale: pressed ? 0.94 : 1 }] }, style]}
    >
      <View
        style={[
          {
            width: Math.max(size, MIN_TAP),
            height: Math.max(size, MIN_TAP),
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: dark ? colors.teal : 'rgba(255,255,255,0.45)',
            borderWidth: 1.5,
            borderColor: colors.glassBorder,
          },
        ]}
      >
        <Feather name={icon} size={size * 0.42} color={dark ? colors.white : colors.ink} />
      </View>
      {caption ? <Txt v="caption">{caption}</Txt> : null}
    </Pressable>
  );
}

export function Spinner({ color = colors.white, size = 22 }: { color?: string; size?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' })).start();
  }, [v]);
  return (
    <Animated.View style={{ transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
      <Feather name="loader" size={size} color={color} />
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */
export function Header({
  title,
  subtitle,
  back,
  right,
  light,
}: {
  title: string;
  subtitle?: string;
  back?: boolean | (() => void);
  right?: React.ReactNode;
  light?: boolean;
}) {
  const { t, signedIn, role } = useStore();
  const path = usePathname();
  const c = light ? colors.white : colors.ink;
  const homeHref: Href = role === 'chw' ? '/patients' : '/home';
  const onMainTab = ['/home', '/history', '/followup', '/settings', '/patients', '/messages', '/alerts', '/trends'].includes(path);
  const showHome = signedIn && !onMainTab;
  const homeLabel = t(role === 'chw' ? 'tab.patients' : 'tab.home');
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: MIN_TAP, justifyContent: 'space-between' }}>
        {back ? (
          <CircleButton
            icon="chevron-left"
            label={t('common.back')}
            size={48}
            onPress={typeof back === 'function' ? back : () => goBack('/home')}
          />
        ) : (
          <View />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {showHome ? (
            <Pressable
              onPress={() => router.replace(homeHref)}
              accessibilityRole="button"
              accessibilityLabel={homeLabel}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                minHeight: 48,
                paddingHorizontal: 14,
                borderRadius: 24,
                backgroundColor: colors.teal,
              }}
            >
              <Feather name="home" size={18} color="#fff" />
              <Txt v="bodyMedium" color="#fff">
                {homeLabel}
              </Txt>
            </Pressable>
          ) : null}
          {right}
        </View>
      </View>
      <Txt v="h1" color={c} style={{ marginTop: 8 }} accessibilityRole="header">
        {title}
      </Txt>
      {subtitle ? (
        <Txt v="body" color={light ? 'rgba(255,255,255,0.92)' : colors.inkSoft} style={{ marginTop: 4 }}>
          {subtitle}
        </Txt>
      ) : null}
    </View>
  );
}

export function LangToggle({ light }: { light?: boolean }) {
  const { lang, update, t } = useStore();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('settings.language')}
      style={{
        flexDirection: 'row',
        backgroundColor: light ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.45)',
        borderRadius: 999,
        padding: 3,
        borderWidth: 1,
        borderColor: colors.glassBorder,
      }}
    >
      {(['en', 'rw'] as const).map((l) => {
        const on = lang === l;
        return (
          <Pressable
            key={l}
            onPress={() => update({ lang: l })}
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={l === 'en' ? 'English' : 'Kinyarwanda'}
            style={{
              minWidth: 48,
              height: 40,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? colors.teal : 'transparent',
            }}
          >
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: on ? colors.white : light ? colors.white : colors.ink }}>
              {l === 'en' ? 'EN' : 'RW'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */
export function StatusChip({ status, large }: { status: Status; large?: boolean }) {
  const { t } = useStore();
  const m = statusMeta[status];
  return (
    <View
      accessible
      accessibilityLabel={t(m.labelKey)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: m.bg,
        borderRadius: 999,
        paddingHorizontal: large ? 16 : 12,
        paddingVertical: large ? 8 : 5,
        alignSelf: 'flex-start',
        borderWidth: 1.5,
        borderColor: m.color,
      }}
    >
      <Feather name={m.icon} size={large ? 20 : 16} color={m.text} />
      <Text style={{ fontFamily: fonts.semibold, fontSize: large ? 16 : 14, color: m.text }}>{t(m.labelKey)}</Text>
    </View>
  );
}

export function Pill({ icon, text, tone = 'glass' }: { icon?: IconName; text: string; tone?: 'glass' | 'dark' | 'white' }) {
  const bg = tone === 'dark' ? colors.ink : tone === 'white' ? colors.white : 'rgba(255,255,255,0.5)';
  const fg = tone === 'dark' ? colors.white : colors.ink;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: bg,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignSelf: 'flex-start',
      }}
    >
      {icon ? <Feather name={icon} size={15} color={fg} /> : null}
      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: fg }}>{text}</Text>
    </View>
  );
}

export function Disclaimer() {
  const { t } = useStore();
  return (
    <View
      accessible
      accessibilityLabel={t('disclaimer')}
      style={{
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: radius.small,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.glassBorder,
      }}
    >
      <Feather name="info" size={22} color={colors.teal} />
      <Txt v="caption" style={{ flex: 1, fontFamily: fonts.medium }}>
        {t('disclaimer')}
      </Txt>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */
export function Avatar({
  person,
  size = 56,
  chw,
  ring,
  style,
}: {
  person: Pick<Person, 'skin' | 'hair' | 'tone'>;
  size?: number;
  chw?: boolean;
  ring?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const shirt = chw ? colors.teal : '#E9B9A0';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: person.tone,
          borderWidth: ring ? 3 : 0,
          borderColor: 'rgba(255,255,255,0.9)',
        },
        style,
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Path d="M12 104 C12 74 32 66 50 66 C68 66 88 74 88 104 Z" fill={shirt} />
        {chw && <Path d="M44 80 h12 M50 74 v12" stroke="#fff" strokeWidth={4} strokeLinecap="round" />}
        <Rect x="43" y="52" width="14" height="16" rx="6" fill={person.skin} />
        <Circle cx="50" cy="41" r="18" fill={person.skin} />
        <Path d="M31 40 C29 20 71 20 69 40 C64 31 56 29 50 29 C44 29 36 31 31 40 Z" fill={person.hair} />
      </Svg>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Banners, toasts                                                     */
/* ------------------------------------------------------------------ */
export function OfflineBanner() {
  const { isOnline, pending, syncing, justSynced, t } = useStore();
  if (isOnline && !syncing && !justSynced) return null;
  let icon: IconName = 'wifi-off';
  let bg: string = colors.offline;
  let text = t('offline.banner');
  if (pending.length) text += ' ' + t('offline.pending', { n: pending.length });
  if (isOnline && syncing) {
    icon = 'refresh-cw';
    bg = colors.teal;
    text = t('offline.syncing');
  } else if (isOnline && justSynced) {
    icon = 'check-circle';
    bg = colors.normalText;
    text = t('offline.synced');
  }
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        backgroundColor: bg,
        borderRadius: radius.small,
        padding: 12,
        marginBottom: 14,
      }}
    >
      <Feather name={icon} size={20} color="#fff" />
      <Txt v="caption" color="#fff" style={{ flex: 1 }}>
        {text}
      </Txt>
    </View>
  );
}

export function Toast() {
  const { toast } = useStore();
  const insets = useSafeAreaInsets();
  const v = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (toast) {
      setShown(toast);
      Animated.timing(v, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }).start();
    } else {
      Animated.timing(v, { toValue: 0, duration: 250, useNativeDriver: Platform.OS !== 'web' }).start(() => setShown(null));
    }
  }, [toast, v]);
  if (!shown) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="assertive"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        top: insets.top + 8,
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
      }}
    >
      <View style={[{ backgroundColor: colors.ink, borderRadius: radius.small, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center' }, shadow]}>
        <Feather name="bell" size={20} color="#fff" />
        <Txt v="caption" color="#fff" style={{ flex: 1 }}>
          {shown}
        </Txt>
      </View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Loading / empty / error                                             */
/* ------------------------------------------------------------------ */
export function SkeletonBlock({ height = 100, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.85, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(v, { toValue: 0.45, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ).start();
  }, [v]);
  return <Animated.View style={[{ height, borderRadius: radius.card, backgroundColor: 'rgba(255,255,255,0.4)', opacity: v }, style]} />;
}

export function LoadingState({ blocks = [200, 100, 140] }: { blocks?: number[] }) {
  const { t } = useStore();
  return (
    <View accessible accessibilityLabel={t('common.loading')} accessibilityLiveRegion="polite" style={{ gap: 14 }}>
      {blocks.map((h, i) => (
        <SkeletonBlock key={i} height={h} />
      ))}
    </View>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: IconName; title: string; text: string; action?: { title: string; onPress: () => void } }) {
  return (
    <Glass style={{ marginTop: 8 }} padding={28}>
      <View style={{ alignItems: 'center', gap: 12 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon} size={36} color={colors.teal} />
        </View>
        <Txt v="h2" style={{ textAlign: 'center' }}>
          {title}
        </Txt>
        <Txt v="body" color={colors.inkSoft} style={{ textAlign: 'center' }}>
          {text}
        </Txt>
        {action ? <Button title={action.title} onPress={action.onPress} style={{ marginTop: 8, alignSelf: 'stretch' }} /> : null}
      </View>
    </Glass>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useStore();
  return (
    <Glass style={{ marginTop: 8 }} padding={28}>
      <View style={{ alignItems: 'center', gap: 12 }} accessibilityRole="alert">
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.alertBg, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="cloud-off" size={36} color={colors.alertText} />
        </View>
        <Txt v="h2" style={{ textAlign: 'center' }}>
          {t('error.title')}
        </Txt>
        <Txt v="body" color={colors.inkSoft} style={{ textAlign: 'center' }}>
          {t('error.text')}
        </Txt>
        <Button title={t('common.retry')} icon="refresh-cw" onPress={onRetry} style={{ marginTop: 8, alignSelf: 'stretch' }} />
      </View>
    </Glass>
  );
}

/** The screen is ready as soon as the phone's own data is loaded. */
export function useScreenState(): { status: 'loading' | 'error' | 'empty' | 'ready'; retry: () => void } {
  return { status: 'ready', retry: () => {} };
}

/* ------------------------------------------------------------------ */
/* Inputs, rows, switches                                              */
/* ------------------------------------------------------------------ */
export function Field(props: React.ComponentProps<typeof TextInput> & { label: string; error?: string | null; icon?: IconName; prefix?: string }) {
  const { label, error, icon, prefix, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      <Txt v="caption" style={{ fontFamily: fonts.semibold }}>
        {label}
      </Txt>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 56,
          backgroundColor: 'rgba(255,255,255,0.85)',
          borderRadius: radius.small,
          paddingHorizontal: 16,
          gap: 10,
          borderWidth: 2,
          borderColor: error ? colors.alert : 'transparent',
        }}
      >
        {icon ? <Feather name={icon} size={20} color={colors.teal} /> : null}
        {prefix ? <Txt v="bodyMedium">{prefix}</Txt> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor="#5B7F88"
          style={[{ flex: 1, minWidth: 0, fontFamily: fonts.medium, fontSize: 18, color: colors.ink, paddingVertical: 12 }, style]}
          {...rest}
        />
      </View>
      {error ? (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }} accessibilityLiveRegion="polite">
          <Feather name="alert-circle" size={16} color={colors.alertText} />
          <Txt v="caption" color={colors.alertText}>
            {error}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

export function Row({
  icon,
  title,
  subtitle,
  onPress,
  right,
  last,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  last?: boolean;
}) {
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        minHeight: 64,
        paddingVertical: 8,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(14,59,69,0.25)',
      }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={icon} size={22} color={colors.teal} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt v="bodyMedium">{title}</Txt>
        {subtitle ? (
          <Txt v="caption" color={colors.inkSoft}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right ?? (onPress ? <Feather name="chevron-right" size={22} color={colors.inkSoft} /> : null)}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

export function Switch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const v = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: value ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [value, v]);
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      style={{ minHeight: MIN_TAP, justifyContent: 'center' }}
    >
      <Animated.View
        style={{
          width: 58,
          height: 34,
          borderRadius: 17,
          padding: 3,
          backgroundColor: v.interpolate({ inputRange: [0, 1], outputRange: ['rgba(14,59,69,0.35)', colors.teal] }),
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }) }],
          }}
        >
          <Feather name={value ? 'check' : 'x'} size={16} color={value ? colors.teal : colors.inkSoft} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 999, padding: 4, borderWidth: 1, borderColor: colors.glassBorder }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 999,
              flexDirection: 'row',
              gap: 6,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? colors.teal : 'transparent',
              paddingHorizontal: 8,
            }}
          >
            {o.icon ? <Feather name={o.icon} size={16} color={on ? '#fff' : colors.ink} /> : null}
            <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: on ? '#fff' : colors.ink }} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function Gauge({ value, max = 60, status, size = 240, label }: { value: number; max?: number; status: Status; size?: number; label: string }) {
  const stroke = 20;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    p.setValue(0);
    Animated.timing(p, { toValue: Math.min(value / max, 1), duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value, max, p]);
  const m = statusMeta[status];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={`${value} ${label}`}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.45)" strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={m.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={p.interpolate({ inputRange: [0, 1], outputRange: [c, 0] }) as unknown as number}
        />
      </Svg>
      <View
        style={{
          width: size - stroke * 2 - 18,
          height: size - stroke * 2 - 18,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.35)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: fonts.bold, fontSize: 64, lineHeight: 72, color: colors.ink }} allowFontScaling={false}>
          {value}
        </Text>
        <Txt v="caption" color={colors.inkSoft} style={{ marginTop: -4 }}>
          {label}
        </Txt>
      </View>
    </View>
  );
}

export function BarChart({
  values,
  labels,
  height = 100,
  highlightLast = true,
  a11y,
}: {
  values: number[];
  labels: string[];
  height?: number;
  highlightLast?: boolean;
  a11y: string;
}) {
  const max = Math.max(...values, 1);
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    p.setValue(0);
    Animated.timing(p, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [values.join(','), p]);
  return (
    <View accessible accessibilityLabel={a11y} style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
      {values.map((v, i) => {
        const last = highlightLast && i === values.length - 1;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Txt v="caption" style={{ fontFamily: last ? fonts.bold : fonts.medium }}>
              {v}
            </Txt>
            <Animated.View
              style={{
                width: '100%',
                maxWidth: 34,
                borderRadius: 10,
                backgroundColor: last ? colors.teal : 'rgba(14,59,69,0.38)',
                height: p.interpolate({ inputRange: [0, 1], outputRange: [4, Math.max(8, (v / max) * height)] }),
              }}
            />
            <Txt v="caption" color={colors.inkSoft} style={{ fontSize: 13 }}>
              {labels[i]}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}

/** Day (white bar) and night (dark bar) stacked. Tap a bar to select. */
export function StackedBars({
  data,
  labels,
  selected,
  onSelect,
  height = 150,
  barWidth = 26,
}: {
  data: DayCount[];
  labels: string[];
  selected: number;
  onSelect: (i: number) => void;
  height?: number;
  barWidth?: number;
}) {
  const max = Math.max(...data.map((d) => d.day + d.night), 1);
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    p.setValue(0);
    Animated.timing(p, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [data.length, p]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: height + 44 }}>
      {data.map((d, i) => {
        const total = d.day + d.night;
        const h = (total / max) * height;
        const on = i === selected;
        return (
          <Pressable
            key={i}
            onPress={() => onSelect(i)}
            accessibilityRole="button"
            accessibilityLabel={`${labels[i]}: ${total}`}
            accessibilityState={{ selected: on }}
            style={{ alignItems: 'center', justifyContent: 'flex-end', width: barWidth + 10, minHeight: MIN_TAP, flexGrow: 1, gap: 4 }}
          >
            <Animated.View
              style={{
                width: barWidth,
                height: p.interpolate({ inputRange: [0, 1], outputRange: [4, h] }),
                borderRadius: 9,
                overflow: 'hidden',
                borderWidth: on ? 2 : 0,
                borderColor: colors.teal,
                backgroundColor: '#fff',
              }}
            >
              <View style={{ flex: Math.max(d.night, 0.01), backgroundColor: colors.ink }} />
              <View style={{ flex: Math.max(d.day, 0.01), backgroundColor: 'rgba(255,255,255,0.95)' }} />
            </Animated.View>
            <Txt v="caption" style={{ fontSize: 13, fontFamily: on ? fonts.bold : fonts.medium }} color={on ? colors.ink : colors.inkSoft}>
              {labels[i]}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TrendChart({
  values,
  usual,
  startLabel,
  endLabel,
  usualLabel,
  height = 170,
}: {
  values: number[];
  usual: number;
  startLabel: string;
  endLabel: string;
  usualLabel: string;
  height?: number;
}) {
  const [w, setW] = useState(300);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const L = 30, R = 10, T = 14, B = 26;
  const max = Math.ceil((Math.max(...values, usual) * 1.15) / 10) * 10;
  const x = (i: number) => L + (i * (w - L - R)) / Math.max(values.length - 1, 1);
  const y = (v: number) => T + (height - T - B) * (1 - v / max);
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`;
  const lastV = values[values.length - 1];
  return (
    <View onLayout={onLayout} accessible accessibilityLabel={`${startLabel} - ${endLabel}: ${values.join(', ')}`}>
      <Svg width={w} height={height}>
        <Defs>
          <SvgGrad id="area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.teal} stopOpacity={0.45} />
            <Stop offset="1" stopColor={colors.teal} stopOpacity={0.02} />
          </SvgGrad>
        </Defs>
        {[0, 0.5, 1].map((k) => (
          <G key={k}>
            <Line x1={L} x2={w - R} y1={y(max * k)} y2={y(max * k)} stroke="rgba(14,59,69,0.18)" strokeWidth={1} />
            <SvgText x={L - 6} y={y(max * k) + 4} fontSize={12} fill={colors.inkSoft} textAnchor="end" fontFamily={fonts.medium}>
              {Math.round(max * k)}
            </SvgText>
          </G>
        ))}
        <Path d={area} fill="url(#area)" />
        <Line x1={L} x2={w - R} y1={y(usual)} y2={y(usual)} stroke={colors.ink} strokeWidth={1.5} strokeDasharray="6 5" />
        <SvgText x={w - R} y={y(usual) - 6} fontSize={12} fill={colors.ink} textAnchor="end" fontFamily={fonts.semibold}>
          {usualLabel}
        </SvgText>
        <Path d={line} stroke={colors.teal} strokeWidth={3.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={x(values.length - 1)} cy={y(lastV)} r={7} fill={colors.teal} stroke="#fff" strokeWidth={3} />
        <SvgText x={L} y={height - 6} fontSize={12} fill={colors.inkSoft} fontFamily={fonts.medium}>
          {startLabel}
        </SvgText>
        <SvgText x={w - R} y={height - 6} fontSize={12} fill={colors.inkSoft} textAnchor="end" fontFamily={fonts.medium}>
          {endLabel}
        </SvgText>
      </Svg>
    </View>
  );
}

/** 7 dots showing how far through the watch week a person is. */
export function WeekProgress({ day, total = 7 }: { day: number; total?: number }) {
  const { t } = useStore();
  const d = Math.min(Math.max(day, 0), total);
  const done = day >= total;
  const label = day <= 0 ? t('follow.weekNone') : done ? t('follow.weekDone') : t('follow.weekDay', { d, n: total });
  return (
    <View accessible accessibilityLabel={label} style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: total }, (_, i) => {
          const on = i < d;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: 14,
                borderRadius: 7,
                backgroundColor: on ? colors.teal : 'rgba(14,59,69,0.18)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {on && done && i === total - 1 ? <Feather name="check" size={11} color="#fff" /> : null}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Feather name={done ? 'check-circle' : 'calendar'} size={16} color={colors.ink} />
        <Txt v="caption" style={{ fontFamily: fonts.semibold }}>
          {label}
        </Txt>
      </View>
    </View>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 }}>
      <Txt v="h3" accessibilityRole="header">
        {children}
      </Txt>
      {right}
    </View>
  );
}
