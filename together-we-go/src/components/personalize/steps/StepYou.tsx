import { Ionicons } from '@expo/vector-icons';
import { TextInput, View } from 'react-native';

import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { currencies } from '@/data/reference';
import { LANGUAGES, type LangCode } from '@/i18n';
import type { Personal } from '@/store/types';

import type { Pal } from '../palette';
import { styles } from '../styles';
import { EMOJIS } from '../options';
import { SmallChip, StepTitle } from '../parts';
import type { SetPersonal } from '../parts';

export function StepYou({ pal, p, set, firstName, lang, setLang, currency, setCurrency }: { pal: Pal; p: Personal; set: SetPersonal; firstName: string; lang: LangCode; setLang: (l: LangCode) => void; currency: string; setCurrency: (c: string) => void }) {
  return (
    <View>
      <StepTitle pal={pal} kicker="About you" title="How should we greet you?" sub="Choose a nickname and a travel avatar. They show up on your home screen." />
      <View style={[styles.input, { backgroundColor: pal.card, borderColor: pal.border }]}>
        <Ionicons name="happy-outline" size={18} color={pal.textMuted} />
        <TextInput
          value={p.nickname}
          onChangeText={(v) => set({ nickname: v })}
          placeholder={`Nickname (default: ${firstName})`}
          placeholderTextColor={pal.textMuted}
          maxLength={24}
          style={[styles.inputText, { color: pal.text }]}
          accessibilityLabel="Nickname"
        />
      </View>
      <T variant="title" color={pal.text} style={{ marginTop: 18, marginBottom: 8 }}>
        Travel avatar
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {EMOJIS.map((e) => {
          const on = p.emoji === e;
          return (
            <Press
              key={e}
              onPress={() => set({ emoji: e })}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`Avatar ${e}`}
              scaleTo={0.85}
              style={[
                styles.emoji,
                {
                  backgroundColor: on ? pal.primarySoft : pal.card,
                  borderColor: on ? pal.primary : pal.border,
                },
              ]}>
              <T style={{ fontSize: 24, lineHeight: 30 }}>{e}</T>
            </Press>
          );
        })}
      </View>
      <T variant="title" color={pal.text} style={{ marginTop: 18, marginBottom: 8 }}>
        Language
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {LANGUAGES.map((l) => (
          <SmallChip key={l.code} pal={pal} on={lang === l.code} label={`${l.flag} ${l.native}`} onPress={() => setLang(l.code)} />
        ))}
      </View>
      <T variant="title" color={pal.text} style={{ marginTop: 18, marginBottom: 8 }}>
        Home currency
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {currencies.slice(0, 10).map((c) => (
          <SmallChip key={c.code} pal={pal} on={currency === c.code} label={`${c.symbol} ${c.code}`} onPress={() => setCurrency(c.code)} />
        ))}
      </View>
    </View>
  );
}
