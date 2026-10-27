import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatHeader, type ChatTab } from '@/components/chat/ChatHeader';
import { Composer } from '@/components/chat/Composer';
import { EmptyChat } from '@/components/chat/EmptyChat';
import { NoTrip } from '@/components/trip/NoTrip';
import { Chip } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { tap } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import { answerLocally, askClaude, type AssistantContext } from '@/services/assistant';
import { friendReply, planFriendReply } from '@/services/pretendFriends';
import { getApiKey } from '@/services/secrets';
import { useSyncStatus } from '@/sync/status';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import type { ChatMessage, Trip } from '@/store/types';
import { MAX_WIDTH, colors } from '@/theme';

const QUICK = ['chat.q.budget', 'chat.q.food', 'chat.q.weather', 'chat.q.next'];

const inAiThread = (m: ChatMessage) => m.channel === 'ai' || m.ai === true;

export default function Chat() {
  const trip = useActiveTrip();
  if (!trip) return <NoTrip />;
  return <ChatInner key={trip.id} />;
}

function ChatInner() {
  const t = useT();
  const trip = useActiveTrip()!;
  const insets = useSafeAreaInsets();
  const userId = useAppStore((s) => s.session?.userId ?? '');
  const send = useAppStore((s) => s.sendMessage);
  const aiMode = useAppStore((s) => s.settings.aiMode);
  const markKindRead = useAppStore((s) => s.markKindRead);
  const synced = useSyncStatus((s) => s.shared.includes(trip.id)); // real friends are on the other end: no pretend replies
  const [text, setText] = useState('');
  const [tab, setTab] = useState<ChatTab>('crew');
  const [typing, setTyping] = useState<string | null>(null);
  const list = useRef<FlatList<ChatMessage>>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useFocusEffect(
    useCallback(() => {
      markKindRead('chat');
    }, [markKindRead]),
  );
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  const askAssistant = async (question: string, history: ChatMessage[]) => {
    setTyping('assistant');
    const s = useAppStore.getState();
    const live = s.trips.find((x) => x.id === trip.id) as Trip;
    const ctx: AssistantContext = { trip: live, userId, weather: s.weather[live.destinationId], rates: s.rates, homeCurrency: s.settings.homeCurrency };
    let reply = '';
    let source: 'local' | 'claude' = 'local';
    if (aiMode === 'claude') {
      const key = await getApiKey();
      if (key) {
        try {
          reply = await askClaude(key, question, history, ctx);
          source = 'claude';
        } catch {
          toast('Claude is unavailable — answered offline instead', { tone: 'warn', icon: 'cloud-offline-outline' });
        }
      }
    }
    if (!reply) {
      await new Promise((r) => setTimeout(r, 650));
      reply = answerLocally(question, ctx);
    }
    setTyping(null);
    send(trip.id, { authorId: 'assistant', ai: true, aiSource: source, channel: 'ai', text: reply });
    tap();
  };

  const submit = (raw?: string) => {
    const msg = (raw ?? text).trim();
    if (!msg) return;
    if (msg.length > 1000) return toast('Messages can be up to 1000 characters', { tone: 'warn' });
    setText('');
    if (tab === 'ai') {
      send(trip.id, { authorId: userId, text: msg, channel: 'ai' });
      askAssistant(msg, trip.messages.filter(inAiThread));
      return;
    }
    send(trip.id, { authorId: userId, text: msg });
    const plan = synced ? null : planFriendReply(trip.members.filter((m) => m.id !== userId && !m.invited));
    if (plan) {
      later(() => setTyping(plan.friend.id), 900);
      later(() => {
        setTyping(null);
        send(trip.id, { authorId: plan.friend.id, text: friendReply(msg) });
      }, plan.delay);
    }
  };

  const isAi = tab === 'ai';
  const data = trip.messages.filter((m) => inAiThread(m) === isAi);
  const typingFor = typing === 'assistant' ? (isAi ? 'Scout AI' : null) : isAi ? null : typing ? trip.members.find((m) => m.id === typing)?.name.split(' ')[0] : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.column}>
        <ChatHeader trip={trip} tab={tab} onTab={setTab} synced={synced} aiMode={aiMode} />

        <FlatList
          key={tab}
          ref={list}
          data={data}
          keyExtractor={(m) => m.id}
          renderItem={({ item, index }) => <ChatBubble item={item} prev={data[index - 1]} next={data[index + 1]} trip={trip} userId={userId} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16, flexGrow: 1 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          onLayout={() => list.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<EmptyChat ai={isAi} onSay={isAi ? undefined : submit} />}
          ListFooterComponent={
            typingFor ? (
              <View style={styles.typing}>
                <T variant="kicker" color={colors.textMuted}>
                  {t('chat.typing', { name: typingFor })}
                </T>
              </View>
            ) : null
          }
        />

        {isAi ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 10 }} style={{ flexGrow: 0 }}>
            {QUICK.map((k) => (
              <Chip key={k} small label={t(k)} onPress={() => submit(t(k))} />
            ))}
            <Chip small label="Who owes who?" onPress={() => submit('Who owes who?')} />
            <Chip small label="Convert 50 USD" onPress={() => submit('Convert 50 USD')} />
          </ScrollView>
        ) : null}

        <Composer value={text} onChange={setText} onSend={() => submit()} placeholder={isAi ? 'Ask Scout anything…' : 'Message the crew…'} />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH },
  typing: { paddingLeft: 38, paddingTop: 12 },
});
