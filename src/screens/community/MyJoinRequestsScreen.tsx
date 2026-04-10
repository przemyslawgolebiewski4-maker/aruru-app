import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getCommunityMyJoinRequests, type MyCommunityJoinRequest } from '../../services/api';
import { AvatarImage } from '../../components/AvatarImage';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AppStackParamList, 'MyJoinRequests'>;

function statusLabel(s: MyCommunityJoinRequest['status']): string {
  if (s === 'interview_pending') return 'Interview pending';
  return 'Pending';
}

export default function MyJoinRequestsScreen() {
  const navigation = useNavigation<Nav>();
  const [list, setList] = useState<MyCommunityJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await getCommunityMyJoinRequests();
      setList(rows);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Could not load your join requests.'
      );
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function initials(name: string): string {
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.lead}>
        Open requests to join studios from the community directory. Tap a row to
        open the studio profile.
      </Text>
      {list.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No open join requests.</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.75}
              onPress={() =>
                navigation.navigate('StudioPublicProfile', {
                  studioSlug: item.studioSlug,
                  studioName: item.studioName,
                })
              }
            >
              <View style={styles.logoWrap}>
                <AvatarImage
                  url={item.logoUrl}
                  initials={initials(item.studioName || item.studioSlug)}
                  size={48}
                  borderRadius={10}
                  bgColor={colors.mossLight}
                  textColor={colors.moss}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.studioName || item.studioSlug}
                </Text>
                <Text style={styles.meta}>{statusLabel(item.status)}</Text>
                {item.ownerMessage ? (
                  <Text style={styles.msg} numberOfLines={2}>
                    {item.ownerMessage}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.chev}>→</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  lead: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 20,
    padding: spacing[4],
    paddingBottom: spacing[2],
  },
  listContent: { paddingBottom: spacing[10] },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  empty: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },
  sep: { height: 0.5, backgroundColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.mossLight,
  },
  col: { flex: 1, minWidth: 0, gap: 2 },
  name: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  meta: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  msg: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    marginTop: spacing[1],
    lineHeight: 15,
  },
  chev: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
});
