import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors} from '../../constants/colors';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastApi {
  show: (message: string, variant?: ToastVariant, duration?: number) => void;
}

let toastApi: ToastApi | null = null;

function showToast(
  message: string,
  variant: ToastVariant = 'success',
  duration = 2800,
) {
  if (!toastApi) {
    setTimeout(() => toastApi?.show(message, variant, duration), 0);
    return;
  }
  toastApi.show(message, variant, duration);
}

type ToastFn = {
  (message: string, variant?: ToastVariant, duration?: number): void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
};

export const toast: ToastFn = Object.assign(
  (
    message: string,
    variant: ToastVariant = 'success',
    duration = 2800,
  ) => {
    showToast(message, variant, duration);
  },
  {
    success: (message: string, duration = 2800) =>
      showToast(message, 'success', duration),
    error: (message: string, duration = 2800) =>
      showToast(message, 'error', duration),
    info: (message: string, duration = 2800) =>
      showToast(message, 'info', duration),
  },
);

function ToastItem({
  message,
  variant,
  onDone,
  duration,
}: {
  message: string;
  variant: ToastVariant;
  onDone: () => void;
  duration: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    const hideTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 10,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({finished}) => {
        if (finished) {
          onDone();
        }
      });
    }, Math.max(duration - 220, 600));

    return () => clearTimeout(hideTimer);
  }, [opacity, translateY, duration, onDone]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        variant === 'success' && styles.success,
        variant === 'error' && styles.error,
        variant === 'info' && styles.info,
        {opacity, transform: [{translateY}]},
      ]}>
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const counter = useRef(0);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'success', duration = 2800) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, {id, message, variant, duration}]);
    },
    [],
  );

  useEffect(() => {
    toastApi = {show};
    return () => {
      toastApi = null;
    };
  }, [show]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          message={t.message}
          variant={t.variant}
          duration={t.duration}
          onDone={() => remove(t.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...(StyleSheet.absoluteFill as object),
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 99999,
    elevation: 99999,
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    maxWidth: 480,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 16,
  },
  success: {
    backgroundColor: '#18A558',
  },
  error: {
    backgroundColor: colors.error,
  },
  info: {
    backgroundColor: '#3B82F6',
  },
  toastText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
