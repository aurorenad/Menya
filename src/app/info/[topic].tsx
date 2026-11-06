import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Disclaimer, FadeIn, Glass, Header, IconName, Screen, Txt } from '@/components/ui';
import { colors } from '@/theme';
import { useStore } from '@/store';
import { useOpen } from '@/hooks';

function Privacy() {
  const { t, deleteLocalData, pending } = useStore();
  const [confirm, setConfirm] = useState(false);
  const items: { icon: IconName; k: string }[] = [
    { icon: 'cpu', k: 'a' },
    { icon: 'send', k: 'b' },
    { icon: 'eye', k: 'c' },
    { icon: 'smartphone', k: 'd' },
  ];
  return (
    <>
      <Header title={t('privacy.title')} subtitle={t('privacy.subtitle')} back />
      {items.map((it, i) => (
        <FadeIn key={it.k} delay={i * 90} style={{ marginBottom: 12 }}>
          <Glass>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={it.icon} size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Txt v="h3">{t(`privacy.${it.k}.title`)}</Txt>
                <Txt v="body" color={colors.inkSoft}>
                  {t(`privacy.${it.k}.text`)}
                </Txt>
              </View>
            </View>
          </Glass>
        </FadeIn>
      ))}
      <Txt v="caption" color={colors.inkSoft} style={{ marginBottom: 10 }}>
        {t('privacy.queue', { n: pending.length })}
      </Txt>
      {!confirm ? (
        <Button title={t('privacy.delete')} icon="trash-2" variant="glass" onPress={() => setConfirm(true)} />
      ) : (
        <Glass strong>
          <Txt v="h3">{t('privacy.confirmTitle')}</Txt>
          <Txt v="body" color={colors.inkSoft} style={{ marginVertical: 8 }}>
            {t('privacy.confirmText')}
          </Txt>
          <View style={{ gap: 10 }}>
            <Button
              title={t('privacy.confirmYes')}
              icon="trash-2"
              variant="danger"
              onPress={() => {
                deleteLocalData();
                router.replace('/');
              }}
            />
            <Button title={t('common.cancel')} variant="glass" onPress={() => setConfirm(false)} />
          </View>
        </Glass>
      )}
    </>
  );
}

function Help() {
  const { t } = useStore();
  const open = useOpen();
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const faqs = ['5', '6', '1', '2', '3', '4'];
  return (
    <>
      <Header title={t('help.title')} subtitle={t('help.subtitle')} back />
      {faqs.map((k, i) => {
        const on = openIdx === i;
        return (
          <FadeIn key={k} delay={i * 80} style={{ marginBottom: 12 }}>
            <Pressable
              onPress={() => setOpenIdx(on ? null : i)}
              accessibilityRole="button"
              accessibilityState={{ expanded: on }}
              accessibilityLabel={t(`help.q${k}`)}
            >
              <Glass strong={on}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 }}>
                  <Txt v="bodyMedium" style={{ flex: 1, fontFamily: 'Poppins_600SemiBold' }}>
                    {t(`help.q${k}`)}
                  </Txt>
                  <Feather name={on ? 'chevron-up' : 'chevron-down'} size={24} color={colors.ink} />
                </View>
                {on ? (
                  <Txt v="body" color={colors.inkSoft} style={{ marginTop: 8 }}>
                    {t(`help.a${k}`)}
                  </Txt>
                ) : null}
              </Glass>
            </Pressable>
          </FadeIn>
        );
      })}
      <View style={{ gap: 10, marginTop: 6 }}>
        <Button title={t('help.callLine')} icon="phone" variant="glass" onPress={() => open('tel:114')} />
      </View>
      <View style={{ marginTop: 16 }}>
        <Disclaimer />
      </View>
    </>
  );
}

export default function Info() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  return <Screen>{topic === 'help' ? <Help /> : <Privacy />}</Screen>;
}
