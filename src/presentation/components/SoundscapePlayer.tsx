import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {WebView} from 'react-native-webview';
import type {SoundscapeScript} from '@/domain/models/SoundscapeScript';
import {colors} from '@/theme/colors';

type Props = {
  script: SoundscapeScript;
  title: string;
  autoPlaySignal?: number;
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
  let activeNodes = [];
  let stopTimer = null;

  function cleanup() {
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    activeNodes.forEach(node => {
      try { node.stop && node.stop(); } catch (_) {}
      try { node.disconnect && node.disconnect(); } catch (_) {}
    });
    activeNodes = [];
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
    const src = audioCtx.createBufferSource();
    src.buffer = createNoiseBuffer(audioCtx, loopLengthSec, brightness);
    src.loop = true;

    const low = audioCtx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 1400 + brightness * 1400;

    const high = audioCtx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 180;

    const g = audioCtx.createGain();
    g.gain.value = gain;

    src.connect(low);
    low.connect(high);
    high.connect(g);
    g.connect(destination);

    src.start();
    activeNodes.push(src, low, high, g);
  }

  function scheduleThunder(audioCtx, destination, events, power) {
    const now = audioCtx.currentTime;
    events.forEach(event => {
      const at = now + event.atSecond;
      const noise = audioCtx.createBufferSource();
      noise.buffer = createNoiseBuffer(audioCtx, Math.max(1.2, event.durationSec), 0.1);

      const band = audioCtx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 70 + power * 90;
      band.Q.value = 0.5;

      const panner = audioCtx.createStereoPanner();
      panner.pan.value = event.pan;

      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(event.gain * (0.6 + power * 0.7), at + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, at + event.durationSec);

      noise.connect(band);
      band.connect(panner);
      panner.connect(g);
      g.connect(destination);

      noise.start(at);
      noise.stop(at + event.durationSec + 0.1);
      activeNodes.push(noise, band, panner, g);
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

    stopTimer = setTimeout(() => {
      cleanup();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'finished'}));
      }
    }, script.loopLengthSec * 1000 + 200);
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
  hideControls = false
}) => {
  const webViewRef = useRef<WebView>(null);
  const pendingAutoPlayRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState<string>('Idle');

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
    webViewRef.current?.injectJavaScript('window.__hokusStop(); true;');
  };

  useEffect(() => {
    if (autoPlaySignal === undefined) {
      return;
    }
    play();
  }, [autoPlaySignal]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>{`Loop ${script.loopLengthSec}s`}</Text>
      <Text style={styles.meta}>{status}</Text>

      {!hideControls ? (
        <View style={styles.row}>
          <Pressable style={styles.playButton} onPress={play}>
            <Text style={styles.buttonText}>Play</Text>
          </Pressable>
          <Pressable style={styles.stopButton} onPress={stop}>
            <Text style={styles.buttonText}>Stop</Text>
          </Pressable>
        </View>
      ) : null}

      <WebView
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
    backgroundColor: '#6A6A6A',
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
