import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NoTrip } from '@/components/trip/NoTrip';
import { Card, Chip, IconButton } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Press, tap } from '@/components/ui/Press';
import { Segmented } from '@/components/ui/Segmented';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import { answerLocally, askClaude, type AssistantContext } from '@/services/assistant';
import { getApiKey } from '@/services/secrets';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import type { ChatMessage, Trip } from '@/store/types';
import { MAX_WIDTH, colors, fonts, shadow } from '@/theme';

const QUICK = ['chat.q.budget', 'chat.q.food', 'chat.q.weather', 'chat.q.next'];
const AVATAR_COLORS = ['#E8533F', '#1E73E8', '#2FB863', '#E0A100', '#7C5CD6'];
const TABS = [
  { key: 'crew' as const, label: 'Crew' },
  { key: 'ai' as const, label: 'Scout AI' },
];

const inAiThread = (m: ChatMessage) => m.channel === 'ai' || m.ai === true;

/** Friendly canned replies so the demo group feels alive (offline). */
function friendReply(text: string): string {
  const q = text.toLowerCase();
  if (/food|eat|dinner|lunch|ramen|sushi|hungry/.test(q)) return 'I’m always down for food 😋 count me in!';
  if (/\?$/.test(q.trim())) return 'Good question — let’s ask the assistant or put it to a vote 🗳️';
  if (/late|delay|wait/.test(q)) return 'No stress, we’ll save you a seat 🙌';
  if (/photo|pic|camera/.test(q)) return 'Drop them in the photo dump! 📸';
  if (/money|pay|owe|\$/.test(q)) return 'I’ll log it in Budget so we can settle up later 💸';
  const pool = ['Love it 🔥', 'Works for me 👍', 'Yesss can’t wait!! ✈️', 'Adding it to my calendar 📅', 'Haha same 😂', 'Let’s goooo 🙌'];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Picks a random group member to reply (70% of the time) and a natural-feeling delay. */
function planFriendReply<M>(others: M[]): { friend: M; delay: number } | null {
  if (!others.length || Math.random() >= 0.7) return null;
  return { friend: others[Math.floor(Math.random() * others.length)], delay: 2600 + Math.random() * 1200 };
}

export default function Chat() {
  const trip = useActiveTrip();
  if (!trip) return <NoTrip />;
  return <ChatInner key={trip.id} />;
}

function ChatInner() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const trip = useActiveTrip()!;
  const userId = useAppStore((s) => s.session?.userId ?? '');
  const send = useAppStore((s) => s.sendMessage);
  const aiMode = useAppStore((s) => s.settings.aiMode);
  const markKindRead = useAppStore((s) => s.markKindRead);
  const [text, setText] = useState('');
  const [tab, setTab] = useState<'crew' | 'ai'>('crew');
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
    const plan = planFriendReply(trip.members.filter((m) => m.id !== userId && !m.invited));
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
  const author = (id: string) => trip.members.find((m) => m.id === id);
  const typingFor = typing === 'assistant' ? (isAi ? 'Scout AI' : null) : isAi ? null : typing ? author(typing)?.name.split(' ')[0] : null;

  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    if (item.kind === 'system') {
      return (
        <View style={styles.system}>
          <T variant="caption" color={colors.textMuted} center>
            {item.text}
          </T>
        </View>
      );
    }
    const mine = item.authorId === userId;
    const prev = data[index - 1];
    const grouped = !!prev && prev.kind !== 'system' && prev.authorId === item.authorId && item.ts - prev.ts < 5 * 60000;
    const m = author(item.authorId);
    const memberIndex = trip.members.findIndex((x) => x.id === item.authorId);
    const avatarBg = memberIndex >= 0 ? AVATAR_COLORS[memberIndex % AVATAR_COLORS.length] : colors.textMuted;
    const name = item.ai ? 'Scout AI' : m?.name.split(' ')[0] ?? 'Former member';
    return (
      <View style={[styles.msgRow, mine && { flexDirection: 'row-reverse' }, grouped && { marginTop: 2 }]}>
        {!mine ? (
          <View style={{ width: 30 }}>
            {!grouped ? (
              item.ai ? (
                <View style={[styles.avatar, { backgroundColor: colors.black }]}>
                  <Ionicons name="sparkles" size={14} color={colors.white} />
                </View>
              ) : (
                <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
                  <T variant="micro" weight="bold" color={colors.white} style={{ fontSize: 12 }}>
                    {(m?.name.trim()[0] ?? '?').toUpperCase()}
                  </T>
                </View>
              )
            ) : null}
          </View>
        ) : null}
        <View style={{ maxWidth: '78%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
          {!grouped && !mine ? (
            <View style={styles.nameRow}>
              <T variant="micro" weight="semibold" color={colors.textSecondary}>
                {name}
              </T>
              {item.ai && item.aiSource === 'claude' ? (
                <T variant="micro" color={colors.purple}>
                  · Claude
                </T>
              ) : null}
            </View>
          ) : null}
          <View style={[styles.bubble, mine ? styles.mine : item.ai ? styles.ai : styles.theirs]}>
            <T variant="bodySm" color={mine ? colors.white : item.ai ? colors.onAccent : colors.text} selectable>
              {item.text}
            </T>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.column}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.titleRow}>
            <T variant="display" numberOfLines={1} style={{ flex: 1 }}>
              {trip.name}
            </T>
            <IconButton icon="images-outline" label="Photo dump" onPress={() => router.push('/photos')} />
          </View>
          <Segmented options={TABS} value={tab} onChange={setTab} />
          {isAi ? (
            <Press onPress={() => router.push('/settings')} style={styles.modePill} accessibilityLabel="Assistant settings">
              <Ionicons name={aiMode === 'claude' ? 'sparkles' : 'cloud-offline-outline'} size={12} color={colors.text} />
              <T variant="micro" weight="semibold" color={colors.text}>
                {aiMode === 'claude' ? 'Answers by Claude · change in Settings' : 'Answers offline from your trip data · change in Settings'}
              </T>
            </Press>
          ) : null}
        </View>

        <FlatList
          key={tab}
          ref={list}
          data={data}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          onLayout={() => list.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            isAi ? (
              <Card style={styles.intro}>
                <View style={[styles.avatar, styles.introIcon]}>
                  <Ionicons name="sparkles" size={20} color={colors.white} />
                </View>
                <T variant="headline">Scout AI</T>
                <T variant="small" color={colors.textSecondary} center>
                  Scout AI knows your trip — budget, weather, food nearby, who owes who, flights… Ask away or tap a question below.
                </T>
              </Card>
            ) : (
              <View style={{ alignItems: 'center', padding: 30, gap: 6 }}>
                <Ionicons name="chatbubbles-outline" size={34} color={colors.textMuted} />
                <T variant="title">Say hi to your crew 👋</T>
                <T variant="small" color={colors.textSecondary} center>
                  Messages here are shared with everyone on the trip. Switch to Scout AI to ask the assistant.
                </T>
              </View>
            )
          }
          ListFooterComponent={
            typingFor ? (
              <View style={styles.typing}>
                <T variant="caption" color={colors.textMuted}>
                  {t('chat.typing', { name: typingFor })}
                </T>
              </View>
            ) : null
          }
        />

        {isAi ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingBottom: 8 }} style={{ flexGrow: 0 }}>
            {QUICK.map((k) => (
              <Chip key={k} small label={t(k)} onPress={() => submit(t(k))} />
            ))}
            <Chip small label="Who owes who?" onPress={() => submit('Who owes who?')} />
            <Chip small label="Convert 50 USD" onPress={() => submit('Convert 50 USD')} />
          </ScrollView>
        ) : null}

        <View style={styles.inputBar}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={isAi ? 'Ask Scout anything…' : 'Message the crew…'}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={1000}
            accessibilityLabel="Message"
            onSubmitEditing={() => submit()}
            submitBehavior="submit"
            returnKeyType="send"
            testID="chat-input"
          />
          <Press onPress={() => submit()} style={[styles.send, !text.trim() && { opacity: 0.4 }]} disabled={!text.trim()} accessibilityLabel="Send message" testID="chat-send">
            <Ionicons name="arrow-up" size={20} color={colors.white} />
          </Press>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH },
  header: { gap: 12, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.bgAlt },
  system: { alignSelf: 'center', backgroundColor: colors.bgAlt, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginVertical: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 12 },
  nameRow: { flexDirection: 'row', gap: 3, marginBottom: 3, marginHorizontal: 6 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  bubble: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 20 },
  mine: { backgroundColor: colors.blue },
  theirs: { backgroundColor: colors.card, ...shadow },
  ai: { backgroundColor: colors.accentSoft, ...shadow },
  intro: { alignItems: 'center', gap: 8, paddingVertical: 24, marginTop: 8 },
  introIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.black },
  typing: { paddingHorizontal: 44, paddingTop: 10 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    ...({ outlineStyle: 'none' } as object),
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
});
