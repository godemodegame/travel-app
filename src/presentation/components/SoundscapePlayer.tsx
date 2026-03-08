import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {WebView} from 'react-native-webview';
import type {SoundscapeScript} from '@/domain/models/SoundscapeScript';
import {resolveSampleAssetUriCandidates} from '@/presentation/audio/soundAssetMap';
import {colors} from '@/theme/colors';

type Props = {
  script: SoundscapeScript;
  title: string;
  autoPlaySignal?: number;
  stopSignal?: number;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  hideControls?: boolean;
};

type EnginePayload = {
  script: SoundscapeScript;
  sampleUriMap: Record<string, string[]>;
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
  let sampleBufferCache = {};

  function post(type, data) {
    if (!window.ReactNativeWebView) {
      return;
    }
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({type: type}, data || {})));
    } catch (_) {}
  }

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

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function createNoiseBuffer(audioCtx, seconds, brightness) {
    const sampleRate = audioCtx.sampleRate;
    const length = Math.max(1, Math.floor(seconds * sampleRate));
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

  async function decodeFromCandidates(sampleName, candidates) {
    const audioCtx = ensureCtx();
    let lastError = null;

    for (let i = 0; i < candidates.length; i++) {
      const uri = candidates[i];
      try {
        const response = await fetch(uri, {cache: 'no-store'});
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ' @ ' + uri);
        }
        const arrayBuffer = await response.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
        return decoded;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('No URI candidates for sample: ' + sampleName);
  }

  async function preloadSamples(sampleUriMap) {
    const entries = Object.entries(sampleUriMap || {});
    const failed = [];

    for (let i = 0; i < entries.length; i++) {
      const pair = entries[i];
      const sampleName = pair[0];
      const candidates = pair[1];

      if (!Array.isArray(candidates) || candidates.length === 0) {
        failed.push(sampleName + ' (missing URI)');
        continue;
      }

      try {
        sampleBufferCache[sampleName] = await decodeFromCandidates(sampleName, candidates);
      } catch (error) {
        failed.push(sampleName + ' (' + String(error) + ')');
      }
    }

    if (failed.length > 0) {
      post('warning', {
        message: 'Sample preload failed for: ' + failed.slice(0, 3).join(' | ') + (failed.length > 3 ? ' ...' : '')
      });
    }
  }

  function scheduleSampleEvent(audioCtx, destination, event, sampleBuffer, nowSec) {
    const at = nowSec + event.atSecond;
    const panner = audioCtx.createStereoPanner();
    panner.pan.value = event.pan || 0;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(clamp(event.gain || 0.2, 0.03, 1), at);

    const source = audioCtx.createBufferSource();
    source.buffer = sampleBuffer;
    source.playbackRate.value = clamp((sampleBuffer.duration || 0.2) / Math.max(0.07, event.durationSec || 0.2), 0.5, 2.4);

    source.connect(panner);
    panner.connect(gain);
    gain.connect(destination);

    source.start(at);
    source.stop(at + Math.max(0.06, event.durationSec || 0.2));
    activeNodes.push(source, panner, gain);
  }

  function scheduleRainFallback(audioCtx, destination, loopLengthSec, gain, brightness) {
    const baseSrc = audioCtx.createBufferSource();
    baseSrc.buffer = createNoiseBuffer(audioCtx, loopLengthSec, brightness * 0.7 + 0.2);
    baseSrc.loop = true;

    const low = audioCtx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 1200 + brightness * 1100;

    const high = audioCtx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 130;

    const g = audioCtx.createGain();
    g.gain.value = gain * 0.4;

    baseSrc.connect(low);
    low.connect(high);
    high.connect(g);
    g.connect(destination);

    baseSrc.start();
    activeNodes.push(baseSrc, low, high, g);
  }

  function scheduleLoop(script) {
    const audioCtx = ensureCtx();
    const now = audioCtx.currentTime;

    script.layers.forEach(layer => {
      const layerHasSample = layer.events.some(event => event.sample && sampleBufferCache[event.sample]);

      if (layer.type === 'rain' && !layerHasSample) {
        const normalizedTexture = ((script.params && script.params.rainTexture) || 0) / 100;
        scheduleRainFallback(audioCtx, masterNode, script.loopLengthSec, layer.gain, normalizedTexture);
      }

      layer.events.forEach(event => {
        const sampleName = event.sample;
        if (!sampleName) {
          return;
        }
        const sampleBuffer = sampleBufferCache[sampleName];
        if (!sampleBuffer) {
          return;
        }
        scheduleSampleEvent(audioCtx, masterNode, event, sampleBuffer, now);
      });
    });
  }

  async function play(payloadObject) {
    cleanup();

    const audioCtx = ensureCtx();
    sampleBufferCache = {};

    const master = audioCtx.createGain();
    master.gain.value = 0.9;
    master.connect(audioCtx.destination);
    masterNode = master;
    activeNodes.push(master);

    await preloadSamples(payloadObject.sampleUriMap || {});

    scheduleLoop(payloadObject.script);
    const loopIntervalId = setInterval(function () {
      if (!ctx || ctx.state === 'closed' || !masterNode) {
        return;
      }
      scheduleLoop(payloadObject.script);
    }, payloadObject.script.loopLengthSec * 1000);
    activeIntervals.push(loopIntervalId);

    post('started');
  }

  window.__hokusPlay = async function (payload) {
    try {
      const parsed = JSON.parse(payload);
      await play(parsed);
    } catch (e) {
      post('error', {message: String(e)});
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
    sampleBufferCache = {};
    post('stopped');
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
    const sampleNames = Array.from(
      new Set(script.layers.flatMap(layer => layer.events.map(event => event.sample).filter(Boolean) as string[]))
    );

    const sampleUriMap = sampleNames.reduce<Record<string, string[]>>((acc, sampleName) => {
      const candidates = resolveSampleAssetUriCandidates(sampleName);
      if (candidates.length > 0) {
        acc[sampleName] = candidates;
      }
      return acc;
    }, {});

    const data: EnginePayload = {
      script,
      sampleUriMap
    };

    return JSON.stringify(data);
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
            } else if (data.type === 'warning') {
              setStatus(`Warning: ${data.message}`);
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
