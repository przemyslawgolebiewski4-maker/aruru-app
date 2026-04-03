import { CommonActions } from '@react-navigation/native';
import { Platform } from 'react-native';

/** After Stripe return: App stack has `Main`; Auth stack does not — reload web or fall back to Login. */
export function paymentNavigateHome(navigation: {
  getState: () => { routeNames?: string[] } | undefined;
  dispatch: (action: ReturnType<typeof CommonActions.reset>) => void;
}) {
  const names = navigation.getState()?.routeNames ?? [];
  if (names.includes('Main')) {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      })
    );
    return;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.replace('/');
    return;
  }
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    })
  );
}
