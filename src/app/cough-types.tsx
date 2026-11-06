import React from 'react';
import { View } from 'react-native';
import { goBack } from '@/nav';
import { Feather } from '@expo/vector-icons';
import { Disclaimer, EmptyState, ErrorState, FadeIn, Glass, Header, LoadingState, Pill, Screen, Txt, useScreenState } from '@/components/ui';
import { colors } from '@/theme';
import { useStore } from '@/store';

const CONF_ICON = { high: 'check-circle', medium: 'minus-circle', low: 'help-circle' } as const;

export default function CoughTypes() {
  const { t, conclusion, coughEvents } = useStore();
  const { status, retry } = useScreenState();
  const heard = coughEvents.some((e) => e.src === 'device');
  const other = Math.max(0, conclusion.week.total - conclusion.week.tb);
  const rows = [
    { id: 'tb', icon: 'alert-circle' as const, count: conclusion.week.tb, label: t('live.kind.tb'), text: t('types.model.tb') },
    { id: 'other', icon: 'activity' as const, count: other, label: t('live.kind.other'), text: t('types.model.other') },
  ].filter((c) => c.count > 0);
  const weekTotal = conclusion.week.total;

  return (
    <Screen>
      <Header title={t('types.title')} subtitle={t('types.subtitle')} back />

      {status === 'loading' && <LoadingState blocks={[70, 190, 190, 190]} />}
      {status === 'error' && <ErrorState onRetry={retry} />}
      {(status === 'empty' || (status === 'ready' && !heard)) && <EmptyState icon="wind" title={t('types.emptyTitle')} text={t('types.emptyText')} action={{ title: t('common.back'), onPress: () => goBack('/home') }} />}

      {status === 'ready' && heard && (
        <>
          <FadeIn>
            <View
              accessible
              style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.ink, borderRadius: 18, padding: 14 }}
              accessibilityLabel={t('types.aiOnly') + '. ' + t('types.aiNote')}
            >
              <Feather name="cpu" size={24} color="#fff" />
              <View style={{ flex: 1 }}>
                <Txt v="bodyMedium" color="#fff" style={{ fontFamily: 'Poppins_600SemiBold' }}>
                  {t('types.aiOnly')}
                </Txt>
                <Txt v="caption" color="rgba(255,255,255,0.9)">
                  {t('types.aiNote')}
                </Txt>
              </View>
            </View>
          </FadeIn>

          {rows.map((c, i) => {
            const share = weekTotal ? c.count / weekTotal : 0;
            return (
              <FadeIn key={c.id} delay={100 + i * 110} style={{ marginTop: 14 }}>
                <Glass>
                  <View
                    accessible
                    accessibilityLabel={`${c.label}. ${c.text}. ${c.count} ${t('history.coughs')}. ${t('types.confidence')}: ${t(`types.conf.${conclusion.confidence}`)}. ${t('types.aiOnly')}`}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
                        <Feather name={c.icon} size={28} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt v="h2">{c.label}</Txt>
                        <Txt v="body" color={colors.inkSoft}>
                          {c.text}
                        </Txt>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 14 }}>
                      <Txt v="h1">{c.count}</Txt>
                      <Txt v="body" color={colors.inkSoft}>
                        {t('history.coughs')} · {Math.round(share * 100)}%
                      </Txt>
                    </View>
                    <View style={{ height: 12, borderRadius: 6, backgroundColor: 'rgba(14,59,69,0.18)', overflow: 'hidden', marginTop: 6 }}>
                      <View style={{ width: `${Math.round(share * 100)}%`, height: '100%', backgroundColor: colors.teal, borderRadius: 6 }} />
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                      <Pill icon={CONF_ICON[conclusion.confidence]} text={`${t('types.confidence')}: ${t(`types.conf.${conclusion.confidence}`)}`} tone="white" />
                      <Pill icon="cpu" text={t('types.aiOnly')} tone="dark" />
                    </View>
                  </View>
                </Glass>
              </FadeIn>
            );
          })}

          <View style={{ marginTop: 16 }}>
            <Disclaimer />
          </View>
        </>
      )}
    </Screen>
  );
}
