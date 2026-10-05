import type {NavigationProp} from '@react-navigation/native';
import type {SalesStackParamList} from './types';

type PrefetchKey = keyof SalesStackParamList;

const loaded = new Set<PrefetchKey>();

const LOADERS: Partial<Record<PrefetchKey, () => void>> = {
  Orders: () => {
    require('../screens/sales/today/TodaySales');
  },
  Booking: () => {
    require('../screens/sales/booking/BookingScreen');
  },
  TakeAwayHub: () => {
    require('../screens/sales/take-away/TakeAwayHubScreen');
  },
  StaffHub: () => {
    require('../screens/sales/staff/StaffHubScreen');
  },
  CreateOrder: () => {
    require('../screens/sales/create-order/CreateOrderScreen');
  },
  Payment: () => {
    require('../screens/sales/payment/PaymentScreen');
  },
  Notifications: () => {
    require('../screens/sales/notifications/NotificationsScreen');
  },
  PrintJobs: () => {
    require('../screens/sales/print-jobs/PrintJobsScreen');
  },
  TodaySales: () => {
    require('../screens/sales/today-sales/TodaySalesScreen');
  },
  Reports: () => {
    require('../screens/sales/reports/ReportsScreen');
  },
};

/** Synchronously warm one screen module (safe to call on press). */
export function prefetchSalesScreen(name: PrefetchKey): void {
  if (loaded.has(name)) {
    return;
  }
  const load = LOADERS[name];
  if (!load) {
    return;
  }
  try {
    load();
    loaded.add(name);
  } catch {
    // Ignore prefetch failures; navigate will load normally.
  }
}

/**
 * Warm the screens Floor/header jump to most often.
 * Staggered so Floor first paint stays snappy.
 */
export function prefetchFloorDestinations(): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];

  // Defer slightly so Floor layout/paint wins first.
  timers.push(
    setTimeout(() => {
      const hot: PrefetchKey[] = [
        'Orders',
        'Booking',
        'TakeAwayHub',
        'StaffHub',
        'CreateOrder',
      ];
      hot.forEach((name, index) => {
        timers.push(
          setTimeout(() => prefetchSalesScreen(name), index * 80),
        );
      });

      const secondary: PrefetchKey[] = [
        'Payment',
        'Notifications',
        'PrintJobs',
        'TodaySales',
        'Reports',
      ];
      secondary.forEach((name, index) => {
        timers.push(
          setTimeout(() => prefetchSalesScreen(name), 600 + index * 120),
        );
      });
    }, 250),
  );

  return () => {
    for (const timer of timers) {
      clearTimeout(timer);
    }
  };
}

type SalesNav = NavigationProp<SalesStackParamList>;

/** Prefetch then navigate — first tap feels like a warm tab switch. */
export function navigateFast(
  navigation: Pick<SalesNav, 'navigate'>,
  name: PrefetchKey,
  params?: SalesStackParamList[PrefetchKey],
): void {
  prefetchSalesScreen(name);
  if (params === undefined) {
    (navigation.navigate as (n: PrefetchKey) => void)(name);
  } else {
    (navigation.navigate as (n: PrefetchKey, p: object) => void)(name, params);
  }
}
