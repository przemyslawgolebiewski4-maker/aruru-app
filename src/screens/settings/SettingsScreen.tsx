import React, { useState, type ReactNode } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Rect } from 'react-native-svg';
import { useAuth } from '../../hooks/useAuth';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch, getAuthDataExport } from '../../services/api';
import { alertMessage, alertMessageThen } from '../../utils/confirmAction';

const H_PAD = Platform.OS === 'web' ? spacing[5] : spacing[3];

type StackNav = NativeStackNavigationProp<AppStackParamList>;

async function confirmDeleteAccountFlow(): Promise<boolean> {
  const step1 =
    typeof window !== 'undefined'
      ? window.confirm(
          'Delete your Aruru account?\n\nThis will permanently remove your profile and all your data. This cannot be undone.'
        )
      : true;
  if (!step1) return false;
  return typeof window !== 'undefined'
    ? window.confirm(
        'Are you absolutely sure?\n\nThis action is permanent and cannot be reversed.'
      )
    : true;
}

async function downloadUserDataExport(): Promise<void> {
  const payload = await getAuthDataExport();
  if (typeof window !== 'undefined' && window.document) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aruru-user-data-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }
}

function MovedBadge({ from }: { from: string }) {
  return (
    <View style={movedStyles.wrap}>
      <Text style={movedStyles.text}>From {from}</Text>
    </View>
  );
}

const movedStyles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.creamDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  text: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.inkMid,
    letterSpacing: 0.02,
  },
});

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function RowIconWrap({ children }: { children: ReactNode }) {
  return <View style={s.rowIcon}>{children}</View>;
}

function SettingsMenuRow({
  icon,
  title,
  subtitle,
  onPress,
  isLast,
  meta,
  destructive,
  right,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  isLast?: boolean;
  meta?: ReactNode;
  destructive?: boolean;
  right?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[s.row, !isLast && s.rowBorder]}
      onPress={onPress}
      activeOpacity={0.78}
      accessibilityRole="button"
      disabled={disabled}
    >
      <RowIconWrap>
        {destructive ? (
          <View style={s.dangerIconRing}>{icon}</View>
        ) : (
          icon
        )}
      </RowIconWrap>
      <View style={s.rowBody}>
        <Text style={destructive ? s.rowTitleDanger : s.rowTitle}>{title}</Text>
        {subtitle ? <Text style={s.rowSub}>{subtitle}</Text> : null}
        {meta}
      </View>
      {right ?? <Text style={s.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

function IconShield({ stroke = colors.inkMid }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
      />
    </Svg>
  );
}

function IconBell({ stroke = colors.inkMid }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
      />
    </Svg>
  );
}

function IconDownload({ stroke = colors.inkMid }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
      />
    </Svg>
  );
}

function IconGridHelp({ stroke = colors.inkMid }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="1" stroke={stroke} strokeWidth={1.25} />
      <Rect x="14" y="3" width="7" height="7" rx="1" stroke={stroke} strokeWidth={1.25} />
      <Rect x="3" y="14" width="7" height="7" rx="1" stroke={stroke} strokeWidth={1.25} />
      <Rect x="14" y="14" width="7" height="7" rx="1" stroke={stroke} strokeWidth={1.25} />
    </Svg>
  );
}

function IconChat({ stroke = colors.inkMid }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      />
    </Svg>
  );
}

function IconDoc({ stroke = colors.inkMid }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
      />
      <Path stroke={stroke} strokeWidth={1.5} strokeLinecap="round" d="M14 2v6h6" />
    </Svg>
  );
}

function IconSignOut({ stroke = colors.inkMid }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
      />
    </Svg>
  );
}

