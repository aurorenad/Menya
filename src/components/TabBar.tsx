import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, shadow } from '@/theme';
import { useStore } from '@/store';
import type { IconName } from '@/components/ui';

type Item = { name: string; icon: IconName; labelKey: string };

const PATIENT_TABS: Item[] = [
  { name: 'home', icon: 'home', labelKey: 'tab.home' },
  { name: 'history', icon: 'bar-chart-2', labelKey: 'tab.history' },
  { name: 'followup', icon: 'heart', labelKey: 'tab.followup' },
  { name: 'settings', icon: 'settings', labelKey: 'tab.settings' },
];
const CHW_TABS: Item[] = [
  { name: 'patients', icon: 'users', labelKey: 'tab.patients' },
  { name: 'messages', icon: 'message-circle', labelKey: 'tab.messages' },
  { name: 'alerts', icon: 'bell', labelKey: 'tab.alerts' },
  { name: 'trends', icon: 'trending-up', labelKey: 'tab.trends' },
  { name: 'settings', icon: 'settings', labelKey: 'tab.settings' },
];

export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { role, t, alerts, chats } = useStore();
  const insets = useSafeAreaInsets();
  const items = role === 'chw' ? CHW_TABS : PATIENT_TABS;
  const active = state.routes[state.index]?.name;
  const unread = alerts.filter((a) => a.isNew).length;
  const unreadMessages = new Set((chats ?? []).filter((m) => m.from === 'patient' && !m.seen).map((m) => m.thread)).size;

  return (
    <View
      style={[
        {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: Math.max(insets.bottom, 12),
          borderRadius: 32,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.glassBorder,
        },
        shadow,
      ]}
    >
      {Platform.OS !== 'android' && <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />}
      <View style={{ flexDirection: 'row', padding: 6, backgroundColor: 'rgba(255,255,255,0.62)' }}>
        {items.map((it) => {
          const on = active === it.name;
          const badge = it.name === 'alerts' && unread > 0 ? unread : it.name === 'messages' && unreadMessages > 0 ? unreadMessages : 0;
          return (
            <Pressable
              key={it.name}
              onPress={() => {
                const route = state.routes.find((r) => r.name === it.name);
                if (route) navigateToTab(route.key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t(it.labelKey) + (badge ? `, ${badge}` : '')}
              style={{
                flex: 1,
                minHeight: 60,
                borderRadius: 26,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                backgroundColor: on ? colors.teal : 'transparent',
              }}
            >
              <View>
                <Feather name={it.icon} size={23} color={on ? '#fff' : colors.ink} />
                {badge ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -10,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: colors.danger,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                      borderWidth: 1.5,
                      borderColor: '#fff',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontFamily: fonts.bold }}>{badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 12.5, color: on ? '#fff' : colors.ink }} numberOfLines={1}>
                {t(it.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
