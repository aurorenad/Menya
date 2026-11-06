import React, { useState } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  Avatar, BarChart, Button, CircleButton, Disclaimer, Field, Gauge, Glass, Header, LangToggle, Pill, Screen, SectionTitle,
  Segmented, StatusChip, Switch, Txt, TrendChart,
} from '@/components/ui';
import { colors, fonts, type } from '@/theme';
import { useStore } from '@/store';
import { CHW_USER } from '@/data/mock';
import { LinearGradient } from 'expo-linear-gradient';

const SWATCHES: { name: string; hex: string; use: string; fg?: string }[] = [
  { name: 'Gradient top', hex: colors.gradientTop, use: 'Backgrounds' },
  { name: 'Gradient bottom', hex: colors.gradientBottom, use: 'Backgrounds' },
  { name: 'Deep teal', hex: colors.teal, use: 'Buttons, active tab', fg: '#fff' },
  { name: 'Ink', hex: colors.ink, use: 'Headings, body text', fg: '#fff' },
  { name: 'Ink soft', hex: colors.inkSoft, use: 'Secondary text', fg: '#fff' },
  { name: 'Normal', hex: colors.normal, use: 'Status: normal', fg: '#fff' },
  { name: 'Watch', hex: colors.watch, use: 'Status: watch' },
  { name: 'Follow-up', hex: colors.alert, use: 'Status: follow-up', fg: '#fff' },
];

