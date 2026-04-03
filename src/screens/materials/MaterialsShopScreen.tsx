import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Badge, Divider } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import { apiFetch } from '../../services/api';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'MaterialsShop'>;

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

type CartItem = {
  item: CatalogItem;
  quantity: number;
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

export default function MaterialsShopScreen({ route }: Props) {
  const { tenantId } = route.params;
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<unknown>(
        `/studios/${tenantId}/catalog`,
        {},
        tenantId
      );
      const all = parseCatalogPayload(res);
      setItems(all);
      const firstCat = CATEGORIES.find((c) => all.some((i) => i.category === c));
      if (firstCat) setActiveCategory(firstCat);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      setCart([]);
      setSuccess('');
      setError('');
    }, [load])
  );

  function addToCart(item: CatalogItem) {
    if (item.stockStatus === 'unavailable') return;
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((c) => c.item.id !== itemId);
      }
      return prev.map((c) =>
        c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c
      );
    });
  }

  function cartQuantity(itemId: string): number {
    return cart.find((c) => c.item.id === itemId)?.quantity ?? 0;
  }

  const cartTotal = cart.reduce(
    (sum, c) => sum + c.item.pricePerUnit * c.quantity,
    0
  );

  async function onOrder() {
    if (cart.length === 0) return;
    setOrdering(true);
    setError('');
    try {
      await Promise.all(
        cart.map((c) =>
          apiFetch(
            `/studios/${tenantId}/materials/buy`,
            {
              method: 'POST',
              body: JSON.stringify({
                catalog_item_id: c.item.id,
                quantity: c.quantity,
              }),
            },
            tenantId
          )
        )
      );
      setCart([]);
      setSuccess('Order placed! Costs will be added to your monthly summary.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not place order.');
    } finally {
      setOrdering(false);
    }
  }

  const visibleItems = items.filter((i) => i.category === activeCategory);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
        >
          <View style={styles.tabs}>
            {CATEGORIES.filter((c) => items.some((i) => i.category === c)).map(
              (c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.tab, activeCategory === c && styles.tabActive]}
                  onPress={() => setActiveCategory(c)}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      activeCategory === c && styles.tabLabelActive,
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </ScrollView>

        <Divider />

        {loading ? (
          <ActivityIndicator color={colors.clay} style={styles.loader} />
        ) : visibleItems.length === 0 ? (
          <Text style={styles.empty}>No products in this category.</Text>
        ) : (
          visibleItems.map((item) => {
            const qty = cartQuantity(item.id);
            const unavailable = item.stockStatus === 'unavailable';
            return (
              <View
                key={item.id}
                style={[
                  styles.productCard,
                  unavailable && styles.productCardDisabled,
                ]}
              >
                <View style={styles.productTop}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{item.name}</Text>
                    {item.supplier ? (
                      <Text style={styles.productSupplier}>{item.supplier}</Text>
                    ) : null}
                    <Text style={styles.productPrice}>
                      €{item.pricePerUnit.toFixed(2)} / {item.unit}
                    </Text>
                  </View>
                  <Badge
                    label={stockLabel(item.stockStatus)}
                    variant={stockVariant(item.stockStatus)}
                  />
                </View>
                {!unavailable ? (
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => removeFromCart(item.id)}
                    >
                      <Text style={styles.qtyBtnLabel}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{qty}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => addToCart(item)}
                    >
                      <Text style={styles.qtyBtnLabel}>+</Text>
                    </TouchableOpacity>
                    {qty > 0 ? (
                      <Text style={styles.qtyTotal}>
                        €{(item.pricePerUnit * qty).toFixed(2)}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        {success ? <Text style={styles.success}>{success}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.footerNote}>
          Cost will be added to your monthly summary.
        </Text>
      </ScrollView>

      {cart.length > 0 ? (
        <View style={styles.cartBar}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartCount}>
              {cart.reduce((s, c) => s + c.quantity, 0)} items
            </Text>
            <Text style={styles.cartTotal}>€{cartTotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.orderBtn}
            onPress={() => void onOrder()}
            disabled={ordering}
            activeOpacity={0.8}
          >
            {ordering ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <Text style={styles.orderBtnLabel}>Order →</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing[4], gap: spacing[3], paddingBottom: 100 },
  tabsScroll: { marginHorizontal: -spacing[4] },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  tab: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.clay, borderColor: colors.clay },
  tabLabel: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
  tabLabelActive: { color: colors.surface },
  loader: { marginTop: spacing[4] },
  empty: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  productCardDisabled: { opacity: 0.5 },
  productTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  productInfo: { flex: 1, gap: 2 },
  productName: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  productSupplier: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  productPrice: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.clay,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnLabel: {
    fontFamily: typography.body,
    fontSize: fontSize.lg,
    color: colors.ink,
    lineHeight: 20,
  },
  qtyValue: {
    fontFamily: typography.mono,
    fontSize: fontSize.md,
    color: colors.ink,
    minWidth: 20,
    textAlign: 'center',
  },
  qtyTotal: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.clay,
    marginLeft: 'auto',
  },
  footerNote: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textAlign: 'center',
    paddingTop: spacing[2],
  },
  success: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.moss,
    textAlign: 'center',
  },
  error: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[3],
  },
  cartInfo: { flex: 1, gap: 2 },
  cartCount: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  cartTotal: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.lg,
    color: colors.surface,
  },
  orderBtn: {
    backgroundColor: colors.clay,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 44,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? { cursor: 'pointer' as const, userSelect: 'none' as const }
      : {}),
  },
  orderBtnLabel: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.surface,
  },
});
