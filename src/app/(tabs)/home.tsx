import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  Avatar, Button, Disclaimer, EmptyState, ErrorState, FadeIn, Glass, IconName, LangToggle, LoadingState,
  Screen, SectionTitle, StatusChip, Txt, useScreenState,
} from '@/components/ui';
import { colors, fonts, statusMeta } from '@/theme';
import { useStore } from '@/store';
import { dateLabel, total } from '@/format';
import { WATCH_DAYS } from '@/data/mock';

type Tile = { icon: IconName; title: string; text: string; href: '/check' | '/night' | '/live' | '/cough-types' | '/history' | '/followup' };

export default function Home() {
  const { t, me, conclusion } = useStore();
  const { status, retry } = useScreenState();
  const who = me.name && !me.name.startsWith('+') ? me.name : me.phone || t('home.you');
  const today = total(me.series[me.series.length - 1]);
  const m = statusMeta[me.status];
  const started = me.monitorDay > 0;
  const weekDone = started && me.monitorDay >= WATCH_DAYS;

  const mainAction = !weekDone
    ? null
    : conclusion.kind === 'followup'
      ? { title: t('home.findChw'), icon: 'map-pin' as const, onPress: () => router.navigate('/followup') }
      : conclusion.kind === 'watch'
        ? { title: t('home.seeFollowup'), icon: 'heart' as const, onPress: () => router.navigate('/followup') }
        : null;

  const tiles: Tile[] = [
    { icon: 'mic', title: t('home.tile.check'), text: t('home.tile.checkText'), href: '/check' },
    { icon: 'moon', title: t('home.tile.night'), text: t('home.tile.nightText'), href: '/night' },
    { icon: 'activity', title: t('home.tile.live'), text: t('home.tile.liveText'), href: '/live' },
    { icon: 'wind', title: t('home.tile.types'), text: t('home.tile.typesText'), href: '/cough-types' },
    { icon: 'bar-chart-2', title: t('home.tile.history'), text: t('home.tile.historyText'), href: '/history' },
    { icon: 'heart', title: t('home.tile.follow'), text: t('home.tile.followText'), href: '/followup' },
  ];

  return (
    <Screen tabs>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <Avatar person={me} size={52} ring />
          <View style={{ flex: 1 }}>
            <Txt v="h2" numberOfLines={1} accessibilityRole="header">
              {t('home.hello', { name: who })}
            </Txt>
            <Txt v="caption" color={colors.inkSoft}>
              {t(`day.${new Date().getDay()}`)}, {dateLabel(t, new Date())}
            </Txt>
          </View>
        </View>
        <LangToggle />
      </View>

      {status === 'loading' && <LoadingState blocks={[120, 160, 160]} />}
      {status === 'error' && <ErrorState onRetry={retry} />}

      {status !== 'loading' && status !== 'error' && (
        <>
          {status === 'empty' ? (
            <EmptyState icon="activity" title={t('home.emptyTitle')} text={t('home.emptyText')} />
          ) : (
            <FadeIn>
              <Glass strong>
                <View accessible accessibilityLabel={`${t(m.labelKey)}. ${today}. ${t('home.coughsToday')}`}>
                  <StatusChip status={me.status} large />
                  <Txt v="h2" style={{ marginTop: 12 }}>
                    {today}
                  </Txt>
                  <Txt v="caption" color={colors.inkSoft}>
                    {t('home.coughsToday')}
                  </Txt>
                  {!started ? (
                    <Txt v="body" style={{ marginTop: 8 }}>
                      {t('home.notStarted', { n: WATCH_DAYS })}
                    </Txt>
                  ) : !weekDone ? (
                    <Txt v="body" style={{ marginTop: 8 }}>
                      {t('home.weekPending', { d: me.monitorDay, n: WATCH_DAYS })}
                    </Txt>
                  ) : (
                    <View style={{ marginTop: 8, gap: 8 }}>
                      <Txt v="h3">{t(`live.c.${conclusion.kind}`)}</Txt>
                      <Txt v="body">{t('home.systemLead')}</Txt>
                      {conclusion.reasons.map((x, i) => (
                        <Txt key={i} v="body" color={colors.inkSoft}>
                          {t(x.key, x.p)}
                        </Txt>
                      ))}
                      <Txt v="bodyMedium">{t(`live.n.${conclusion.kind}`)}</Txt>
                    </View>
                  )}
                </View>
                {mainAction ? <Button title={mainAction.title} icon={mainAction.icon} onPress={mainAction.onPress} style={{ marginTop: 14 }} /> : null}
              </Glass>
            </FadeIn>
          )}

          <FadeIn delay={80}>
            <SectionTitle>{t('home.open')}</SectionTitle>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
              {tiles.map((tile) => (
                <Glass
                  key={tile.href}
                  padding={14}
                  onPress={() => router.push(tile.href)}
                  label={`${tile.title}. ${tile.text}`}
                  style={{ width: '48%' }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: colors.teal,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <Feather name={tile.icon} size={24} color="#fff" />
                  </View>
                  <Txt v="bodyMedium" style={{ fontFamily: fonts.semibold }}>
                    {tile.title}
                  </Txt>
                  <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 4 }}>
                    {tile.text}
                  </Txt>
                </Glass>
              ))}
            </View>
          </FadeIn>

          <View style={{ marginTop: 16 }}>
            <Disclaimer />
          </View>
        </>
      )}
    </Screen>
  );
}
