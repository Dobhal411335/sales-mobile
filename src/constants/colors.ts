export const colors = {
  primary: '#F97316',
  primaryLight: '#FED7AA',
  primaryHover: '#EA580C',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  cream: '#FAF9F6',
  text: '#18181B',
  textSecondary: '#71717A',
  border: '#E5E7EB',
  error: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
  serving: '#0EA5E9',
  payment: '#10B981',
  combined: '#8B5CF6',
} as const;

export type ColorName = keyof typeof colors;
