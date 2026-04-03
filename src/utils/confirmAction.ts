import { Alert, Platform } from 'react-native';

/** One-button message; on web uses `window.alert` so it always shows. */
export function alertMessage(title: string, message: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
    }
    return;
  }
  Alert.alert(title, message);
}

/** Like `alertMessage`, then runs `onDismiss` (web: after blocking alert; native: OK press). */
export function alertMessageThen(
  title: string,
  message: string,
  onDismiss: () => void
): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
    }
    onDismiss();
    return;
  }
  Alert.alert(title, message, [{ text: 'OK', onPress: onDismiss }]);
}

/**
 * Cross-platform confirmation. On web, `Alert.alert` with action buttons is unreliable
 * (callbacks may never run), so we use `window.confirm` for destructive flows.
 */
export function confirmDestructive(
  title: string,
  message: string,
  confirmLabel = 'Confirm'
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(
      typeof window !== 'undefined' &&
        window.confirm(`${title}\n\n${message}`)
    );
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: 'destructive',
        onPress: () => resolve(true),
      },
    ]);
  });
}

export function confirmNeutral(
  title: string,
  message: string,
  confirmLabel = 'OK'
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(
      typeof window !== 'undefined' &&
        window.confirm(`${title}\n\n${message}`)
    );
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, onPress: () => resolve(true) },
    ]);
  });
}

const TRIAL_DAYS = [7, 14, 30] as const;

/** Native: multi-button alert. Web: prompt for 7 / 14 / 30. */
export function pickTrialExtensionDays(studioName: string): Promise<number | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return Promise.resolve(null);
    const raw = window.prompt(
      `Extend trial for ${studioName}\nEnter days: 7, 14, or 30`,
      '7'
    );
    if (raw == null) return Promise.resolve(null);
    const n = Number.parseInt(raw.trim(), 10);
    if (TRIAL_DAYS.includes(n as (typeof TRIAL_DAYS)[number])) {
      return Promise.resolve(n);
    }
    window.alert('Invalid choice. Use 7, 14, or 30.');
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    Alert.alert(
      'Extend trial',
      `Extend trial for ${studioName} by how many days?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: '7 days', onPress: () => resolve(7) },
        { text: '14 days', onPress: () => resolve(14) },
        { text: '30 days', onPress: () => resolve(30) },
      ]
    );
  });
}
