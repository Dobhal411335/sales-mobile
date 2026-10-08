import React from 'react';
import {
  Bell,
  ChevronDown,
  LayoutGrid,
  List,
  Users,
} from 'lucide-react-native';
import {colors} from '../../constants/colors';

interface IconProps {
  size?: number;
  color?: string;
}

export function ChevronDownIcon({
  size = 14,
  color = colors.textSecondary,
}: IconProps) {
  return <ChevronDown size={size} color={color} strokeWidth={2.5} />;
}

export function BellIcon({size = 20, color = '#D97706'}: IconProps) {
  return <Bell size={size} color={color} strokeWidth={2.25} />;
}

export function FloorTabIcon({
  size = 14,
  color = colors.textSecondary,
}: IconProps) {
  return <LayoutGrid size={size} color={color} strokeWidth={2.5} />;
}

export function OrdersTabIcon({
  size = 14,
  color = colors.textSecondary,
}: IconProps) {
  return <List size={size} color={color} strokeWidth={2.5} />;
}

export function UsersIcon({size = 14, color = '#065F46'}: IconProps) {
  return <Users size={size} color={color} strokeWidth={2.5} />;
}
