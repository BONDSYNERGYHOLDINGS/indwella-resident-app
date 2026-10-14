import React, { useState } from 'react';
import { Animated } from 'react-native';
import BootSplash from 'react-native-bootsplash';

type Props = {
  /** Flip to true once startup work (auth restore) is done; the splash then animates out. */
  ready: boolean;
  onAnimationEnd: () => void;
};

// Matches the native launch screen (generated into the android/ios projects by
// `react-native-bootsplash generate`, see docs/HANDOFF.md) pixel for pixel, so the
// handoff from native to JS has no flash, then fades and zooms the logo away.
const AnimatedBootSplash = ({ ready, onAnimationEnd }: Props) => {
  const [opacity] = useState(() => new Animated.Value(1));
  const [scale] = useState(() => new Animated.Value(1));

  const { container, logo } = BootSplash.useHideAnimation({
    ready,
    manifest: require('../assets/bootsplash/manifest.json'),
    logo: require('../assets/bootsplash/logo.png'),
    animate: () => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.25, duration: 350, useNativeDriver: true }),
      ]).start(() => onAnimationEnd());
    },
  });

  return (
    <Animated.View {...container} style={[container.style, { opacity }]}>
      <Animated.Image {...logo} style={[logo.style, { transform: [{ scale }] }]} />
    </Animated.View>
  );
};

export default AnimatedBootSplash;
