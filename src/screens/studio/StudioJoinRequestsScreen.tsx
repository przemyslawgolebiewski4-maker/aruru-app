import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import {
  getStudioJoinRequests,
  postJoinRequestAccept,
  postJoinRequestReject,
  postJoinRequestInterview,
  type JoinRequest,
} from '../../services/api';
import { Button } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { alertMessage, confirmNeutral } from '../../utils/confirmAction';

type Nav = NativeStackNavigationProp<AppStackParamList, 'StudioJoinRequests'>;
type Route = RouteProp<AppStackParamList, 'StudioJoinRequests'>;

type ModalMode = 'reject' | 'interview' | null;

export default function StudioJoinRequestsScreen({
  route,
  navigation,
}: {
  route: Route;
  navigation: Nav;
}) {
  const { tenantId, focusRequestId } = route.params;
  const { studios, refresh } = useAuth();

  const membership = studios.find((s) => s.tenantId === tenantId);
  const isOwner =
    membership?.role === 'owner' && membership?.status === 'active';

  const [list, setList] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [modalRequest, setModalRequest] = useState<JoinRequest | null>(null);
  const [modalMessage, setModalMessage] = useState('');

  const load = useCallback(async () => {
    if (!isOwner) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows = await getStudioJoinRequests(tenantId);
      setList(rows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load join requests.');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, isOwner]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function onAccept(req: JoinRequest) {
    const ok = await confirmNeutral(
      'Accept request',
      `Add ${req.applicantName || req.applicantEmail} as a member?`,
      'Accept'
    );
    if (!ok) return;
    setBusyId(req.id);
    try {
      await postJoinRequestAccept(tenantId, req.id);
      await refresh();
      await load();
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not accept request.'
      );
    } finally {
      setBusyId(null);
    }
  }

  function openReject(req: JoinRequest) {
    setModalRequest(req);
    setModalMessage('');
    setModalMode('reject');
  }

  function openInterview(req: JoinRequest) {
    setModalRequest(req);
    setModalMessage('');
    setModalMode('interview');
  }

  async function submitModal() {
    if (!modalRequest || !modalMode) return;
    const msg = modalMessage.trim();
    if (!msg) {
      alertMessage(
        'Message required',
        modalMode === 'interview'
          ? 'Enter a short message for the applicant (e.g. interview details).'
          : 'Enter a message explaining why the request is declined.'
      );
      return;
    }
    setBusyId(modalRequest.id);
    try {
      if (modalMode === 'reject') {
        await postJoinRequestReject(tenantId, modalRequest.id, msg);
      } else {
        await postJoinRequestInterview(tenantId, modalRequest.id, msg);
      }
      setModalMode(null);
      setModalRequest(null);
      setModalMessage('');
      await load();
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not update request.'
      );
    } finally {
      setBusyId(null);
    }
  }

  if (!isOwner) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Only the studio owner can manage join requests.
        </Text>
        <Button
          label="Go back"
          variant="secondary"
          onPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {error ? (
        <View style={styles.bannerErr}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {list.length === 0 ? (
          <Text style={styles.empty}>
            No pending join requests. When someone requests to join from the
            community studio page, their request appears here.
          </Text>
        ) : (
          list.map((req) => {
            const highlighted = focusRequestId && req.id === focusRequestId;
            return (
              <View
                key={req.id}
                style={[styles.card, highlighted && styles.cardFocused]}
              >
                <Text style={styles.name}>
                  {req.applicantName?.trim() || 'Applicant'}
                </Text>
                <Text style={styles.email}>{req.applicantEmail}</Text>
                <Text style={styles.statusLine}>
                  Status:{' '}
                  <Text style={styles.statusEmph}>
                    {req.status === 'interview_pending'
                      ? 'Interview pending'
                      : 'Pending review'}
                  </Text>
                </Text>
                {req.note ? (
                  <Text style={styles.note}>
                    <Text style={styles.noteLabel}>Note: </Text>
                    {req.note}
                  </Text>
                ) : null}
                {req.ownerMessage || req.interviewMessage ? (
                  <Text style={styles.note}>
                    <Text style={styles.noteLabel}>Owner message: </Text>
                    {req.ownerMessage ?? req.interviewMessage}
                  </Text>
                ) : null}
                <View style={styles.actions}>
                  <Button
                    label="Accept"
                    variant="primary"
                    onPress={() => void onAccept(req)}
                    loading={busyId === req.id}
                    disabled={busyId !== null && busyId !== req.id}
                  />
                  <Button
                    label="Reject"
                    variant="secondary"
                    onPress={() => openReject(req)}
                    disabled={busyId !== null}
                  />
                  {req.status === 'pending' ? (
                    <Button
                      label="Interview"
                      variant="secondary"
                      onPress={() => openInterview(req)}
                      disabled={busyId !== null}
                    />
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={modalMode != null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busyId) {
            setModalMode(null);
            setModalRequest(null);
          }
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            if (!busyId) {
              setModalMode(null);
              setModalRequest(null);
            }
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKb}
          >
            <Pressable
              style={styles.modalSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitle}>
                {modalMode === 'reject'
                  ? 'Reject request'
                  : 'Request interview'}
              </Text>
              <Text style={styles.modalHint}>
                {modalMode === 'reject'
                  ? 'The applicant will see this message.'
                  : 'Send details to the applicant (e.g. time slot or questions).'}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={modalMessage}
                onChangeText={setModalMessage}
                placeholder="Message…"
                placeholderTextColor={colors.inkLight}
                multiline
                editable={!busyId}
              />
              <View style={styles.modalRow}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => {
                    if (!busyId) {
                      setModalMode(null);
                      setModalRequest(null);
                    }
                  }}
                />
                <Button
                  label={modalMode === 'reject' ? 'Send rejection' : 'Send'}
                  variant={modalMode === 'reject' ? 'danger' : 'primary'}
                  loading={Boolean(busyId && modalRequest?.id === busyId)}
                  onPress={() => void submitModal()}
                />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing[4], paddingBottom: spacing[10], gap: spacing[4] },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
    gap: spacing[4],
    backgroundColor: colors.cream,
  },
  bannerErr: {
    padding: spacing[3],
    backgroundColor: colors.clayLight,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  empty: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[2],
  },
  cardFocused: {
    borderColor: colors.clay,
    borderWidth: 1,
  },
  name: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  email: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  statusLine: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  statusEmph: {
    fontFamily: typography.mono,
    color: colors.ink,
  },
  note: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 20,
  },
  noteLabel: {
    fontFamily: typography.bodyMedium,
    color: colors.ink,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 26, 22, 0.45)',
    justifyContent: 'center',
    padding: spacing[4],
  },
  modalKb: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[3],
  },
  modalTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  modalHint: {
    fontFamily: typography.body,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    lineHeight: 18,
  },
  modalInput: {
    minHeight: 100,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing[3],
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
});
