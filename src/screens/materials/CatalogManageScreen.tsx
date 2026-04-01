import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Input, Badge, SectionLabel, Divider } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import { apiFetch } from '../../services/api';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'CatalogManage'>;

const CATEGORIES = ['Clay', 'Glazes', 'Tools', 'Consumables', 'Other'];

type CatalogItem = {
  id: string;
  name: string;
  category: string;
  pricePerUnit: number;
  unit: string;
  supplier?: string;
  stockStatus: string;
};

function stockVariant(status: string): 'moss' | 'clay' | 'neutral' {
  if (status === 'available') return 'moss';
  if (status === 'low') return 'clay';
  return 'neutral';
}

function stockLabel(status: string): string {
  if (status === 'available') return 'In stock';
  if (status === 'low') return 'Low stock';
  return 'Unavailable';
}

function parseCatalogPayload(data: unknown): CatalogItem[] {
  const rawList = Array.isArray(data)
    ? data
    : data &&
        typeof data === 'object' &&
        Array.isArray((data as { items?: unknown }).items)
      ? (data as { items: unknown[] }).items
      : [];
  return rawList
    .map((raw): CatalogItem | null => {
      if (!raw || typeof raw !== 'object') return null;
      const r = raw as Record<string, unknown>;
      const id = String(r.id ?? r._id ?? '').trim();
      if (!id) return null;
      return {
        id,
        name: String(r.name ?? ''),
        category: String(r.category ?? 'Other'),
        pricePerUnit: Number(r.pricePerUnit ?? r.price_per_unit ?? 0),
        unit: String(r.unit ?? ''),
        supplier:
          r.supplier != null && String(r.supplier).trim()
            ? String(r.supplier)
            : undefined,
        stockStatus: String(
          r.stockStatus ?? r.stock_status ?? 'available'
        ).toLowerCase(),
      };
    })
    .filter((x): x is CatalogItem => x != null);
}

function confirmDeleteCatalogItem(): Promise<boolean> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return Promise.resolve(
      window.confirm('Delete this item from the catalog?')
    );
  }
  return new Promise((resolve) => {
    Alert.alert(
      'Delete item',
      'Delete this item from the catalog?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => resolve(true),
        },
      ]
    );
  });
}

export default function CatalogManageScreen({ route }: Props) {
  const { tenantId } = route.params;
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [supplier, setSupplier] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<unknown>(
        `/studios/${tenantId}/catalog`,
        {},
        tenantId
      );
      setItems(parseCatalogPayload(res));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(useCallback(() => void load(), [load]));

  async function onCreate() {
    setError('');
    if (!name.trim() || !price || !unit.trim()) {
      setError('Name, price and unit are required.');
      return;
    }
    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      setError('Price must be a positive number.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/catalog`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            category,
            price_per_unit: priceNum,
            unit: unit.trim(),
            supplier: supplier.trim() || null,
            stock_status: 'available',
          }),
        },
        tenantId
      );
      setName('');
      setPrice('');
      setUnit('');
      setSupplier('');
      setCategory(CATEGORIES[0]);
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not create item.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    const ok = await confirmDeleteCatalogItem();
    if (!ok) return;
    try {
      await apiFetch(
        `/studios/${tenantId}/catalog/${id}`,
        { method: 'DELETE' },
        tenantId
      );
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not delete item.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    }
  }

  async function toggleStock(item: CatalogItem) {
    const next =
      item.stockStatus === 'available'
        ? 'low'
        : item.stockStatus === 'low'
          ? 'unavailable'
          : 'available';
    try {
      await apiFetch(
        `/studios/${tenantId}/catalog/${item.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ stock_status: next }),
        },
        tenantId
      );
      await load();
    } catch {
      /* silent */
    }
  }

  const grouped = CATEGORIES.map((cat) => ({
    cat,
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Button
        label={showForm ? 'Cancel' : '+ Add product'}
        variant="ghost"
        onPress={() => setShowForm((v) => !v)}
        fullWidth
        style={styles.addBtn}
      />

      {showForm ? (
        <View style={styles.form}>
          <Input
            label="Product name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. White stoneware clay"
          />
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.catRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.catChip, category === c && styles.catChipActive]}
                onPress={() => setCategory(c)}
              >
                <Text
                  style={[
                    styles.catChipLabel,
                    category === c && styles.catChipLabelActive,
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label="Price per unit (€)"
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.half}>
              <Input
                label="Unit"
                value={unit}
                onChangeText={setUnit}
                placeholder="kg / ml / pcs"
              />
            </View>
          </View>
          <Input
            label="Supplier (optional)"
            value={supplier}
            onChangeText={setSupplier}
            placeholder="e.g. Valentines Clays"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label="Add to catalog"
            onPress={() => void onCreate()}
            loading={saving}
            fullWidth
          />
        </View>
      ) : null}

      <Divider />

      {loading ? (
        <ActivityIndicator color={colors.clay} style={styles.loader} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>No products in catalog yet.</Text>
      ) : (
        grouped.map(({ cat, items: catItems }) => (
          <View key={cat}>
            <SectionLabel>{cat.toUpperCase()}</SectionLabel>
            {catItems.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemMain}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    €{item.pricePerUnit.toFixed(2)} / {item.unit}
                    {item.supplier ? ` · ${item.supplier}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => void toggleStock(item)}>
                  <Badge
                    label={stockLabel(item.stockStatus)}
                    variant={stockVariant(item.stockStatus)}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void onDelete(item.id)}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteLabel}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing[4], gap: spacing[3] },
  addBtn: { marginBottom: spacing[2] },
  form: {
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
  },
  fieldLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  catChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: { backgroundColor: colors.clay, borderColor: colors.clay },
  catChipLabel: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
  catChipLabelActive: { color: colors.surface },
  row: { flexDirection: 'row', gap: spacing[2] },
  half: { flex: 1 },
  error: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  loader: { marginTop: spacing[4] },
  empty: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  itemMain: { flex: 1 },
  itemName: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  itemMeta: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 2,
  },
  deleteBtn: { padding: spacing[1] },
  deleteLabel: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.error,
  },
});
