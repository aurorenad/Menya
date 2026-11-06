import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Avatar, EmptyState, FadeIn, Glass, Header, LangToggle, Pill, Screen, Txt } from '@/components/ui';
import { colors } from '@/theme';
import { useStore } from '@/store';
import { CHW_DIRECTORY, type ChatMessage } from '@/data/mock';
import { timeLabel } from '@/format';

type Thread = { thread: string; patientId: string; chwId: string; text: string; at: number; unread: boolean };

function threadsOf(chats: ChatMessage[], mine: 'patient' | 'chw'): Thread[] {
  const by = new Map<string, Thread>();
  for (const m of chats) {
    const [patientId, chwId] = m.thread.split(':');
    if (!patientId || !chwId) continue;
    const prev = by.get(m.thread);
    const unread = m.from !== mine && !m.seen;
    if (!prev || m.at >= prev.at) by.set(m.thread, { thread: m.thread, patientId, chwId, text: m.text, at: m.at, unread: (prev?.unread ?? false) || unread });
    else if (unread) prev.unread = true;
  }
  return [...by.values()].sort((a, b) => b.at - a.at);
}

export default function Messages() {
  const { t, role, patients, chats } = useStore();
  const mine = role === 'chw' ? 'chw' : 'patient';
  const inbox = React.useMemo(() => threadsOf(chats ?? [], mine), [chats, mine]);

  return (
    <Screen tabs>
      <Header title={t('tab.messages')} subtitle={t('messages.subtitle')} right={<LangToggle />} />
      {inbox.length === 0 ? (
        <EmptyState icon="message-circle" title={t('messages.emptyTitle')} text={t('messages.emptyText')} />
      ) : (
        <View style={{ gap: 12 }}>
          {inbox.map((msg, i) => {
            const person = role === 'chw' ? patients.find((x) => x.id === msg.patientId) : CHW_DIRECTORY.find((c) => c.id === msg.chwId);
            const name = person?.name || person?.phone || t(role === 'chw' ? 'role.patient' : 'role.chw');
            return (
              <FadeIn key={msg.thread} delay={Math.min(i, 6) * 70}>
                <Glass
                  padding={16}
                  onPress={() =>
                    router.push(
                      role === 'chw'
                        ? { pathname: '/chat/[id]', params: { id: msg.patientId, chw: msg.chwId } }
                        : { pathname: '/chat/[id]', params: { id: msg.chwId } },
                    )
                  }
                  label={`${name}. ${msg.text}`}
                >
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <Avatar person={person ?? { skin: '#A06B47', hair: '#241915', tone: '#D9ECD4' }} chw={role !== 'chw'} size={52} ring />
                    <View style={{ flex: 1 }}>
                      <Txt v="h3">{name}</Txt>
                      <Txt v="body" numberOfLines={2}>
                        {msg.text}
                      </Txt>
                      <Txt v="caption" color={colors.inkSoft}>
                        {timeLabel(new Date(msg.at))}
                      </Txt>
                    </View>
                    {msg.unread ? <Pill icon="message-circle" text={t('alerts.new')} tone="dark" /> : <Feather name="chevron-right" size={22} color={colors.ink} />}
                  </View>
                </Glass>
              </FadeIn>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
