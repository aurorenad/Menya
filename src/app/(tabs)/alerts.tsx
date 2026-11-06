import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  Avatar, CircleButton, EmptyState, ErrorState, FadeIn, Glass, Header, LoadingState, Pill, Screen, Segmented, Txt, useScreenState,
} from '@/components/ui';
import { colors, fonts } from '@/theme';
import { useStore } from '@/store';
import { useOpen } from '@/hooks';
import { timeAgo } from '@/format';

export default function Alerts() {
  const { t, alerts, patients, markAlertSeen, notifications } = useStore();
  const open = useOpen();
  const { status, retry } = useScreenState();
  const [filter, setFilter] = useState<'all' | 'new'>('all');
  const newCount = alerts.filter((a) => a.isNew).length;
  const shown = (filter === 'new' ? alerts.filter((a) => a.isNew) : alerts).filter((a) => patients.some((p) => p.id === a.patientId));
  const list = status === 'empty' ? [] : shown;

  return (
    <Screen tabs>
      <Header title={t('alerts.title')} subtitle={t('alerts.subtitle')} />

      {status === 'loading' && <LoadingState blocks={[56, 130, 130, 130]} />}
      {status === 'error' && <ErrorState onRetry={retry} />}

      {(status === 'ready' || status === 'empty') && (
        <>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: t('alerts.all'), icon: 'list' },
              { value: 'new', label: `${t('alerts.new')} (${newCount})`, icon: 'bell' },
            ]}
          />

          <FadeIn style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 18, padding: 14 }} accessible accessibilityLabel={t('alerts.smsNote')}>
              <Feather name="message-square" size={22} color={colors.teal} />
              <Txt v="caption" style={{ flex: 1 }}>
                {notifications.sms ? t('alerts.smsNote') : t('alerts.smsOff')}
              </Txt>
            </View>
          </FadeIn>

          {list.length === 0 ? (
            <EmptyState icon="bell-off" title={t('alerts.emptyTitle')} text={t('alerts.emptyText')} />
          ) : (
            <View style={{ gap: 12, marginTop: 14 }}>
              {list.map((a, i) => {
                const p = patients.find((x) => x.id === a.patientId);
                if (!p) return null;
                const displayName = p.name || t('role.patient');
                return (
                  <FadeIn key={a.id} delay={Math.min(i, 6) * 70}>
                    <Glass strong={a.isNew} padding={16}>
                      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                        <Pressable
                          onPress={() => {
                            markAlertSeen(a.id);
                            router.push({ pathname: '/patient/[id]', params: { id: p.id } });
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`${displayName}. ${t(a.reasonKey, { n: a.reasonDays ?? 0 })}. ${timeAgo(t, a.minutesAgo)}${a.isNew ? '. ' + t('alerts.new') : ''}`}
                          style={{ flex: 1, flexDirection: 'row', gap: 14, alignItems: 'center' }}
                        >
                        <View>
                          <Avatar person={p} size={56} ring />
                          {a.isNew ? (
                            <View
                              style={{ position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, borderWidth: 2, borderColor: '#fff' }}
                            />
                          ) : null}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Txt v="h3" numberOfLines={1}>
                            {displayName}
                          </Txt>
                          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 2 }}>
                            <Feather name="alert-triangle" size={16} color={colors.alertText} />
                            <Txt v="bodyMedium" color={colors.alertText} style={{ flex: 1, fontFamily: fonts.semibold }}>
                              {t(a.reasonKey, { n: a.reasonDays ?? 0 })}
                            </Txt>
                          </View>
                          <Txt v="caption" color={colors.inkSoft}>
                            {p.village ? `${timeAgo(t, a.minutesAgo)} · ${p.village}` : timeAgo(t, a.minutesAgo)}
                          </Txt>
                        </View>
                        </Pressable>
                        <CircleButton
                          icon="message-circle"
                          label={`${t('follow.sms')} ${displayName}`}
                          dark
                          size={48}
                          onPress={() => {
                            markAlertSeen(a.id);
                            router.push({ pathname: '/chat/[id]', params: { id: p.id } });
                          }}
                        />
                        {p.phone ? <CircleButton icon="phone-call" label={`${t('follow.call')} ${displayName}`} size={48} onPress={() => open(`tel:${p.phone.replace(/\s/g, '')}`)} /> : null}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        {a.smsSent ? <Pill icon="message-square" text={t('alerts.sms')} tone="white" /> : null}
                        <Pill icon="bell" text={t('alerts.inApp')} tone="white" />
                        {a.isNew ? <Pill icon="star" text={t('alerts.new')} tone="dark" /> : null}
                      </View>
                    </Glass>
                  </FadeIn>
                );
              })}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
