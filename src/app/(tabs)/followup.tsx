import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  Avatar, Button, Disclaimer, EmptyState, ErrorState, FadeIn, Glass, Header, IconName, LoadingState, Screen, SectionTitle,
  Txt, useScreenState, WeekProgress,
} from '@/components/ui';
import { colors, fonts } from '@/theme';
import { useStore } from '@/store';
import { CHW_DIRECTORY, CHW_USER, WATCH_DAYS } from '@/data/mock';
import { agoFrom } from '@/format';

type Step = { icon: IconName; title: string; text: string; done: boolean };

export default function FollowUp() {
  const { t, me, conclusion, actions, chwContactedAt, spotChecks, coughEvents, sendSample } = useStore();
  const { status, retry } = useScreenState();
  const [now] = React.useState(() => Date.now());
  const told = chwContactedAt !== null;
  const received = !!actions[me.id]?.receivedAt;
  const started = me.monitorDay > 0;
  const weekDone = started && conclusion.day >= WATCH_DAYS;
  const flagged = weekDone && conclusion.kind === 'followup';
  const daysToGo = Math.max(0, WATCH_DAYS - (started ? conclusion.day : 0));
  const showReady = status === 'ready' || status === 'empty';

  const steps: Step[] = flagged
    ? [
        { icon: 'calendar', title: t('follow.t1'), text: t('follow.t1t', { n: WATCH_DAYS }), done: true },
        { icon: 'flag', title: t('follow.s1'), text: t(`live.n.${conclusion.kind}`), done: true },
        {
          icon: 'send',
          title: told ? t('follow.s2done') : t('follow.s2'),
          text: told ? t('follow.s2dt', { when: agoFrom(t, chwContactedAt ?? now) }) : t('follow.s2t'),
          done: told,
        },
        { icon: 'clipboard', title: t('follow.t4'), text: received ? t('follow.t4done') : t('follow.t4wait'), done: received },
      ]
    : started && conclusion.kind === 'watch'
      ? [
          { icon: 'eye', title: t('follow.w1'), text: t('follow.w1t', { d: me.monitorDay, n: WATCH_DAYS }), done: true },
          { icon: 'clipboard', title: weekDone ? t(`live.c.${conclusion.kind}`) : t('follow.weekTitle'), text: weekDone ? t(`live.n.${conclusion.kind}`) : t('follow.w2t'), done: false },
        ]
      : [];

  return (
    <Screen tabs>
      <Header title={t('follow.title')} subtitle={t('follow.subtitle')} />

      {status === 'loading' && <LoadingState blocks={[150, 220, 260]} />}
      {status === 'error' && <ErrorState onRetry={retry} />}

      {showReady && (
        <>
          {/* 1. The watch week */}
          <FadeIn>
            <Glass>
              <Txt v="h3" style={{ marginBottom: 12 }}>
                {t('follow.weekTitle')}
              </Txt>
              <WeekProgress day={started ? conclusion.day : 0} />
              <Txt v="body" color={colors.inkSoft} style={{ marginTop: 12 }}>
                {!started
                  ? t('home.notStarted', { n: WATCH_DAYS })
                  : !weekDone
                    ? t('follow.weekWait', { n: daysToGo })
                    : t(`live.n.${conclusion.kind}`)}
              </Txt>
              {weekDone ? (
                <Txt v="bodyMedium" style={{ marginTop: 8 }}>
                  {t('home.systemLead')} {t(`live.c.${conclusion.kind}`)}
                </Txt>
              ) : null}
            </Glass>
          </FadeIn>

          {/* 2. Suggested next step: only after the week, and only if the cough is still rising */}
          {flagged && status !== 'empty' && (
            <FadeIn delay={100} style={{ marginTop: 14 }}>
              <Glass strong>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.alertBg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.alert }}>
                    <Feather name="clipboard" size={26} color={colors.alertText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt v="h2">{t(`live.c.${conclusion.kind}`)}</Txt>
                  </View>
                </View>
                <Txt v="body" color={colors.inkSoft} style={{ marginTop: 8 }}>
                  {t('home.systemLead')} {t(`live.n.${conclusion.kind}`)}
                </Txt>
                <View style={{ marginTop: 12, gap: 10 }}>
                  {['next.step1', 'next.step2', 'next.step3'].map((k, i) => (
                    <View key={k} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }} accessible accessibilityLabel={`${i + 1}. ${t(k)}`}>
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
                        <Txt v="bodyMedium" color="#fff">
                          {i + 1}
                        </Txt>
                      </View>
                      <Txt v="body" style={{ flex: 1 }}>
                        {t(k)}
                      </Txt>
                    </View>
                  ))}
                </View>
                <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 8 }}>
                  {t('follow.tellHint')}
                </Txt>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 16, padding: 12, marginTop: 14 }} accessible accessibilityLabel={t('next.youBring')}>
                  <Feather name="user" size={20} color={colors.teal} />
                  <Txt v="caption" style={{ flex: 1, fontFamily: fonts.semibold }}>
                    {t('next.youBring')}
                  </Txt>
                </View>
              </Glass>
            </FadeIn>
          )}

          <SectionTitle>{t('home.workers')}</SectionTitle>
          {CHW_DIRECTORY.length === 0 ? (
            <EmptyState icon="message-circle" title={t('follow.workersEmptyTitle')} text={t('follow.workersEmptyText')} />
          ) : (
            <View style={{ gap: 12 }}>
              {CHW_DIRECTORY.map((c) => {
                const latest = spotChecks[spotChecks.length - 1];
                const ev = coughEvents[coughEvents.length - 1];
                const scores = latest
                  ? { tb: latest.tb, other: latest.other, noise: latest.noise }
                  : ev
                    ? { tb: ev.tb ?? (ev.kind === 'tb' ? ev.conf : 0), other: ev.other ?? (ev.kind === 'other' ? ev.conf : 0), noise: ev.noise ?? 0 }
                    : null;
                return (
                  <Glass key={c.id}>
                    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                      <Avatar person={c} chw size={52} ring />
                      <View style={{ flex: 1 }}>
                        <Txt v="h3">{c.name}</Txt>
                        <Txt v="caption" color={colors.inkSoft}>
                          {t('role.chw')}
                        </Txt>
                      </View>
                    </View>
                    <Button
                      title={t('follow.sms')}
                      icon="message-circle"
                      variant="glass"
                      onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.id } })}
                      style={{ marginTop: 12 }}
                    />
                    <Button
                      title={t('sample.send', { name: c.name || CHW_USER.name })}
                      icon="upload"
                      onPress={() => {
                        if (!scores) return sendSample('');
                        sendSample(t('sample.chat', scores));
                      }}
                      style={{ marginTop: 10 }}
                    />
                    <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 8 }}>
                      {t('sample.note')}
                    </Txt>
                  </Glass>
                );
              })}
            </View>
          )}

          {/* 5. Alert status */}
          <SectionTitle>{t('follow.alertStatus')}</SectionTitle>
          {steps.length === 0 || status === 'empty' ? (
            <FadeIn delay={100}>
              <Glass>
                <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.normalBg, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="check-circle" size={28} color={colors.normalText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt v="h3">{t('follow.noneTitle')}</Txt>
                    <Txt v="body" color={colors.inkSoft}>
                      {t('follow.noneText')}
                    </Txt>
                  </View>
                </View>
              </Glass>
            </FadeIn>
          ) : (
            <FadeIn delay={100}>
              <Glass>
                {steps.map((s, i) => (
                  <View
                    key={i}
                    accessible
                    accessibilityLabel={`${s.title}. ${s.text}. ${s.done ? t('follow.done') : t('follow.waiting')}`}
                    style={{ flexDirection: 'row', gap: 14 }}
                  >
                    <View style={{ alignItems: 'center' }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: s.done ? colors.teal : 'rgba(255,255,255,0.7)',
                          borderWidth: s.done ? 0 : 2,
                          borderColor: colors.inkSoft,
                          borderStyle: 'dashed',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Feather name={s.done ? 'check' : s.icon} size={22} color={s.done ? '#fff' : colors.inkSoft} />
                      </View>
                      {i < steps.length - 1 && <View style={{ width: 3, flex: 1, minHeight: 18, backgroundColor: s.done ? colors.teal : 'rgba(14,59,69,0.25)' }} />}
                    </View>
                    <View style={{ flex: 1, paddingBottom: i < steps.length - 1 ? 16 : 0 }}>
                      <Txt v="bodyMedium" style={{ fontFamily: fonts.semibold }}>
                        {s.title}
                      </Txt>
                      <Txt v="caption" color={colors.inkSoft}>
                        {s.text}
                      </Txt>
                      <Txt v="caption" color={s.done ? colors.normalText : colors.watchText} style={{ fontFamily: fonts.semibold }}>
                        {s.done ? t('follow.done') : t('follow.waiting')}
                      </Txt>
                    </View>
                  </View>
                ))}
              </Glass>
            </FadeIn>
          )}

          <View style={{ marginTop: 16 }}>
            <Disclaimer />
          </View>
        </>
      )}
    </Screen>
  );
}
