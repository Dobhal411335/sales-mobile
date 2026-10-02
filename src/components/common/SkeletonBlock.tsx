import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, type StyleProp, type ViewStyle} from 'react-native';

interface SkeletonBlockProps {
  style?: StyleProp<ViewStyle>;
}

export function SkeletonBlock({style}: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => {
      pulse.stop();
    };
  }, [opacity]);

  return <Animated.View style={[styles.bone, style, {opacity}]} />;
}

const styles = StyleSheet.create({
  bone: {
    backgroundColor: '#E4E4E7',
    borderRadius: 8,
  },
});