function IconTrash({ stroke = colors.error }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z"
      />
    </Svg>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const stackNav = useNavigation<StackNav>();
  const [exportingData, setExportingData] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDataExport() {
    if (!user?.id) return;
    if (typeof window === 'undefined') return;
    setExportingData(true);
    try {
      await downloadUserDataExport();
      localStorage.setItem(
        `aruru_last_export_user_${user.id}`,
        new Date().toISOString()
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Export failed.';
      alertMessage('Export my data', msg);
    } finally {
      setExportingData(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError('');
    const ok = await confirmDeleteAccountFlow();
    if (!ok) return;
    setDeleting(true);
    try {
      try {
        await apiFetch('/auth/account', { method: 'DELETE' });
      } catch {
        await apiFetch('/auth/delete-account', {
          method: 'POST',
          body: JSON.stringify({}),
        });
      }
      alertMessageThen(
        'Account deleted',
        'Your account has been removed. Data held in Aruru — including sponsor profile, notifications, forum activity, and other records tied to your account — is deleted in line with our backend policy.',
        () => {
          void signOut();
        }
      );
    } catch (e: unknown) {
      setDeleteError(
        e instanceof Error ? e.message : 'Could not delete account.'
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <Card title="Account & security">
        <SettingsMenuRow
          icon={<IconShield />}
          title="Security & two-factor"
          subtitle="Password, 2FA"
          onPress={() => stackNav.navigate('AccountSecurity')}
          meta={<MovedBadge from="Profile" />}
        />
        <SettingsMenuRow
          icon={<IconBell />}
          title="Notifications"
          subtitle="What you want to receive"
          onPress={() => stackNav.navigate('NotificationPreferences')}
          isLast
        />
      </Card>

      <Card title="Data">
        <SettingsMenuRow
          icon={<IconDownload />}
          title="Export my data"
          subtitle="GDPR — download your data"
          onPress={() => void handleDataExport()}
          meta={<MovedBadge from="Dashboard" />}
          isLast
          disabled={exportingData}
          right={
            exportingData ? (
              <ActivityIndicator size="small" color={colors.clay} />
            ) : undefined
          }
        />
      </Card>

      <Card title="Support & legal">
        <SettingsMenuRow
          icon={<IconGridHelp />}
          title="Help & FAQ"
          onPress={() => void Linking.openURL('https://aruru.xyz/help')}
        />
        <SettingsMenuRow
          icon={<IconChat />}
          title="Contact support"
          onPress={() => stackNav.navigate('Support')}
          meta={<MovedBadge from="Profile" />}
        />
        <SettingsMenuRow
          icon={<IconDoc />}
          title="Privacy Policy"
          onPress={() => void Linking.openURL('https://aruru.xyz/privacy')}
        />
        <SettingsMenuRow
          icon={<IconDoc />}
          title="Terms of Service"
          onPress={() => void Linking.openURL('https://aruru.xyz/terms')}
        />
        <SettingsMenuRow
          icon={<IconDoc />}
          title="Impressum"
          onPress={() => void Linking.openURL('https://aruru.xyz/impressum')}
          isLast
        />
      </Card>

      <Card title="Session">
        <SettingsMenuRow
          icon={<IconSignOut />}
          title="Sign out"
          onPress={() => void signOut()}
          meta={<MovedBadge from="Profile" />}
        />
        <View style={s.deleteHint}>
          <Text style={s.deleteHintText}>
            Download your data before deleting: Settings → Export my data.
          </Text>
        </View>
        <TouchableOpacity
          style={[s.row, s.rowLastDestructive]}
          onPress={() => void handleDeleteAccount()}
          activeOpacity={0.75}
          accessibilityRole="button"
          disabled={deleting}
        >
          <RowIconWrap>
            <View style={s.dangerIconRing}>
              <IconTrash />
            </View>
          </RowIconWrap>
          <View style={s.rowBody}>
            <Text style={s.rowTitleDanger}>Delete account</Text>
            <Text style={s.rowSub}>Permanent — this cannot be undone</Text>
            <View style={{ marginTop: 4 }}>
              <MovedBadge from="Profile" />
            </View>
          </View>
          {deleting ? (
            <Text style={s.chevron}>…</Text>
          ) : (
            <Text style={s.chevron}>›</Text>
          )}
        </TouchableOpacity>
      </Card>

      {deleteError ? (
        <Text style={s.deleteErrorText}>{deleteError}</Text>
      ) : null}

      <View style={{ height: spacing[10] }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.cream },
  content: {
    paddingHorizontal: H_PAD,
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    marginBottom: spacing[4],
    overflow: 'hidden',
    paddingBottom: spacing[1],
  },
  cardTitle: {
    fontFamily: typography.monoMedium,
    fontSize: 10,
    letterSpacing: 0.07,
    textTransform: 'uppercase',
    color: colors.inkLight,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  rowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.clayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerIconRing: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorLight,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  rowTitleDanger: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.error,
  },
  rowSub: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 2,
    lineHeight: 17,
  },
  chevron: {
    fontSize: 20,
    color: colors.inkLight,
    marginTop: 2,
  },
  rowLastDestructive: {
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    marginTop: spacing[1],
  },
  deleteHint: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  deleteHintText: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: 16,
  },
  deleteErrorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing[2],
  },
});
