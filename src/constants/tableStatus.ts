import {colors} from './colors';
import type {TableDisplayStatus} from '../types/table';

export interface TableStatusStyle {
  label: string;
  background: string;
  border: string;
  text: string;
  statusText: string;
  dot?: string;
}

export const TABLE_STATUS_STYLES: Record<TableDisplayStatus, TableStatusStyle> = {
  AVAILABLE: {
    label: 'AVAILABLE',
    background: colors.surface,
    border: colors.border,
    text: colors.text,
    statusText: colors.textSecondary,
  },
  SERVING: {
    label: 'SERVING',
    background: '#E0F2FE',
    border: '#38BDF8',
    text: '#0C4A6E',
    statusText: '#0369A1',
    dot: colors.serving,
  },
  PAYMENT: {
    label: 'PAYMENT',
    background: '#D1FAE5',
    border: '#34D399',
    text: '#064E3B',
    statusText: '#047857',
    dot: colors.payment,
  },
  ORDERING: {
    label: 'ORDERING',
    background: colors.primaryLight,
    border: colors.primary,
    text: '#7C2D12',
    statusText: colors.primaryHover,
    dot: colors.primary,
  },
  COMBINED: {
    label: 'COMBINED',
    background: '#EDE9FE',
    border: '#A78BFA',
    text: '#4C1D95',
    statusText: '#6D28D9',
    dot: colors.combined,
  },
  BOOKED: {
    label: 'BOOKED',
    background: '#FECACA',
    border: '#EF4444',
    text: '#1F2937',
    statusText: '#4B5563',
  },
};
