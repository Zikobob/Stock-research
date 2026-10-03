import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NoTrip } from '@/components/trip/NoTrip';
import { Chip, IconButton } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Press, tap } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import { answerLocally, askClaude, type AssistantContext } from '@/services/assistant';
import { getApiKey } from '@/services/secrets';
import { useActiveTrip, useAppStore } from '@/store/useAppStore';
import type { ChatMessage, Trip } from '@/store/types';
import { MAX_WIDTH, colors, fonts } from '@/theme';
import { initials } from '@/utils/format';

const QUICK = ['chat.q.budget', 'chat.q.food', 'chat.q.weather', 'chat.q.next'];

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
  const [aiOn, setAiOn] = useState(false);
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

  const askAssistant = async (question: string) => {
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
          reply = await askClaude(key, question, live.messages, ctx);
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
    send(trip.id, { authorId: 'assistant', ai: true, aiSource: source, text: reply });
    tap();
  };

  const submit = (raw?: string, forceAi?: boolean) => {
    const msg = (raw ?? text).trim();
    if (!msg) return;
    if (msg.length > 1000) return toast('Messages can be up to 1000 characters', { tone: 'warn' });
    setText('');
    send(trip.id, { authorId: userId, text: msg });
    const toAi = forceAi || aiOn || /^@?(ai|assistant)\b/i.test(msg);
    if (toAi) {
      askAssistant(msg.replace(/^@?(ai|assistant)\b[:,]?\s*/i, ''));
      return;
    }
    const plan = planFriendReply(trip.members.filter((m) => m.id !== userId && !m.invited));
    if (plan) {
      later(() => setTyping(plan.friend.id), 900);
      later(() => {
        setTyping(null);
        send(trip.id, { authorId: plan.friend.id, text: friendReply(msg) });
      }, plan.delay);
    }
  };

  const author = (id: string) => trip.members.find((m) => m.id === id);
  const typingName = typing === 'assistant' ? t('chat.assistant') : typing ? author(typing)?.name.split(' ')[0] : null;

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
    const prev = trip.messages[index - 1];
    const grouped = prev && prev.authorId === item.authorId && item.ts - prev.ts < 5 * 60000;
    const m = author(item.authorId);
    const name = item.ai ? t('chat.assistant') : m?.name.split(' ')[0] ?? 'Former member';
    return (
      <View style={[styles.msgRow, mine && { flexDirection: 'row-reverse' }, grouped && { marginTop: 2 }]}>
        <View style={{ width: 30 }}>
          {!grouped ? (
            item.ai ? (
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={14} color={colors.white} />
              </View>
            ) : (
              <View style={styles.initials}>
                <T variant="micro" weight="bold" color={colors.primary} style={{ fontSize: 9.5 }}>
                  {initials(m?.name ?? '?')}
                </T>
              </View>
            )
          ) : null}
        </View>
        <View style={{ maxWidth: '78%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
          {!grouped ? (
            <View style={styles.nameRow}>
              <T variant="micro" color={colors.textMuted}>
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
            <T variant="bodySm" color={mine ? colors.white : colors.text} selectable>
              {item.text}
            </T>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.column}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <T variant="kicker" color={colors.textSecondary}>
              {t('chat.kicker', { n: trip.members.length })}
            </T>
            <T variant="h1">{t('chat.title')}</T>
          </View>
          <Press onPress={() => router.push('/settings')} style={styles.modePill} accessibilityLabel="Assistant settings">
            <Ionicons name={aiMode === 'claude' ? 'sparkles' : 'cloud-offline-outline'} size={12} color={colors.primary} />
            <T variant="micro" weight="semibold" color={colors.primary}>
              {aiMode === 'claude' ? 'Claude AI' : 'Offline AI'}
            </T>
          </Press>
          <IconButton icon="images-outline" label="Photo dump" onPress={() => router.push('/photos')} />
        </View>

        <FlatList
          ref={list}
          data={trip.messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          onLayout={() => list.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 30, gap: 6 }}>
              <Ionicons name="chatbubbles-outline" size={34} color={colors.primary} />
              <T variant="title">Say hi to your group 👋</T>
              <T variant="small" color={colors.textSecondary} center>
                Messages here are shared with everyone on the trip. Start with “@ai” to ask the assistant.
              </T>
            </View>
          }
          ListFooterComponent={
            typingName ? (
              <View style={styles.typing}>
                <T variant="caption" color={colors.textMuted}>
                  {t('chat.typing', { name: typingName })}
                </T>
              </View>
            ) : null
          }
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingBottom: 8 }} style={{ flexGrow: 0 }}>
          {QUICK.map((k) => (
            <Chip key={k} small label={t(k)} onPress={() => submit(t(k), true)} />
          ))}
          <Chip small label="Who owes who?" onPress={() => submit('Who owes who?', true)} />
          <Chip small label="Convert 50 USD" onPress={() => submit('Convert 50 USD', true)} />
        </ScrollView>

        <View style={styles.inputBar}>
          <Press
            onPress={() => {
              setAiOn((v) => !v);
              tap();
            }}
            style={[styles.aiToggle, aiOn && styles.aiToggleOn]}
            accessibilityLabel={aiOn ? 'Talking to the Trip Assistant. Tap to message the group' : 'Ask the Trip Assistant'}
            accessibilityState={{ selected: aiOn }}>
            <Ionicons name="sparkles" size={16} color={aiOn ? colors.white : colors.primary} />
          </Press>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={aiOn ? t('chat.askAi') : t('chat.placeholder')}
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
          <Press onPress={() => submit()} style={[styles.send, !text.trim() && { opacity: 0.5 }]} disabled={!text.trim()} accessibilityLabel="Send message" testID="chat-send">
            <Ionicons name="paper-plane" size={17} color={colors.white} />
          </Press>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  modePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.primarySoft },
  system: { alignSelf: 'center', backgroundColor: colors.bgAlt, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginVertical: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 12 },
  nameRow: { flexDirection: 'row', gap: 2, marginBottom: 3, marginHorizontal: 4 },
  initials: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  aiAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 },
  ai: { backgroundColor: colors.primarySoft, borderBottomLeftRadius: 6 },
  typing: { paddingHorizontal: 54, paddingTop: 10 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  aiToggle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.primaryLine, backgroundColor: colors.primarySofter, alignItems: 'center', justifyContent: 'center' },
  aiToggleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    ...({ outlineStyle: 'none' } as object),
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});

