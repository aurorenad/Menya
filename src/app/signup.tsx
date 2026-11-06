import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { goBack } from '@/nav';
import { Feather } from '@expo/vector-icons';
import { Avatar, Button, FadeIn, Field, Glass, Header, LangToggle, Screen, Txt } from '@/components/ui';
import { colors, fonts } from '@/theme';
import { useStore, Role } from '@/store';
import { CHW_USER } from '@/data/mock';

type Step = 'role' | 'phone' | 'code';

const PATIENT_FACE = { skin: '#A06B47', hair: '#241915', tone: '#D9ECD4' };

function formatPhone(d: string) {
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(' ');
}

export default function SignUp() {
  const { t, update, isOnline, enterDemo } = useStore();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<Role>('patient');
  const [digits, setDigits] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const sendCode = () => {
    const clean = digits.replace(/\D/g, '');
    if (clean.length !== 9 || !clean.startsWith('7')) {
      setError(t('signup.phoneError'));
      return;
    }
    if (!isOnline) {
      setError(t('signup.offlineError'));
      return;
    }
    setError(null);
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStep('code');
      setWait(30);
    }, 900);
  };

  const verify = () => {
    if (code.length < 4) {
      setError(t('signup.codeError'));
      return;
    }
    setError(null);
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const local = digits.replace(/\D/g, '');
      const christian = local === '781940884';
      update({
        role,
        phone: '+250' + local,
        signedIn: true,
        consented: true,
        displayName: christian ? 'Christian' : '',
        ...(role === 'patient' ? { patientName: christian ? 'Christian' : '', patientPhone: '+250' + local } : {}),
      });
      router.replace(role === 'chw' ? '/patients' : '/pair-device');
    }, 900);
  };

  const back = () => {
    setError(null);
    if (step === 'code') setStep('phone');
    else if (step === 'phone') setStep('role');
    else goBack('/');
  };

  const title = step === 'role' ? t('signup.title') : step === 'phone' ? t('signup.phoneTitle') : t('signup.codeTitle');
  const subtitle = step === 'role' ? t('signup.subtitle') : step === 'phone' ? t('signup.phoneSub') : t('signup.codeSub', { phone: '+250 ' + formatPhone(digits) });

  return (
    <Screen>
      <Header title={title} subtitle={subtitle} back={back} right={<LangToggle />} />

      {step === 'role' && (
        <FadeIn>
          <View style={{ gap: 14 }}>
            {(
              [
                { r: 'patient' as Role, face: PATIENT_FACE, chw: false, title: 'role.patient', text: 'role.patientText' },
                { r: 'chw' as Role, face: CHW_USER, chw: true, title: 'role.chw', text: 'role.chwText' },
              ] as const
            ).map((o) => {
              const on = role === o.r;
              return (
                <Pressable
                  key={o.r}
                  onPress={() => setRole(o.r)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${t(o.title)}. ${t(o.text)}`}
                >
                  <Glass strong={on} style={{ borderWidth: 3, borderColor: on ? colors.teal : colors.glassBorder }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      <Avatar person={o.face} chw={o.chw} size={72} ring />
                      <View style={{ flex: 1 }}>
                        <Txt v="h3">{t(o.title)}</Txt>
                        <Txt v="body" color={colors.inkSoft}>
                          {t(o.text)}
                        </Txt>
                      </View>
                      <View
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          borderWidth: 3,
                          borderColor: colors.teal,
                          backgroundColor: on ? colors.teal : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {on ? <Feather name="check" size={18} color="#fff" /> : null}
                      </View>
                    </View>
                  </Glass>
                </Pressable>
              );
            })}
          </View>
          <Button title={t('common.continue')} icon="arrow-right" onPress={() => setStep('phone')} style={{ marginTop: 22 }} />
          <Txt v="h3" style={{ marginTop: 28 }}>
            {t('demo.accounts')}
          </Txt>
          <View style={{ gap: 12, marginTop: 12 }}>
            <Glass onPress={() => { enterDemo('christian'); router.replace('/home'); }} label={`${t('demo.christian')}. ${t('demo.patientLine')}`}>
              <Txt v="h3">{t('demo.christian')}</Txt>
              <Txt v="caption" color={colors.inkSoft}>
                {t('demo.patientLine')}
              </Txt>
            </Glass>
            <Glass onPress={() => { enterDemo('temana'); router.replace('/patients'); }} label={`${t('demo.temana')}. ${t('demo.chwLine')}`}>
              <Txt v="h3">{t('demo.temana')}</Txt>
              <Txt v="caption" color={colors.inkSoft}>
                {t('demo.chwLine')}
              </Txt>
            </Glass>
          </View>
        </FadeIn>
      )}

      {step === 'phone' && (
        <FadeIn>
          <Glass>
            <Field
              label={t('signup.phone')}
              prefix="+250"
              icon="phone"
              keyboardType="phone-pad"
              placeholder="78X XXX XXX"
              value={formatPhone(digits.replace(/\D/g, ''))}
              onChangeText={(v) => {
                setDigits(v.replace(/\D/g, '').slice(0, 9));
                setError(null);
              }}
              error={error}
              maxLength={11}
              autoFocus
            />
            <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 12 }}>
              {t('signup.noPassword')}
            </Txt>
          </Glass>
          <Button title={t('signup.sendCode')} icon="message-square" loading={busy} onPress={sendCode} style={{ marginTop: 22 }} />
        </FadeIn>
      )}

      {step === 'code' && (
        <FadeIn>
          <Glass>
            <Field
              label={t('signup.code')}
              icon="lock"
              keyboardType="number-pad"
              placeholder="• • • •"
              value={code}
              onChangeText={(v) => {
                setCode(v.replace(/\D/g, '').slice(0, 4));
                setError(null);
              }}
              error={error}
              maxLength={4}
              style={{ letterSpacing: 10, fontFamily: fonts.bold, fontSize: 24 }}
              autoFocus
            />
            <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 12 }}>
              {t('signup.demoHint')}
            </Txt>
          </Glass>
          <Button title={t('signup.verify')} icon="check" loading={busy} onPress={verify} style={{ marginTop: 22 }} />
          <Button
            title={wait > 0 ? t('signup.resendIn', { s: wait }) : t('signup.resend')}
            variant="glass"
            disabled={wait > 0}
            onPress={() => setWait(30)}
            style={{ marginTop: 12 }}
          />
        </FadeIn>
      )}
    </Screen>
  );
}
