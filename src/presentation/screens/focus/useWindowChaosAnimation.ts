import type {MutableRefObject} from 'react';
import {useEffect, useRef} from 'react';
import {Animated} from 'react-native';

type Result = {
  driftXRefs: MutableRefObject<Animated.Value[]>;
  driftYRefs: MutableRefObject<Animated.Value[]>;
};

export const useWindowChaosAnimation = (windowCount: number): Result => {
  const driftXRefs = useRef<Animated.Value[]>([]);
  const driftYRefs = useRef<Animated.Value[]>([]);
  const activeAnimationsRef = useRef<Array<Animated.CompositeAnimation | null>>([]);

  if (driftXRefs.current.length !== windowCount) {
    driftXRefs.current = Array.from({length: windowCount}, (_, index) => (
      driftXRefs.current[index] ?? new Animated.Value(0)
    ));
    driftYRefs.current = Array.from({length: windowCount}, (_, index) => (
      driftYRefs.current[index] ?? new Animated.Value(0)
    ));
    activeAnimationsRef.current = Array.from({length: windowCount}, (_, index) => (
      activeAnimationsRef.current[index] ?? null
    ));
  }

  useEffect(() => {
    let isCancelled = false;

    const runChaos = (index: number): void => {
      if (isCancelled) {
        return;
      }

      const x = driftXRefs.current[index];
      const y = driftYRefs.current[index];
      const maxX = 5 + (index % 8);
      const maxY = 4 + (index % 6);
      const toX = (Math.random() * 2 - 1) * maxX;
      const toY = (Math.random() * 2 - 1) * maxY;
      const duration = 1600 + Math.floor(Math.random() * 3800);

      const animation = Animated.parallel([
        Animated.timing(x, {toValue: toX, duration, useNativeDriver: true}),
        Animated.timing(y, {toValue: toY, duration, useNativeDriver: true})
      ]);

      activeAnimationsRef.current[index] = animation;
      animation.start(({finished}) => {
        if (finished && !isCancelled) {
          runChaos(index);
        }
      });
    };

    Array.from({length: windowCount}).forEach((_, index) => runChaos(index));

    return () => {
      isCancelled = true;
      activeAnimationsRef.current.forEach(animation => animation?.stop());
      driftXRefs.current.forEach(value => value.stopAnimation());
      driftYRefs.current.forEach(value => value.stopAnimation());
    };
  }, [windowCount]);

  return {driftXRefs, driftYRefs};
};
