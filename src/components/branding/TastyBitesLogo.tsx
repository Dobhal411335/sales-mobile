import React from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
} from 'react-native';

export type TastyBitesLogoSize = 'small' | 'medium' | 'large' | number;
export type TastyBitesLogoVariant = 'full' | 'compact' | 'app-icon';

export interface TastyBitesLogoProps {
  /**
   * Logo presentation variant.
   * All variants use the same tastybites-mobile branding asset.
   * - 'full': Large mark for Login, Splash, Auth screens
   * - 'compact': Compact badge for headers and toolbars
   * - 'app-icon': App icon squircle badge (same asset as OS launcher)
   * @default 'full'
   */
  variant?: TastyBitesLogoVariant;

  /**
   * Preset size or explicit numeric pixel dimension (maintains 1:1 aspect ratio).
   * - 'small': 36px (default for compact / app-icon variant)
   * - 'medium': 120px
   * - 'large': 240px (default for full variant)
   * - number: Custom pixel dimension
   */
  size?: TastyBitesLogoSize;

  /**
   * Additional style overrides for the Image component.
   */
  style?: StyleProp<ImageStyle>;

  /**
   * Accessibility label for screen readers.
   * @default 'Tasty Bites Restaurant POS'
   */
  accessibilityLabel?: string;

  /**
   * Test identifier for automation.
   */
  testID?: string;
}

const BRAND_LOGO_SOURCE = require('../../assets/branding/tastybites-mobile.png');

const PRESET_SIZES: Record<Exclude<TastyBitesLogoSize, number>, number> = {
  small: 36,
  medium: 120,
  large: 240,
};

function resolveDimension(
  size?: TastyBitesLogoSize,
  variant?: TastyBitesLogoVariant,
): number {
  if (typeof size === 'number') {
    return size;
  }
  if (size && size in PRESET_SIZES) {
    return PRESET_SIZES[size];
  }
  return variant === 'full' ? PRESET_SIZES.large : PRESET_SIZES.small;
}

export function TastyBitesLogo({
  variant = 'full',
  size,
  style,
  accessibilityLabel = 'Tasty Bites Restaurant POS',
  testID = 'tasty-bites-logo',
}: TastyBitesLogoProps) {
  const dimension = resolveDimension(size, variant);

  return (
    <Image
      source={BRAND_LOGO_SOURCE}
      style={[
        styles.logo,
        {
          width: dimension,
          height: dimension,
        },
        style,
      ]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    aspectRatio: 1,
  },
});
