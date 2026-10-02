import React, {useCallback, useMemo, useSyncExternalStore} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RefreshCw} from 'lucide-react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../../constants/colors';
import {
  menuSyncManager,
  type MenuSyncStatus,
} from '../../../menu/menuSyncManager';
import {prefetchMenuImages} from '../../../menu/imageCache';
import type {SalesStackParamList} from '../../../navigation/types';
import type {MenuProduct} from '../../../types/product';
import {formatCurrency} from '../../../utils/currency';

type Props = NativeStackScreenProps<SalesStackParamList, 'MenuSync'>;

function subscribe(onStoreChange: () => void) {
  return menuSyncManager.subscribe(() => onStoreChange());
}

function getSnapshot() {
  return menuSyncManager.getState();
}

function statusLabel(status: MenuSyncStatus): string {
  switch (status) {
    case 'syncing':
    case 'hydrating':
      return 'Syncing menu…';
    case 'ready':
      return 'Menu up to date';
    case 'offline':
      return 'Offline — showing cached menu';
    case 'error':
      return 'Sync failed';
    default:
      return 'Ready to sync';
  }
}

function formatSyncedAt(iso: string | null): string {
  if (!iso) {
    return 'Never synced';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Never synced';
  }
  return date.toLocaleString();
}

export function MenuSyncScreen(_props: Props) {
  const syncState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const products = useMemo(
    () => syncState.menu?.products ?? [],
    [syncState.menu?.products],
  );
  const categories = syncState.menu?.categories?.length ?? 0;
  const offers = syncState.menu?.offers?.length ?? 0;
  const heads = Math.max(0, (syncState.menu?.heads?.length ?? 0) - 2); // exclude All/Offer
  const isSyncing =
    syncState.status === 'syncing' || syncState.status === 'hydrating';

  const handleSync = useCallback(() => {
    void (async () => {
      await menuSyncManager.sync({forceFull: true});
      prefetchMenuImages(40);
    })();
  }, []);

  const renderItem = useCallback(({item}: {item: MenuProduct}) => {
    const price =
      item.variants && item.variants.length > 0
        ? item.variants[0].price
        : item.price;
    return (
      <View style={styles.productRow}>
        {item.imageUrl ? (
          <Image source={{uri: item.imageUrl}} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={styles.thumbLetter}>
              {(item.name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.productMeta}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.productSub} numberOfLines={1}>
            {item.isOffer
              ? 'Offer'
              : item.category?.name || 'Product'}
            {item.productCode ? ` · ${item.productCode}` : ''}
          </Text>
        </View>
        <Text style={styles.productPrice}>{formatCurrency(price || 0)}</Text>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Menu sync</Text>
        <Text style={styles.status}>{statusLabel(syncState.status)}</Text>
        <Text style={styles.meta}>
          Last synced: {formatSyncedAt(syncState.lastSyncedAt)}
        </Text>
        {syncState.error ? (
          <Text style={styles.errorText}>{syncState.error}</Text>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{products.length}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{categories}</Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{offers}</Text>
            <Text style={styles.statLabel}>Offers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{heads}</Text>
            <Text style={styles.statLabel}>Heads</Text>
          </View>
        </View>

        <Pressable
          style={({pressed}) => [
            styles.syncButton,
            (pressed || isSyncing) && styles.syncButtonPressed,
            isSyncing && styles.syncButtonDisabled,
          ]}
          disabled={isSyncing}
          onPress={handleSync}
          accessibilityRole="button"
          accessibilityLabel="Sync menu now">
          {isSyncing ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <RefreshCw size={18} color={colors.surface} />
          )}
          <Text style={styles.syncButtonText}>
            {isSyncing ? 'Syncing…' : 'Sync products now'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.listTitle}>Cached products</Text>

      {isSyncing && products.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerText}>Downloading menu…</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          initialNumToRender={16}
          windowSize={7}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.centerText}>
                No products cached yet. Tap Sync products now.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  status: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  statsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.cream,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  syncButton: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  syncButtonPressed: {
    backgroundColor: colors.primaryHover,
  },
  syncButtonDisabled: {
    opacity: 0.85,
  },
  syncButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface,
  },
  listTitle: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.cream,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLetter: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  productMeta: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  productSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centerText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
