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
        style={{
          width: size * 0.18,
          height: size * 0.14,
          borderRadius: size,
          borderWidth: 1.5,
          borderColor: color,
          marginBottom: 1,
        }}
      />
      <View
        style={{
          width: bodyW,
          height: bodyH,
          borderTopLeftRadius: bodyW / 2,
          borderTopRightRadius: bodyW / 2,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          width: size * 0.72,
          height: 2.5,
          borderRadius: 2,
          backgroundColor: color,
          marginTop: 1,
        }}
      />
      <View
        style={{
          width: size * 0.16,
          height: size * 0.16,
          borderRadius: size,
          backgroundColor: color,
          marginTop: 1.5,
        }}
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
      <View style={{flexDirection: 'row', gap}}>
        <View
          style={{
            width: cell,
            height: cell,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
        <View
          style={{
            width: cell,
            height: cell,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
      </View>
      <View style={{flexDirection: 'row', gap}}>
        <View
          style={{
            width: cell,
            height: cell,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
        <View
          style={{
            width: cell,
            height: cell,
            borderRadius: 2,
            backgroundColor: color,
          }}
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
        {
          width: size,
          height: size,
          alignItems: 'stretch',
          justifyContent: 'center',
          gap,
          paddingHorizontal: size * 0.08,
        },
      ]}>
      <View
        style={{
          height: lineH,
          borderRadius: 1,
          backgroundColor: color,
          width: '100%',
        }}
      />
      <View
        style={{
          height: lineH,
          borderRadius: 1,
          backgroundColor: color,
          width: '78%',
        }}
      />
      <View
        style={{
          height: lineH,
          borderRadius: 1,
          backgroundColor: color,
          width: '90%',
        }}
      />
    </View>
  );
}

export function UsersIcon({size = 14, color = '#065F46'}: IconProps) {
  const head = size * 0.28;
  return (
    <View style={[styles.box, {width: size, height: size}]}>
      <View style={{flexDirection: 'row', alignItems: 'flex-end', gap: 2}}>
        <View style={{alignItems: 'center'}}>
          <View
            style={{
              width: head * 0.85,
              height: head * 0.85,
              borderRadius: head,
              backgroundColor: color,
              opacity: 0.55,
            }}
          />
          <View
            style={{
              width: head * 1.2,
              height: head * 0.7,
              borderTopLeftRadius: head,
              borderTopRightRadius: head,
              backgroundColor: color,
              opacity: 0.55,
              marginTop: 1,
            }}
          />
        </View>
        <View style={{alignItems: 'center', marginLeft: -4}}>
          <View
            style={{
              width: head,
              height: head,
              borderRadius: head,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              width: head * 1.45,
              height: head * 0.85,
              borderTopLeftRadius: head,
              borderTopRightRadius: head,
              backgroundColor: color,
              marginTop: 1,
            }}
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
});
