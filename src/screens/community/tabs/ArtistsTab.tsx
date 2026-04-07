import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
import { AvatarImage } from '../../../components/AvatarImage';
import { Button } from '../../../components/ui';
import { useAuth } from '../../../hooks/useAuth';
import { apiFetch } from '../../../services/api';
import {
  colors,
  typography,
  fontSize,
  spacing,
  radius,
} from '../../../theme/tokens';
import type { AppStackParamList, MainTabParamList } from '../../../navigation/types';

type Nav = MaterialTopTabNavigationProp<MainTabParamList>;

type Artist = {
  id: string;
  name: string;
  bio?: string;
  city?: string;
  avatarUrl?: string;
  studios: { tenantId: string; studioName: string; role: string }[];
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ArtistsTab() {
  const { studios } = useAuth();
  const navigation = useNavigation<Nav>();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';

  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ artists: Artist[] }>(
        '/community/artists',
        {},
        tenantId
      );
      const raw = res.artists ?? [];
      setArtists(
        raw.map((item) => ({
          ...item,
          avatarUrl:
            item.avatarUrl ?? (item as { avatar_url?: string }).avatar_url,
        }))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load artists.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function goArtist(userId: string) {
    navigation
      .getParent<NativeStackNavigationProp<AppStackParamList>>()
      ?.navigate('ArtistProfile', { userId });
  }

  async function handleInvite() {
    setInviteError('');
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setInviteError('Enter a valid email address.');
      return;
    }
    setInviteSending(true);
    try {
      await apiFetch('/auth/invite-to-aruru', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setInviteSent(true);
      setInviteEmail('');
      setTimeout(() => {
        setInviteSent(false);
        setShowInviteForm(false);
      }, 3000);
    } catch (e: unknown) {
      setInviteError(
        e instanceof Error ? e.message : 'Could not send invitation.'
      );
    } finally {
      setInviteSending(false);
    }
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  const inviteSection = (
    <View style={styles.inviteSection}>
      <Text style={styles.inviteTitle}>
        Know a ceramicist who would enjoy Aruru?
      </Text>
      {!showInviteForm ? (
        <Button
          label="Invite a friend"
          variant="secondary"
          onPress={() => setShowInviteForm(true)}
        />
      ) : (
        <View style={styles.inviteForm}>
          <TextInput
            style={styles.inviteInput}
            value={inviteEmail}
            onChangeText={(v) => {
              setInviteEmail(v);
              setInviteError('');
              setInviteSent(false);
            }}
            placeholder="friend@email.com"
            placeholderTextColor={colors.inkLight}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {inviteError ? (
            <Text style={styles.inviteError}>{inviteError}</Text>
          ) : null}
          {inviteSent ? (
            <Text style={styles.inviteSent}>Invitation sent!</Text>
          ) : null}
          <Button
            label="Send invitation"
            variant="primary"
            onPress={() => void handleInvite()}
            loading={inviteSending}
            fullWidth
          />
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => {
              setShowInviteForm(false);
              setInviteEmail('');
              setInviteError('');
            }}
            fullWidth
          />
        </View>
      )}
    </View>
  );

  return (
    <FlatList
      data={artists}
      keyExtractor={(a) => a.id}
      style={styles.list}
      contentContainerStyle={
        artists.length === 0 ? styles.listContentEmpty : styles.listContent
      }
      ListHeaderComponent={inviteSection}
      ListEmptyComponent={
        <View style={styles.emptyInList}>
          <Text style={styles.emptyText}>No artists found.</Text>
          <Text style={styles.emptyHint}>
            Artists appear here when their profile is set to public.
          </Text>
        </View>
      }
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      renderItem={({ item: a }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => goArtist(a.id)}
          activeOpacity={0.75}
        >
          <View style={styles.cardRow}>
            <View style={styles.avatar}>
              <AvatarImage
                url={a.avatarUrl}
                initials={initials(a.name || '?')}
                size={44}
                borderRadius={22}
                bgColor={colors.clayLight}
                textColor={colors.clay}
              />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.artistName}>{a.name}</Text>
              {a.bio ? (
                <Text style={styles.bio} numberOfLines={2}>
                  {a.bio}
                </Text>
              ) : null}
              {a.city ? <Text style={styles.city}>{a.city}</Text> : null}
              {a.studios.length > 0 && (
                <View style={styles.studioTags}>
                  {a.studios.slice(0, 2).map((s) => (
                    <View key={s.tenantId} style={styles.studioTag}>
                      <Text style={styles.studioTagLabel}>{s.studioName}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.cream },
  listContent: { paddingBottom: spacing[2] },
  listContentEmpty: { flexGrow: 1, paddingBottom: spacing[2] },
  emptyInList: {
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
  },
  inviteSection: {
    margin: spacing[4],
    marginBottom: spacing[2],
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  inviteTitle: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkMid,
    marginBottom: spacing[3],
    lineHeight: 20,
  },
  inviteForm: { gap: spacing[2] },
  inviteInput: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: 10,
    fontFamily: typography.body,
    fontSize: fontSize.base,
    color: colors.ink,
    backgroundColor: colors.cream,
    marginBottom: spacing[1],
  },
  inviteError: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  inviteSent: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.moss,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[2],
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textAlign: 'center',
  },
  sep: { height: 0.5, backgroundColor: colors.border },
  card: { backgroundColor: colors.surface, padding: spacing[4] },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.clayLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  cardInfo: { flex: 1, gap: 3 },
  artistName: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  bio: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
  city: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  studioTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  studioTag: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.clayLight,
  },
  studioTagLabel: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.clay,
  },
});
