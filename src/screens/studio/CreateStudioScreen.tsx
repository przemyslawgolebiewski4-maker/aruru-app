import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CreateStudio'>;

export default function CreateStudioScreen() {
  const navigation = useNavigation<Nav>();
  const { refresh } = useAuth();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    city?: string;
    country?: string;
  }>({});

  function validate(): boolean {
    const next: typeof fieldErrors = {};
    const nt = name.trim();
    if (!nt) next.name = 'Studio name is required.';
    else if (nt.length < 2) next.name = 'Name must be at least 2 characters.';
    if (!city.trim()) next.city = 'City is required.';
    if (!country.trim()) next.country = 'Country is required.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit() {
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await apiFetch<{ id: string; slug: string; status: string }>(
        '/studios',
        {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            city: city.trim(),
            country: country.trim(),
            description: description.trim() || undefined,
          }),
        }
      );
      await refresh();
      navigation.replace('SetupPricing', {
        tenantId: res.id,
        studioName: name.trim(),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not create studio.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.top}>
          <Text style={styles.title}>Your studio</Text>
          <Text style={styles.subtitle}>
            Tell us about your ceramic studio.
          </Text>
        </View>

        <Input
          label="STUDIO NAME"
          placeholder="e.g. Clayground Berlin"
          value={name}
          onChangeText={(t) => {
            setName(t);
            if (fieldErrors.name) setFieldErrors((f) => ({ ...f, name: undefined }));
          }}
          autoCapitalize="words"
          error={fieldErrors.name}
        />
        <Input
          label="CITY"
          placeholder="e.g. Berlin"
          value={city}
          onChangeText={(t) => {
            setCity(t);
            if (fieldErrors.city) setFieldErrors((f) => ({ ...f, city: undefined }));
          }}
          autoCapitalize="words"
          error={fieldErrors.city}
        />
        <Input
          label="COUNTRY"
          placeholder="e.g. Germany"
          value={country}
          onChangeText={(t) => {
            setCountry(t);
            if (fieldErrors.country)
              setFieldErrors((f) => ({ ...f, country: undefined }));
          }}
          autoCapitalize="words"
          error={fieldErrors.country}
        />
        <Input
          label="DESCRIPTION"
          placeholder="A few words about your studio..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={styles.descInput}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button
          label="Continue →"
          variant="primary"
          onPress={onSubmit}
          loading={loading}
          fullWidth
        />

        <Text style={styles.hint}>
          You can invite members and set up pricing after.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    padding: spacing[6],
    paddingBottom: spacing[10],
  },
  top: {
    marginBottom: spacing[8],
  },
  title: {
    fontFamily: typography.display,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    lineHeight: 22,
  },
  descInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderRadius: radius.sm,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  hint: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    textAlign: 'center',
    marginTop: spacing[4],
    lineHeight: 20,
  },
});
