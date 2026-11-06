import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, FadeIn, Glass, Header, IconName, LangToggle, Screen, Txt } from '@/components/ui';
import { colors } from '@/theme';
import { useStore } from '@/store';

const POINTS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'mic-off', title: 'consent.p1.title', text: 'consent.p1.text' },
  { icon: 'send', title: 'consent.p2.title', text: 'consent.p2.text' },
  { icon: 'user-check', title: 'consent.p3.title', text: 'consent.p3.text' },
];

export default function Consent() {
  const { t, update, consented } = useStore();
  const [agree, setAgree] = useState(consented);
  const [showError, setShowError] = useState(false);

  const next = () => {
    if (!agree) {
      setShowError(true);
      return;
    }
    update({ consented: true });
    router.push('/signup');
  };

  return (
    <Screen>
      <Header title={t('consent.title')} subtitle={t('consent.subtitle')} back right={<LangToggle />} />

      {POINTS.map((p, i) => (
        <FadeIn key={p.title} delay={i * 120} style={{ marginBottom: 12 }}>
          <Glass>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={p.icon} size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Txt v="h3">{t(p.title)}</Txt>
                <Txt v="body" color={colors.inkSoft} style={{ marginTop: 2 }}>
                  {t(p.text)}
                </Txt>
              </View>
            </View>
          </Glass>
        </FadeIn>
      ))}

      <Pressable
        onPress={() => router.push('/info/privacy')}
        accessibilityRole="link"
        style={{ minHeight: 48, justifyContent: 'center', marginBottom: 6 }}
      >
        <Txt v="bodyMedium" color={colors.ink} style={{ textDecorationLine: 'underline' }}>
          {t('consent.more')}
        </Txt>
      </Pressable>

      <Pressable
        onPress={() => {
          setAgree(!agree);
          setShowError(false);
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agree }}
        accessibilityLabel={t('consent.agree')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingVertical: 8 }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            borderWidth: 3,
            borderColor: showError && !agree ? colors.danger : colors.teal,
            backgroundColor: agree ? colors.teal : 'rgba(255,255,255,0.85)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {agree ? <Feather name="check" size={24} color="#fff" /> : null}
        </View>
        <Txt v="bodyMedium" style={{ flex: 1 }}>
          {t('consent.agree')}
        </Txt>
      </Pressable>

      {showError && !agree ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 }} accessibilityLiveRegion="polite">
          <Feather name="alert-circle" size={18} color={colors.alertText} />
          <Txt v="caption" color={colors.alertText} style={{ flex: 1 }}>
            {t('consent.required')}
          </Txt>
        </View>
      ) : null}

      <Button title={t('common.continue')} icon="arrow-right" onPress={next} style={{ marginTop: 6, opacity: agree ? 1 : 0.7 }} />
      <Txt v="caption" color={colors.inkSoft} style={{ textAlign: 'center', marginTop: 14 }}>
        {t('consent.footer')}
      </Txt>
    </Screen>
  );
}
