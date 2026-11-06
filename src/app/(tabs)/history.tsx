import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  CircleButton, Disclaimer, EmptyState, ErrorState, FadeIn, Glass, Header, LoadingState, Pill, Screen, SectionTitle,
  Segmented, StackedBars, Txt, useScreenState,
} from '@/components/ui';
import { colors } from '@/theme';
import { useStore } from '@/store';
import { dateLabel, dayShort, daysAgoDate, total } from '@/format';
import type { DayCount } from '@/data/mock';

type View_ = 'daily' | 'weekly';
type Range = 7 | 14;

export default function History() {
  const { t, me } = useStore();
  const { status, retry } = useScreenState();
  const [mode, setMode] = useState<View_>('daily');
  const [range, setRange] = useState<Range>(7);
  const [offset, setOffset] = useState(0);
  const [sel, setSel] = useState(-1);

  const series = me.series; // 30 days, newest last
  const hasCoughs = series.some((d) => d.day + d.night > 0);
  const N = series.length;

  const view = useMemo(() => {
    if (mode === 'weekly') {
      const data: DayCount[] = [];
      const labels: string[] = [];
      const titles: string[] = [];
      for (let w = 3; w >= 0; w--) {
        const slice = series.slice(N - 7 * (w + 1), N - 7 * w);
        data.push({ day: slice.reduce((a, d) => a + d.day, 0), night: slice.reduce((a, d) => a + d.night, 0) });
        labels.push(w === 0 ? t('history.thisWeek') : t('history.week', { n: 4 - w }));
        titles.push(`${dateLabel(t, daysAgoDate(7 * (w + 1) - 1))} – ${dateLabel(t, daysAgoDate(7 * w))}`);
      }
      return { data, labels, titles, span: 7, from: titles[0].split(' – ')[0], to: titles[3].split(' – ')[1] };
    }
    const end = N - range * offset;
    const start = Math.max(0, end - range);
    const data = series.slice(start, end);
    const labels = data.map((_, i) => {
      const d = daysAgoDate(N - 1 - (start + i));
      return range === 7 ? dayShort(t, d) : String(d.getDate());
    });
    const titles = data.map((_, i) => {
      const d = daysAgoDate(N - 1 - (start + i));
      return `${dayShort(t, d)}, ${dateLabel(t, d)}`;
    });
    return { data, labels, titles, span: 1, from: dateLabel(t, daysAgoDate(N - 1 - start)), to: dateLabel(t, daysAgoDate(N - end)) };
  }, [mode, range, offset, series, N, t]);

  const maxOffset = Math.ceil(N / range) - 1;
  useEffect(() => setSel(-1), [mode, range, offset]);
  const selected = sel === -1 ? view.data.length - 1 : sel;
  const cur = view.data[selected];
  const dayTotals = view.data.reduce((a, d) => a + d.day, 0);
  const nightTotals = view.data.reduce((a, d) => a + d.night, 0);
  const all = dayTotals + nightTotals;
  const nightPct = all ? Math.round((nightTotals / all) * 100) : 0;
  const perDay = Math.round(all / (view.data.length * view.span));
  const barW = mode === 'weekly' ? 44 : range === 7 ? 30 : 17;

  return (
    <Screen tabs>
      <Header title={t('history.title')} subtitle={t('history.subtitle')} />

      {status === 'loading' && <LoadingState blocks={[56, 260, 120]} />}
      {status === 'error' && <ErrorState onRetry={retry} />}
      {(status === 'empty' || (status === 'ready' && !hasCoughs)) && (
        <EmptyState
          icon="bar-chart-2"
          title={t('history.emptyTitle')}
          text={t('history.emptyText')}
          action={{ title: t('pair.search'), onPress: () => router.push({ pathname: '/pair-device', params: { from: 'settings' } }) }}
        />
      )}

      {status === 'ready' && hasCoughs && (
        <FadeIn>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'daily', label: t('history.daily'), icon: 'calendar' },
              { value: 'weekly', label: t('history.weekly'), icon: 'layers' },
            ]}
          />

          {mode === 'daily' && (
            <View style={{ marginTop: 12 }}>
              <Segmented
                value={String(range) as '7' | '14'}
                onChange={(v) => {
                  setRange(Number(v) as Range);
                  setOffset(0);
                }}
                options={[
                  { value: '7', label: t('history.days', { n: 7 }) },
                  { value: '14', label: t('history.days', { n: 14 }) },
                ]}
              />
            </View>
          )}

          <Glass style={{ marginTop: 14 }} padding={16}>
            {mode === 'daily' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <CircleButton icon="chevron-left" label={t('history.earlier')} size={48} onPress={() => setOffset(Math.min(offset + 1, maxOffset))} />
                <View accessible accessibilityLiveRegion="polite" accessibilityLabel={`${view.from} - ${view.to}`}>
                  <Txt v="bodyMedium" style={{ textAlign: 'center' }}>
                    {view.from} – {view.to}
                  </Txt>
                </View>
                <CircleButton icon="chevron-right" label={t('history.later')} size={48} onPress={() => setOffset(Math.max(offset - 1, 0))} />
              </View>
            )}
            {mode === 'weekly' && (
              <Txt v="bodyMedium" style={{ textAlign: 'center', marginBottom: 6 }}>
                {view.from} – {view.to}
              </Txt>
            )}
            <StackedBars data={view.data} labels={view.labels} selected={selected} onSelect={setSel} barWidth={barW} />
            <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <View style={{ width: 16, height: 16, borderRadius: 5, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.ink }} />
                <Feather name="sun" size={16} color={colors.ink} />
                <Txt v="caption">{t('history.day')}</Txt>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <View style={{ width: 16, height: 16, borderRadius: 5, backgroundColor: colors.ink }} />
                <Feather name="moon" size={16} color={colors.ink} />
                <Txt v="caption">{t('history.night')}</Txt>
              </View>
            </View>
          </Glass>

          <FadeIn delay={80}>
            <Glass strong style={{ marginTop: 14 }}>
              <View accessible accessibilityLiveRegion="polite" accessibilityLabel={`${view.titles[selected]}: ${total(cur)}`}>
                <Txt v="caption" color={colors.inkSoft}>
                  {view.titles[selected]}
                </Txt>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Txt v="display">{total(cur)}</Txt>
                  <Txt v="body" color={colors.inkSoft}>
                    {t('history.coughs')}
                  </Txt>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <Pill icon="sun" text={`${t('history.day')}: ${cur.day}`} tone="white" />
                  <Pill icon="moon" text={`${t('history.night')}: ${cur.night}`} tone="dark" />
                </View>
              </View>
            </Glass>
          </FadeIn>

          <SectionTitle>{t('history.nightVsDay')}</SectionTitle>
          <Glass>
            <View
              accessible
              accessibilityLabel={`${t('history.day')} ${100 - nightPct}%, ${t('history.night')} ${nightPct}%`}
              style={{ gap: 12 }}
            >
              <View style={{ flexDirection: 'row', height: 22, borderRadius: 11, overflow: 'hidden', borderWidth: 1, borderColor: colors.ink }}>
                <View style={{ flex: Math.max(dayTotals, 1), backgroundColor: '#fff' }} />
                <View style={{ flex: Math.max(nightTotals, 1), backgroundColor: colors.ink }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Feather name="sun" size={20} color={colors.ink} />
                  <Txt v="bodyMedium">
                    {100 - nightPct}% · {dayTotals}
                  </Txt>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Feather name="moon" size={20} color={colors.ink} />
                  <Txt v="bodyMedium">
                    {nightPct}% · {nightTotals}
                  </Txt>
                </View>
              </View>
              <Txt v="body" color={colors.inkSoft}>
                {nightPct >= 45 ? t('history.nightHeavy') : t('history.dayHeavy')}
              </Txt>
            </View>
          </Glass>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
            <Glass style={{ flex: 1 }} padding={16}>
              <Feather name="activity" size={22} color={colors.teal} />
              <Txt v="h2" style={{ marginTop: 6 }}>
                {perDay}
              </Txt>
              <Txt v="caption" color={colors.inkSoft}>
                {t('history.avg')}
              </Txt>
            </Glass>
            <Glass style={{ flex: 1 }} padding={16}>
              <Feather name="trending-up" size={22} color={colors.teal} />
              <Txt v="h2" style={{ marginTop: 6 }}>
                {Math.max(...view.data.map(total))}
              </Txt>
              <Txt v="caption" color={colors.inkSoft}>
                {mode === 'weekly' ? t('history.busiestWeek') : t('history.busiest')}
              </Txt>
            </Glass>
          </View>

          <View style={{ marginTop: 14 }}>
            <Disclaimer />
          </View>
        </FadeIn>
      )}
    </Screen>
  );
}
