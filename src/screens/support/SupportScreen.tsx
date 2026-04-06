import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiFetch } from '../../services/api';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Support'>;

type Topic = 'billing' | 'technical' | 'community' | 'account' | 'other';

const TOPICS: { key: Topic; label: string; desc: string }[] = [
  { key: 'billing', label: 'Billing & subscription', desc: 'Payments, plans, invoices' },
  { key: 'technical', label: 'Technical issue', desc: 'Something is not working' },
  { key: 'community', label: 'Community & forum', desc: 'Posts, profiles, discovery' },
  { key: 'account', label: 'Account & data', desc: 'Profile, privacy, export' },
  { key: 'other', label: 'Other', desc: 'Anything else' },
];

const MAX_MESSAGE = 3000;

export default function SupportScreen({ navigation }: Props) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!topic) {
      setError('Please select a topic.');
      return;
    }
    const trimmed = message.trim();
    if (trimmed.length < 20) {
      setError('Message must be at least 20 characters.');
      return;
    }
    if (trimmed.length > MAX_MESSAGE) {
      setError(`Message must be at most ${MAX_MESSAGE} characters.`);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiFetch('/support', {
        method: 'POST',
        body: JSON.stringify({ topic, message: trimmed }),
      });
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not send message.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={styles.sentWrap}>
        <Text style={styles.sentIcon}>✓</Text>
        <Text style={styles.sentTitle}>Message sent</Text>
        <Text style={styles.sentBody}>
          We&apos;ll reply to your registered email address. Most requests are
          answered within 1–2 business days.
        </Text>
        <Button
          label="Back to profile"
          variant="ghost"
          onPress={() => navigation.goBack()}
          fullWidth
          style={{ marginTop: spacing[6] }}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.intro}>
        Choose a topic and describe what&apos;s happening. We&apos;ll reply to your
        account email address.
      </Text>

      <Text style={styles.sectionLabel}>Topic</Text>
      {TOPICS.map((t) => (
        <TouchableOpacity
          key={t.key}
          style={[styles.topicCard, topic === t.key && styles.topicCardSelected]}
          onPress={() => {
            setTopic(t.key);
            setError('');
          }}
          activeOpacity={0.8}
          accessibilityRole="radio"
          accessibilityState={{ selected: topic === t.key }}
        >
          <View style={styles.topicRadio}>
            {topic === t.key ? <View style={styles.topicRadioDot} /> : null}
          </View>
          <View style={styles.topicText}>
            <Text style={styles.topicLabel}>{t.label}</Text>
            <Text style={styles.topicDesc}>{t.desc}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <Text style={[styles.sectionLabel, { marginTop: spacing[5] }]}>Message</Text>
      <Input
        label=""
        value={message}
        onChangeText={(v) => {
          setMessage(v);
          setError('');
        }}
        placeholder="Describe your issue or question in detail…"
        multiline
        numberOfLines={6}
        maxLength={MAX_MESSAGE}
        style={styles.textarea}
      />
      <Text style={styles.charCount}>
        {message.trim().length} / {MAX_MESSAGE}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Send message"
        variant="primary"
        onPress={() => void handleSend()}
        loading={loading}
        fullWidth
        style={{ marginTop: spacing[4] }}
      />

      <Text style={styles.note}>
        We reply to your registered account email. For urgent billing issues,
        you can also reach us at hello@aruru.xyz.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing[6], paddingBottom: spacing[10] },
  intro: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 20,
    marginBottom: spacing[5],
  },
  sectionLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing[2],
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing[2],
  },
  topicCardSelected: { borderColor: colors.clay, borderWidth: 1.5 },
  topicRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  topicRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.clay,
  },
  topicText: { flex: 1 },
  topicLabel: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  topicDesc: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 1,
  },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
  charCount: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textAlign: 'right',
    marginTop: 4,
  },
  error: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing[2],
  },
  note: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing[4],
    paddingHorizontal: spacing[2],
  },
  sentWrap: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
  },
  sentIcon: {
    fontSize: 48,
    color: colors.moss,
    marginBottom: spacing[4],
  },
  sentTitle: {
    fontFamily: typography.display,
    fontSize: 26,
    color: colors.ink,
    marginBottom: spacing[3],
  },
  sentBody: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: 22,
  },
});
