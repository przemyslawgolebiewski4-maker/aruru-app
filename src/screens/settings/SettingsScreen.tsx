import React, { useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { Button, Divider, SectionLabel } from '../../components/ui';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch, getAuthDataExport } from '../../services/api';
import { alertMessage, alertMessageThen } from '../../utils/confirmAction';

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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionLabel>Account & security</SectionLabel>
      <Button
        label="Security & two-factor"
        variant="ghost"
        onPress={() => stackNav.navigate('AccountSecurity')}
        fullWidth
        style={styles.menuBtn}
      />
      <Button
        label="Notification preferences"
        variant="ghost"
        onPress={() =>
          alertMessage(
            'Coming soon',
            'Notification settings are on the way.'
          )
        }
        fullWidth
        style={styles.menuBtn}
      />

      <View style={styles.sectionGap} />
      <SectionLabel>Data</SectionLabel>
      <Button
        label="Export my data"
        variant="ghost"
        onPress={() => void handleDataExport()}
        loading={exportingData}
        fullWidth
        style={styles.menuBtn}
      />

      <View style={styles.sectionGap} />
      <SectionLabel>Support & legal</SectionLabel>
      <Button
        label="Help & FAQ"
        variant="ghost"
        onPress={() => void Linking.openURL('https://aruru.xyz/help')}
        fullWidth
        style={styles.menuBtn}
      />
      <Button
        label="Contact support"
        variant="ghost"
        onPress={() => stackNav.navigate('Support')}
        fullWidth
        style={styles.menuBtn}
      />
      <Button
        label="Privacy Policy"
        variant="ghost"
        onPress={() => void Linking.openURL('https://aruru.xyz/privacy')}
        fullWidth
        style={styles.menuBtn}
      />
      <Button
        label="Terms of Service"
        variant="ghost"
        onPress={() => void Linking.openURL('https://aruru.xyz/terms')}
        fullWidth
        style={styles.menuBtn}
      />
      <Button
        label="Impressum"
        variant="ghost"
        onPress={() => void Linking.openURL('https://aruru.xyz/impressum')}
        fullWidth
        style={styles.menuBtn}
      />

      <View style={styles.sectionGap} />
      <SectionLabel>Session</SectionLabel>
      <Button
        label="Sign out"
        variant="ghost"
        onPress={() => void signOut()}
        fullWidth
        style={styles.menuBtn}
      />
      <Divider style={styles.sessionDivider} />
      <View style={styles.deleteHint}>
        <Text style={styles.deleteHintText}>
          Download your data before deleting: Settings → Export my data.
        </Text>
      </View>
      <Button
        label="Delete account"
        variant="danger"
        onPress={() => void handleDeleteAccount()}
        loading={deleting}
        fullWidth
        style={styles.menuBtn}
      />
      {deleteError ? (
        <Text style={styles.deleteErrorText}>{deleteError}</Text>
      ) : null}

      <View style={{ height: spacing[10] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing[6] },
  sectionGap: { height: spacing[8] },
  menuBtn: { marginTop: spacing[1] },
  sessionDivider: { marginTop: spacing[4] },
  deleteHint: {
    paddingHorizontal: spacing[2],
    marginTop: spacing[3],
    marginBottom: spacing[1],
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
