import React from 'react';
import {StyleSheet, View} from 'react-native';
import {colors} from '../../constants/colors';

interface IconProps {
  size?: number;
  color?: string;
}

export function ChevronDownIcon({
  size = 14,
  color = colors.textSecondary,
}: IconProps) {
  return (
    <View style={[styles.box, {width: size, height: size}]}>
      <View
        style={[
          styles.chevron,
          {
            width: size * 0.55,
            height: size * 0.55,
            borderBottomColor: color,
            borderRightColor: color,
          },
        ]}
      />
    </View>
  );
}

export function BellIcon({size = 20, color = '#D97706'}: IconProps) {
  const bodyW = size * 0.52;
  const bodyH = size * 0.42;
  return (
    <View style={[styles.box, {width: size, height: size}]}>
      <View
        style={[
          styles.bellTop,
          {
            width: size * 0.18,
            height: size * 0.14,
            borderRadius: size,
            borderColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.bellBody,
          {
            width: bodyW,
            height: bodyH,
            borderTopLeftRadius: bodyW / 2,
            borderTopRightRadius: bodyW / 2,
            backgroundColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.bellClapperBar,
          {
            width: size * 0.72,
            backgroundColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.bellClapper,
          {
            width: size * 0.16,
            height: size * 0.16,
            borderRadius: size,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

export function FloorTabIcon({
  size = 14,
  color = colors.textSecondary,
}: IconProps) {
  const cell = size * 0.32;
  const gap = size * 0.12;
  return (
    <View style={[styles.box, {width: size, height: size, gap}]}>
      <View style={[styles.row, {gap}]}>
        <View
          style={[
            styles.floorCell,
            {width: cell, height: cell, backgroundColor: color},
          ]}
        />
        <View
          style={[
            styles.floorCell,
            {width: cell, height: cell, backgroundColor: color},
          ]}
        />
      </View>
      <View style={[styles.row, {gap}]}>
        <View
          style={[
            styles.floorCell,
            {width: cell, height: cell, backgroundColor: color},
          ]}
        />
        <View
          style={[
            styles.floorCell,
            {width: cell, height: cell, backgroundColor: color},
          ]}
        />
      </View>
    </View>
  );
}

export function OrdersTabIcon({
  size = 14,
  color = colors.textSecondary,
}: IconProps) {
  const lineH = Math.max(1.5, size * 0.1);
  const gap = size * 0.14;
  return (
    <View
      style={[
        styles.box,
        styles.ordersBox,
        {
          width: size,
          height: size,
          gap,
          paddingHorizontal: size * 0.08,
        },
      ]}>
      <View
        style={[
          styles.ordersLineFull,
          {height: lineH, backgroundColor: color},
        ]}
      />
      <View
        style={[
          styles.ordersLineShort,
          {height: lineH, backgroundColor: color},
        ]}
      />
      <View
        style={[
          styles.ordersLineMedium,
          {height: lineH, backgroundColor: color},
        ]}
      />
    </View>
  );
}

/** Alias for create-order grid/list toggle. */
export const LayoutGridIcon = FloorTabIcon;
export const ListViewIcon = OrdersTabIcon;

export function UsersIcon({size = 14, color = '#065F46'}: IconProps) {
  const head = size * 0.28;
  return (
    <View style={[styles.box, {width: size, height: size}]}>
      <View style={styles.usersRow}>
        <View style={styles.alignCenter}>
          <View
            style={[
              styles.userHeadFaded,
              {
                width: head * 0.85,
                height: head * 0.85,
                borderRadius: head,
                backgroundColor: color,
              },
            ]}
          />
          <View
            style={[
              styles.userBodyFaded,
              {
                width: head * 1.2,
                height: head * 0.7,
                borderTopLeftRadius: head,
                borderTopRightRadius: head,
                backgroundColor: color,
              },
            ]}
          />
        </View>
        <View style={styles.userFront}>
          <View
            style={{
              width: head,
              height: head,
              borderRadius: head,
              backgroundColor: color,
            }}
          />
          <View
            style={[
              styles.userBodyFront,
              {
                width: head * 1.45,
                height: head * 0.85,
                borderTopLeftRadius: head,
                borderTopRightRadius: head,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    borderBottomWidth: 2,
    borderRightWidth: 2,
    transform: [{rotate: '45deg'}],
    marginTop: -2,
  },
  bellTop: {
    borderWidth: 1.5,
    marginBottom: 1,
  },
  bellBody: {
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  bellClapperBar: {
    height: 2.5,
    borderRadius: 2,
    marginTop: 1,
  },
  bellClapper: {
    marginTop: 1.5,
  },
  row: {
    flexDirection: 'row',
  },
  floorCell: {
    borderRadius: 2,
  },
  ordersBox: {
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  ordersLineFull: {
    borderRadius: 1,
    width: '100%',
  },
  ordersLineShort: {
    borderRadius: 1,
    width: '78%',
  },
  ordersLineMedium: {
    borderRadius: 1,
    width: '90%',
  },
  usersRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  alignCenter: {
    alignItems: 'center',
  },
  userFront: {
    alignItems: 'center',
    marginLeft: -4,
  },
  userHeadFaded: {
    opacity: 0.55,
  },
  userBodyFaded: {
    opacity: 0.55,
    marginTop: 1,
  },
  userBodyFront: {
    marginTop: 1,
  },
});
