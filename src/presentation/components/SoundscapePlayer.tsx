import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {WebView} from 'react-native-webview';
import type {SoundscapeScript} from '@/domain/models/SoundscapeScript';
import {colors} from '@/theme/colors';

type Props = {
  script: SoundscapeScript;
  title: string;
  autoPlaySignal?: number;
  stopSignal?: number;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  hideControls?: boolean;
};

const ENGINE_HTML = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body>
<script>
(function () {
  let ctx = null;
  let masterNode = null;
  let activeNodes = [];
  let activeIntervals = [];

  function cleanup() {
    activeIntervals.forEach(intervalId => {
      try { clearInterval(intervalId); } catch (_) {}
    });
    activeIntervals = [];
    activeNodes.forEach(node => {
      try { node.stop && node.stop(); } catch (_) {}
      try { node.disconnect && node.disconnect(); } catch (_) {}
    });
    activeNodes = [];

    if (masterNode) {
      try { masterNode.gain && masterNode.gain.setValueAtTime(0, ctx ? ctx.currentTime : 0); } catch (_) {}
      try { masterNode.disconnect && masterNode.disconnect(); } catch (_) {}
      masterNode = null;
    }
  }

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  function createNoiseBuffer(audioCtx, seconds, brightness) {
    const sampleRate = audioCtx.sampleRate;
    const length = Math.floor(seconds * sampleRate);
    const buffer = audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let last = 0;
    const alpha = 0.95 - brightness * 0.35;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = alpha * last + (1 - alpha) * white;
      data[i] = last;
    }

    return buffer;
  }

  function scheduleRain(audioCtx, destination, loopLengthSec, gain, brightness) {
    const baseSrc = audioCtx.createBufferSource();
    baseSrc.buffer = createNoiseBuffer(audioCtx, loopLengthSec, brightness * 0.7 + 0.2);
    baseSrc.loop = true;

    const splashSrc = audioCtx.createBufferSource();
    splashSrc.buffer = createNoiseBuffer(audioCtx, loopLengthSec, 1.0);
    splashSrc.loop = true;

    const baseLow = audioCtx.createBiquadFilter();
    baseLow.type = 'lowpass';
    baseLow.frequency.value = 1200 + brightness * 1200;

    const baseHigh = audioCtx.createBiquadFilter();
    baseHigh.type = 'highpass';
    baseHigh.frequency.value = 140;

    const splashHigh = audioCtx.createBiquadFilter();
    splashHigh.type = 'highpass';
    splashHigh.frequency.value = 2200 + brightness * 1500;

    const splashLow = audioCtx.createBiquadFilter();
    splashLow.type = 'lowpass';
    splashLow.frequency.value = 7200;

    const baseGain = audioCtx.createGain();
    baseGain.gain.value = gain * 0.85;

    const splashGain = audioCtx.createGain();
    splashGain.gain.value = gain * (0.16 + brightness * 0.16);

    // Slow volume drift makes rain less static and more natural.
    const rainLfo = audioCtx.createOscillator();
    rainLfo.type = 'sine';
    rainLfo.frequency.value = 0.035 + brightness * 0.055;
    const rainLfoDepth = audioCtx.createGain();
    rainLfoDepth.gain.value = gain * 0.06;

    const rainMaster = audioCtx.createGain();
    rainMaster.gain.value = 1;

    baseSrc.connect(baseLow);
    baseLow.connect(baseHigh);
    baseHigh.connect(baseGain);
    baseGain.connect(rainMaster);

    splashSrc.connect(splashHigh);
    splashHigh.connect(splashLow);
    splashLow.connect(splashGain);
    splashGain.connect(rainMaster);

    rainLfo.connect(rainLfoDepth);
    rainLfoDepth.connect(rainMaster.gain);

    rainMaster.connect(destination);

    baseSrc.start();
    splashSrc.start();
    rainLfo.start();
    activeNodes.push(
      baseSrc,
      splashSrc,
      baseLow,
      baseHigh,
      splashHigh,
      splashLow,
      baseGain,
      splashGain,
      rainLfo,
      rainLfoDepth,
      rainMaster
    );
  }

  function scheduleThunder(audioCtx, destination, events, power) {
    const now = audioCtx.currentTime;
    events.forEach(event => {
      const at = now + event.atSecond;
      const panner = audioCtx.createStereoPanner();
      panner.pan.value = event.pan;

      // Bright crack transient.
      const crackNoise = audioCtx.createBufferSource();
      crackNoise.buffer = createNoiseBuffer(audioCtx, 0.6, 0.25);
      const crackBand = audioCtx.createBiquadFilter();
      crackBand.type = 'bandpass';
      crackBand.frequency.value = 1100 + power * 1700;
      crackBand.Q.value = 0.9;
      const crackGain = audioCtx.createGain();
      crackGain.gain.setValueAtTime(0.0001, at);
      crackGain.gain.exponentialRampToValueAtTime(event.gain * (0.5 + power * 0.75), at + 0.02);
      crackGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);

      // Low rumble tail.
      const rumbleNoise = audioCtx.createBufferSource();
      rumbleNoise.buffer = createNoiseBuffer(audioCtx, Math.max(2.4, event.durationSec + 1.2), 0.08);
      const rumbleLow = audioCtx.createBiquadFilter();
      rumbleLow.type = 'lowpass';
      rumbleLow.frequency.value = 170 + power * 240;
      const rumbleHigh = audioCtx.createBiquadFilter();
      rumbleHigh.type = 'highpass';
      rumbleHigh.frequency.value = 28;
      const rumbleGain = audioCtx.createGain();
      rumbleGain.gain.setValueAtTime(0.0001, at + 0.04);
      rumbleGain.gain.exponentialRampToValueAtTime(event.gain * (0.65 + power * 0.8), at + 0.28);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(2.2, event.durationSec + 0.9));

      crackNoise.connect(crackBand);
      crackBand.connect(panner);
      panner.connect(crackGain);
      crackGain.connect(destination);

      rumbleNoise.connect(rumbleLow);
      rumbleLow.connect(rumbleHigh);
      rumbleHigh.connect(panner);
      panner.connect(rumbleGain);
      rumbleGain.connect(destination);

      crackNoise.start(at);
      crackNoise.stop(at + 0.55);
      rumbleNoise.start(at + 0.03);
      rumbleNoise.stop(at + Math.max(2.6, event.durationSec + 1.3));
      activeNodes.push(
        crackNoise,
        crackBand,
        crackGain,
        rumbleNoise,
        rumbleLow,
        rumbleHigh,
        rumbleGain,
        panner
      );
    });
  }

  function scheduleForest(audioCtx, destination, events, density) {
    const now = audioCtx.currentTime;
    events.forEach(event => {
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 1000 + Math.random() * 1600 + density * 300;

      const panner = audioCtx.createStereoPanner();
      panner.pan.value = event.pan;

      const g = audioCtx.createGain();
      const at = now + event.atSecond;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(event.gain * (0.4 + density * 0.5), at + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, at + event.durationSec);

      osc.connect(panner);
      panner.connect(g);
      g.connect(destination);

      osc.start(at);
      osc.stop(at + event.durationSec + 0.02);
      activeNodes.push(osc, panner, g);
    });
  }

  function scheduleWind(audioCtx, destination, events, depth) {
    const now = audioCtx.currentTime;
    events.forEach(event => {
      const noise = audioCtx.createBufferSource();
      noise.buffer = createNoiseBuffer(audioCtx, Math.max(1.5, event.durationSec), 0.5);

      const low = audioCtx.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 300 + depth * 500;

      const panner = audioCtx.createStereoPanner();
      panner.pan.value = event.pan * 0.6;

      const g = audioCtx.createGain();
      const at = now + event.atSecond;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(event.gain * (0.35 + depth * 0.45), at + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, at + event.durationSec);

      noise.connect(low);
      low.connect(panner);
      panner.connect(g);
      g.connect(destination);

      noise.start(at);
      noise.stop(at + event.durationSec + 0.1);
      activeNodes.push(noise, low, panner, g);
    });
  }

  function play(script) {
    cleanup();
    const audioCtx = ensureCtx();

    const master = audioCtx.createGain();
    master.gain.value = 0.85;
    master.connect(audioCtx.destination);
    masterNode = master;
    activeNodes.push(master);

    const params = script.params || {};
    const normalized = {
      rainTexture: (params.rainTexture || 0) / 100,
      thunderPower: (params.thunderPower || 0) / 100,
      forestDensity: (params.forestDensity || 0) / 100,
      windDepth: (params.windDepth || 0) / 100
    };

    script.layers.forEach(layer => {
      if (layer.type === 'rain') {
        scheduleRain(audioCtx, master, script.loopLengthSec, layer.gain, normalized.rainTexture);
      }
    });

    const scheduleFxLoop = function () {
      script.layers.forEach(layer => {
        if (layer.type === 'thunder') {
          scheduleThunder(audioCtx, master, layer.events, normalized.thunderPower);
        }
        if (layer.type === 'forest') {
          scheduleForest(audioCtx, master, layer.events, normalized.forestDensity);
        }
        if (layer.type === 'wind') {
          scheduleWind(audioCtx, master, layer.events, normalized.windDepth);
        }
      });
    };

    scheduleFxLoop();
    const loopIntervalId = setInterval(function () {
      if (!ctx || ctx.state === 'closed') {
        return;
      }
      scheduleFxLoop();
    }, script.loopLengthSec * 1000);
    activeIntervals.push(loopIntervalId);
  }

  window.__hokusPlay = function (payload) {
    try {
      const script = JSON.parse(payload);
      play(script);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'started'}));
      }
    } catch (e) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', message: String(e)}));
      }
    }
  }

  window.__hokusStop = function () {
    cleanup();
    if (ctx) {
      try {
        if (ctx.state === 'running') {
          ctx.suspend();
        }
      } catch (_) {}
      try {
        ctx.close();
      } catch (_) {}
      ctx = null;
    }
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'stopped'}));
    }
  }
})();
</script>
</body>
</html>
`;

export const SoundscapePlayer: React.FC<Props> = ({
  script,
  title,
  autoPlaySignal,
  stopSignal,
  onPlaybackStateChange,
  hideControls = false
}) => {
  const webViewRef = useRef<WebView>(null);
  const pendingAutoPlayRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState<string>('Idle');
  const [engineNonce, setEngineNonce] = useState(0);

  const payload = useMemo(() => {
    return JSON.stringify(script);
  }, [script]);

  const playUnsafe = (): void => {
    setStatus('Starting...');
    const escaped = payload.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
    webViewRef.current?.injectJavaScript(`window.__hokusPlay(\`${escaped}\`); true;`);
  };

  const play = (): void => {
    if (!isReady) {
      pendingAutoPlayRef.current = true;
      return;
    }
    playUnsafe();
  };

  const stop = (): void => {
    // Optimistically update UI and force-reset WebView engine to guarantee stop.
    setIsPlaying(false);
    setStatus('Stopped');
    pendingAutoPlayRef.current = false;
    webViewRef.current?.injectJavaScript('window.__hokusStop(); true;');
    setIsReady(false);
    setEngineNonce(prev => prev + 1);
  };

  useEffect(() => {
    if (autoPlaySignal === undefined) {
      return;
    }
    play();
  }, [autoPlaySignal]);

  useEffect(() => {
    if (stopSignal === undefined) {
      return;
    }
    stop();
    setIsPlaying(false);
    setStatus('Stopped');
  }, [stopSignal]);

  useEffect(() => {
    onPlaybackStateChange?.(isPlaying);
  }, [isPlaying, onPlaybackStateChange]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>{`Loop ${script.loopLengthSec}s`}</Text>
      <Text style={styles.meta}>{status}</Text>

      {!hideControls ? (
        <View style={styles.row}>
          <Pressable style={styles.playButton} onPressIn={play}>
            <Text style={styles.buttonText}>Play</Text>
          </Pressable>
          <Pressable style={styles.stopButton} onPressIn={stop}>
            <Text style={styles.buttonText}>Stop</Text>
          </Pressable>
        </View>
      ) : null}

      <WebView
        key={`sound-engine-${engineNonce}`}
        ref={webViewRef}
        originWhitelist={['*']}
        source={{html: ENGINE_HTML}}
        style={styles.webview}
        javaScriptEnabled
        onLoadEnd={() => {
          setIsReady(true);
          if (pendingAutoPlayRef.current) {
            pendingAutoPlayRef.current = false;
            playUnsafe();
          }
        }}
        onMessage={event => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'started') {
              setIsPlaying(true);
              setStatus('Playing');
            } else if (data.type === 'stopped') {
              setIsPlaying(false);
              setStatus('Stopped');
            } else if (data.type === 'finished') {
              setIsPlaying(false);
              setStatus('Finished');
            } else if (data.type === 'error') {
              setIsPlaying(false);
              setStatus(`Error: ${data.message}`);
            }
          } catch {
            setIsPlaying(false);
            setStatus('Player message parse error');
          }
        }}
      />

      {isPlaying ? <Text style={styles.nowPlaying}>Now playing</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#DCDCDC',
    borderColor: '#8A8A8A',
    borderWidth: 1,
    padding: 10,
    gap: 6,
    marginTop: 6
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000'
  },
  meta: {
    fontSize: 11,
    color: '#222222'
  },
  row: {
    flexDirection: 'row',
    gap: 8
  },
  playButton: {
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  stopButton: {
    backgroundColor: '#C62828',
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11
  },
  webview: {
    width: 1,
    height: 1,
    opacity: 0
  },
  nowPlaying: {
    color: '#0A246A',
    fontSize: 11,
    fontWeight: '700'
  }
});
