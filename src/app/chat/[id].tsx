// A chat the person writes themselves. Nothing is sent until they press Send.
// Menya does not contact a health worker on its own, and it does not attach a sample or a result.
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Header, Screen, Txt } from '@/components/ui';
import { colors, fonts } from '@/theme';
import { useStore } from '@/store';
import { CHW_DIRECTORY, CHW_USER } from '@/data/mock';
import { timeLabel } from '@/format';

export default function Chat() {
  const { id, chw } = useLocalSearchParams<{ id: string; chw?: string }>();
  const { t, role, me, patients, chats, sendChat, markChatSeen } = useStore();
  const [draft, setDraft] = useState('');
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const other = role === 'chw' ? patients.find((p) => p.id === id) : CHW_DIRECTORY.find((c) => c.id === id);
  const thread = role === 'chw' ? `${id}:${chw || CHW_USER.id}` : `${me.id}:${id}`;
  const mine = role === 'chw' ? 'chw' : 'patient';
  const messages = (chats ?? []).filter((m) => m.thread === thread);

  useEffect(() => {
    if (other) markChatSeen(thread, mine);
  }, [other, thread, mine, messages.length, markChatSeen]);

  useEffect(() => {
    const id = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages.length]);

  const otherName = !other ? '' : other.name || (role === 'chw' ? t('role.patient') : t('role.chw'));

  if (!other) {
    return (
      <Screen>
        <Header title={t('chat.missing')} back />
      </Screen>
    );
  }

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    sendChat(thread, mine, text);
    setDraft('');
  };

  const suggest = () => {
    setDraft(t('follow.tellBody', { chw: otherName, name: me.name || t('home.you'), n: me.monitorDay }));
  };

  return (
    <Screen scroll={false} contentStyle={{ paddingBottom: 12 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header title={otherName} subtitle={t('chat.subtitle')} back />
        <ScrollView
          ref={scroller}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 12, gap: 8 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 18, padding: 16 }}>
              <Txt v="body">{t('chat.empty')}</Txt>
              {role !== 'chw' ? (
                <Pressable
                  onPress={suggest}
                  accessibilityRole="button"
                  accessibilityLabel={t('chat.suggest')}
                  style={{ marginTop: 12, minHeight: 48, justifyContent: 'center' }}
                >
                  <Txt v="bodyMedium" color={colors.teal} style={{ fontFamily: fonts.semibold }}>
                    {t('chat.suggest')}
                  </Txt>
                </Pressable>
              ) : null}
            </View>
          ) : (
            messages.map((m) => {
              const own = m.from === mine;
              return (
                <View key={m.id} style={{ alignItems: own ? 'flex-end' : 'flex-start' }}>
                  <View
                    accessible
                    accessibilityLabel={`${own ? t('chat.you') : otherName}. ${m.text}. ${timeLabel(new Date(m.at))}`}
                    style={{
                      maxWidth: '82%',
                      backgroundColor: own ? colors.teal : '#fff',
                      borderRadius: 18,
                      borderBottomRightRadius: own ? 6 : 18,
                      borderBottomLeftRadius: own ? 18 : 6,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Txt v="body" color={own ? '#fff' : colors.ink}>
                      {m.text}
                    </Txt>
                    <Txt v="caption" color={own ? 'rgba(255,255,255,0.85)' : colors.inkSoft} style={{ marginTop: 4 }}>
                      {timeLabel(new Date(m.at))}
                    </Txt>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('chat.placeholder')}
            placeholderTextColor="#5B7F88"
            accessibilityLabel={t('chat.placeholder')}
            multiline
            style={{
              flex: 1,
              minHeight: 48,
              maxHeight: 120,
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontFamily: fonts.medium,
              fontSize: 16,
              color: colors.ink,
            }}
          />
          <Pressable
            onPress={send}
            accessibilityRole="button"
            accessibilityLabel={t('chat.send')}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: draft.trim() ? colors.teal : 'rgba(14,59,69,0.25)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="send" size={20} color="#fff" />
          </Pressable>
        </View>
        <Txt v="caption" color={colors.inkSoft} style={{ marginTop: 8 }}>
          {t('chat.note')}
        </Txt>
      </KeyboardAvoidingView>
    </Screen>
  );
}
