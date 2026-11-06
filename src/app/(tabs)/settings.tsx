import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Button, FadeIn, Glass, Header, Row, Screen, SectionTitle, Segmented, Switch, Txt } from '@/components/ui';
import { colors } from '@/theme';
import { CHW_USER } from '@/data/mock';
import { useStore } from '@/store';

export default function Settings() {
  const { t, role, me, phone, lang, update, notifications, deviceName, listening, signOut, enterDemo } = useStore();
  const isChw = role === 'chw';
  const person = isChw ? { ...CHW_USER, name: CHW_USER.name || t('role.chw'), phone: phone || CHW_USER.phone } : me;
  const setNotif = (k: 'inApp' | 'sms' | 'daily', v: boolean) => update({ notifications: { ...notifications, [k]: v } });
  const phoneShown = phone ? phone.replace(/^\+250/, '+250 ').replace(/(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3') : '';

  return (
    <Screen tabs>
      <Header title={t('settings.title')} />

      <FadeIn>
        <Glass strong>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Avatar person={person} chw={isChw} size={68} ring />
            <View style={{ flex: 1 }}>
              <Txt v="h3">{person.name || (isChw ? t('role.chw') : phoneShown || t('role.patient'))}</Txt>
              <Txt v="caption" color={colors.inkSoft}>
                {isChw ? t('role.chw') : t('role.patient')}
              </Txt>
              <Txt v="caption" color={colors.inkSoft}>
                {phoneShown}
              </Txt>
            </View>
          </View>
        </Glass>
      </FadeIn>

      <FadeIn delay={40}>
        <Glass style={{ marginTop: 14 }}>
          <Txt v="h3">{isChw ? t('role.switchToPatient') : t('role.switchToChw')}</Txt>
          <Txt v="body" color={colors.inkSoft} style={{ marginTop: 6 }}>
            {t('role.switchHint')}
          </Txt>
          <Button
            title={isChw ? t('role.switchToPatient') : t('role.switchToChw')}
            icon={isChw ? 'user' : 'users'}
            onPress={() => {
              const next = isChw ? 'christian' : 'temana';
              enterDemo(next);
              router.replace(next === 'temana' ? '/patients' : '/home');
            }}
            style={{ marginTop: 14 }}
          />
        </Glass>
      </FadeIn>

      <SectionTitle>{t('settings.language')}</SectionTitle>
      <Segmented
        value={lang}
        onChange={(l) => update({ lang: l })}
        options={[
          { value: 'en', label: 'English', icon: 'globe' },
          { value: 'rw', label: 'Kinyarwanda', icon: 'globe' },
        ]}
      />

      {!isChw && (
        <>
          <SectionTitle>{t('listen.setting')}</SectionTitle>
          <Glass padding={16}>
            <Row
              icon="radio"
              title={t('listen.setting')}
              subtitle={deviceName ? t('listen.settingSub') : t('listen.noDevice')}
              last
              right={<Switch value={listening && !!deviceName} onChange={(v) => update({ listening: v })} label={t('listen.setting')} />}
            />
          </Glass>
        </>
      )}

      <SectionTitle>{t('settings.notifications')}</SectionTitle>
      <Glass padding={16}>
        <Row icon="bell" title={t('settings.inApp')} right={<Switch value={notifications.inApp} onChange={(v) => setNotif('inApp', v)} label={t('settings.inApp')} />} />
        <Row icon="message-square" title={isChw ? t('settings.smsChw') : t('settings.smsPatient')} right={<Switch value={notifications.sms} onChange={(v) => setNotif('sms', v)} label={t('settings.smsChw')} />} />
        <Row icon="sunrise" title={t('settings.daily')} last right={<Switch value={notifications.daily} onChange={(v) => setNotif('daily', v)} label={t('settings.daily')} />} />
      </Glass>

      <SectionTitle>{t('settings.more')}</SectionTitle>
      <Glass padding={16}>
        {!isChw && (
          <Row
            icon="bluetooth"
            title={t('settings.device')}
            subtitle={deviceName ? deviceName : t('home.noDevice')}
            onPress={() => router.push({ pathname: '/pair-device', params: { from: 'settings' } })}
          />
        )}
        <Row icon="shield" title={t('settings.privacy')} subtitle={t('settings.privacySub')} onPress={() => router.push('/info/privacy')} />
        <Row icon="help-circle" title={t('settings.help')} subtitle={t('settings.helpSub')} onPress={() => router.push('/info/help')} />
        <Row icon="layers" title={t('ds.title')} last onPress={() => router.push('/design-system')} />
      </Glass>

      <Button
        title={t('settings.signOut')}
        icon="log-out"
        variant="glass"
        onPress={() => {
          signOut();
          router.replace('/');
        }}
        style={{ marginTop: 22 }}
      />
      <Txt v="caption" color={colors.inkSoft} style={{ textAlign: 'center', marginTop: 14 }}>
        Menya v1.0 · {t('disclaimer')}
      </Txt>
    </Screen>
  );
}