export default function DesignSystem() {
  const { t } = useStore();
  const [seg, setSeg] = useState<'a' | 'b'>('a');
  const [sw, setSw] = useState(true);
  const person = { skin: '#A06B47', hair: '#241915', tone: '#D9ECD4' };

  return (
    <Screen>
      <Header title={t('ds.title')} subtitle={t('ds.subtitle')} back />

      <SectionTitle>Colors</SectionTitle>
      <LinearGradient colors={[colors.gradientTop, colors.gradientBottom]} style={{ height: 70, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
        <Txt v="bodyMedium">#5FA8B5 → #8CC3CE</Txt>
      </LinearGradient>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
        {SWATCHES.map((s) => (
          <View key={s.name} style={{ width: '48%', borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.5)' }} accessible accessibilityLabel={`${s.name} ${s.hex}. ${s.use}`}>
            <View style={{ height: 52, backgroundColor: s.hex, padding: 8 }}>
              <Txt v="caption" color={s.fg ?? colors.ink}>
                {s.hex}
              </Txt>
            </View>
            <View style={{ padding: 8 }}>
              <Txt v="caption" style={{ fontFamily: fonts.semibold }}>
                {s.name}
              </Txt>
              <Txt v="caption" color={colors.inkSoft} style={{ fontSize: 13 }}>
                {s.use}
              </Txt>
            </View>
          </View>
        ))}
      </View>
      <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 8 }}>
        Text on the gradient uses Ink (#0E3B45, 4.5:1 or more). White text is only used on deep teal or ink. Status colours always come with an icon and a word.
      </Txt>

      <SectionTitle>Typography · Poppins</SectionTitle>
      <Glass>
        {(
          [
            ['display', 'Display 32', 'Your Cough Companion'],
            ['h1', 'Heading 1 · 28', 'Today'],
            ['h2', 'Heading 2 · 22', 'Last 7 days'],
            ['h3', 'Heading 3 · 18', 'Cough types'],
            ['body', 'Body · 16', 'Early follow-up, closer to home'],
            ['caption', 'Caption · 14', 'Last synced: 6 min ago'],
          ] as const
        ).map(([k, label, sample]) => (
          <View key={k} style={{ marginBottom: 10 }}>
            <Txt v="caption" color={colors.inkSoft}>
              {label} · {type[k].fontSize}/{type[k].lineHeight}
            </Txt>
            <Txt v={k}>{sample}</Txt>
          </View>
        ))}
      </Glass>

      <SectionTitle>Buttons</SectionTitle>
      <View style={{ gap: 10 }}>
        <Button title="Primary" icon="check" onPress={() => {}} />
        <Button title="Glass" icon="phone" variant="glass" onPress={() => {}} />
        <Button title="Light" icon="arrow-right" variant="light" onPress={() => {}} />
        <Button title="Danger" icon="trash-2" variant="danger" onPress={() => {}} />
        <Button title="Disabled" onPress={() => {}} disabled />
      </View>
      <View style={{ flexDirection: 'row', gap: 20, marginTop: 14, justifyContent: 'center' }}>
        <CircleButton icon="phone-call" label="Call" caption="Call" dark onPress={() => {}} />
        <CircleButton icon="message-circle" label="Message" caption="Message" onPress={() => {}} />
        <CircleButton icon="bell" label="Alerts" caption="Alerts" onPress={() => {}} />
      </View>
      <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 8 }}>
        Minimum tap target 48 px. Buttons are 56 px high.
      </Txt>

      <SectionTitle>Status chips</SectionTitle>
      <View style={{ gap: 10 }}>
        <StatusChip status="normal" large />
        <StatusChip status="watch" large />
        <StatusChip status="followup" large />
      </View>

      <SectionTitle>Glass card</SectionTitle>
      <Glass>
        <Txt v="h3">Frosted glass</Txt>
        <Txt v="body" color={colors.inkSoft}>
          White at 26% over a blur, 24 px corners, soft shadow, 1 px white border.
        </Txt>
      </Glass>

      <SectionTitle>Avatars</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <Avatar person={person} size={72} ring />
        <Avatar person={CHW_USER} chw size={72} ring />
        <Avatar person={person} size={48} />
        <Pill icon="user" text="Patient" tone="white" />
      </View>

      <SectionTitle>Data</SectionTitle>
      <View style={{ alignItems: 'center' }}>
        <Gauge value={34} status="watch" size={180} label={t('home.coughsToday')} />
      </View>
      <Glass style={{ marginTop: 12 }}>
        <BarChart values={[12, 18, 22, 15, 30, 28, 34]} labels={['M', 'T', 'W', 'T', 'F', 'S', 'S']} a11y="Example bar chart" />
      </Glass>
      <Glass style={{ marginTop: 12 }} padding={12}>
        <TrendChart values={[10, 12, 11, 14, 20, 28, 34, 40, 46, 52, 58]} usual={16} usualLabel="Usual" startLabel="1 Oct" endLabel="Today" />
      </Glass>

      <SectionTitle>Controls</SectionTitle>
      <Glass>
        <View style={{ gap: 14 }}>
          <Field label="Phone number" prefix="+250" icon="phone" placeholder="78X XXX XXX" keyboardType="phone-pad" />
          <Segmented value={seg} onChange={setSeg} options={[{ value: 'a', label: 'Daily', icon: 'calendar' }, { value: 'b', label: 'Weekly', icon: 'layers' }]} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Txt v="bodyMedium">Switch</Txt>
            <Switch value={sw} onChange={setSw} label="Example switch" />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Txt v="bodyMedium">Language toggle</Txt>
            <LangToggle />
          </View>
        </View>
      </Glass>

      <SectionTitle>Bottom tab bar</SectionTitle>
      <Glass padding={6}>
        <View style={{ flexDirection: 'row' }}>
          {(['home', 'bar-chart-2', 'heart', 'settings'] as const).map((ic, i) => (
            <View key={ic} style={{ flex: 1, minHeight: 60, borderRadius: 26, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: i === 0 ? colors.teal : 'transparent' }}>
              <Feather name={ic} size={23} color={i === 0 ? '#fff' : colors.ink} />
              <Txt v="caption" color={i === 0 ? '#fff' : colors.ink} style={{ fontSize: 12.5 }}>
                {['Home', 'History', 'Follow-up', 'Settings'][i]}
              </Txt>
            </View>
          ))}
        </View>
      </Glass>

      <SectionTitle>Required message</SectionTitle>
      <Disclaimer />

      <SectionTitle>Accessibility rules</SectionTitle>
      <Glass>
        {[
          'Body text 16 px or larger, system font scaling stays on',
          'Every icon has a text label or screen-reader label',
          'Colour is never the only signal: status = colour + icon + word',
          'Tap targets 48 px or larger, one main action per screen',
          'Key information is at most 3 taps from the tab bar',
        ].map((r) => (
          <View key={r} style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
            <Feather name="check-circle" size={20} color={colors.normalText} />
            <Txt v="body" style={{ flex: 1 }}>
              {r}
            </Txt>
          </View>
        ))}
      </Glass>
    </Screen>
  );
}
