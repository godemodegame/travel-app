import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, NativeModules, Pressable, StyleSheet, Text, View} from 'react-native';
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
  let outputNode = null;
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
    if (ctx && outputNode) {
      try {
        outputNode.gain.cancelScheduledValues(ctx.currentTime);
        outputNode.gain.setValueAtTime(0, ctx.currentTime);
      } catch (_) {}
    }

    activeIntervals.forEach(intervalId => {
      try { clearTimeout(intervalId); } catch (_) {}
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
      outputNode = ctx.createGain();
      outputNode.gain.value = 1;
      outputNode.connect(ctx.destination);
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
    const errors = [];

    for (let i = 0; i < candidates.length; i++) {
      const uri = candidates[i];
      try {
        const response = await fetch(uri, {cache: 'no-store'});
        if (!response.ok) {
          errors.push(uri + ' -> HTTP ' + response.status);
          continue;
        }
        const arrayBuffer = await response.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
        return decoded;
      } catch (error) {
        errors.push(uri + ' -> ' + String(error));
      }
    }

    throw new Error('Sample "' + sampleName + '" failed: ' + (errors.length > 0 ? errors.join(' | ') : 'no URI candidates'));
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
        const message = error instanceof Error ? error.message : String(error);
        failed.push(message);
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
    if (outputNode) {
      try {
        outputNode.gain.cancelScheduledValues(audioCtx.currentTime);
        outputNode.gain.setValueAtTime(1, audioCtx.currentTime);
      } catch (_) {}
    }
    sampleBufferCache = {};

    const master = audioCtx.createGain();
    master.gain.value = 0.9;
    master.connect(outputNode || audioCtx.destination);
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
    if (ctx && outputNode) {
      try {
        outputNode.gain.cancelScheduledValues(ctx.currentTime);
        outputNode.gain.setValueAtTime(0, ctx.currentTime);
      } catch (_) {}
    }
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
      outputNode = null;
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
  const stopFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState<string>('Idle');
  const [engineNonce, setEngineNonce] = useState(0);
  const [engineMounted, setEngineMounted] = useState(true);
  const engineBaseUrl = useMemo(() => {
    const scriptUrl = NativeModules?.SourceCode?.scriptURL as string | undefined;
    if (scriptUrl && scriptUrl.startsWith('http')) {
      try {
        return new URL(scriptUrl).origin;
      } catch {
        // Ignore malformed scriptURL and fallback to localhost.
      }
    }
    return 'http://localhost:8081';
  }, []);

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
    setIsLoading(true);
    setStatus('Starting...');
    const escaped = payload.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
    webViewRef.current?.injectJavaScript(`window.__hokusPlay(\`${escaped}\`); true;`);
  };

  const play = (): void => {
    if (!isReady) {
      setIsLoading(true);
      setStatus('Loading audio engine...');
      pendingAutoPlayRef.current = true;
      return;
    }
    playUnsafe();
  };

  const stop = (): void => {
    if (stopFallbackTimerRef.current) {
      clearTimeout(stopFallbackTimerRef.current);
      stopFallbackTimerRef.current = null;
    }
    if (remountTimerRef.current) {
      clearTimeout(remountTimerRef.current);
      remountTimerRef.current = null;
    }

    setIsLoading(false);
    setIsPlaying(false);
    setStatus('Stopped');
    pendingAutoPlayRef.current = false;
    webViewRef.current?.injectJavaScript('window.__hokusStop(); true;');
    setIsReady(false);

    // Hard-stop path: unmount the engine to guarantee AudioContext teardown.
    setEngineMounted(false);
    remountTimerRef.current = setTimeout(() => {
      setEngineNonce(prev => prev + 1);
      setEngineMounted(true);
      remountTimerRef.current = null;
    }, 16);

    // Fallback reset in case the injected stop script does not execute.
    stopFallbackTimerRef.current = setTimeout(() => {
      setIsReady(false);
      setEngineMounted(false);
      remountTimerRef.current = setTimeout(() => {
        setEngineNonce(prev => prev + 1);
        setEngineMounted(true);
        remountTimerRef.current = null;
      }, 16);
      stopFallbackTimerRef.current = null;
    }, 80);
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

  useEffect(() => {
    return () => {
      if (stopFallbackTimerRef.current) {
        clearTimeout(stopFallbackTimerRef.current);
        stopFallbackTimerRef.current = null;
      }
      if (remountTimerRef.current) {
        clearTimeout(remountTimerRef.current);
        remountTimerRef.current = null;
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>{`Loop ${script.loopLengthSec}s`}</Text>
      <Text style={styles.meta}>{status}</Text>

      {!hideControls ? (
        <View style={styles.row}>
          <Pressable
            style={[styles.playButton, (isLoading || isPlaying) && styles.disabledButton]}
            onPress={play}
            disabled={isLoading || isPlaying}>
            <Text style={styles.buttonText}>{isLoading ? 'Loading...' : 'Play'}</Text>
          </Pressable>
          <Pressable style={styles.stopButton} onPress={stop}>
            <Text style={styles.buttonText}>Stop</Text>
          </Pressable>
        </View>
      ) : null}

      {engineMounted ? (
        <WebView
          key={`sound-engine-${engineNonce}`}
          ref={webViewRef}
          originWhitelist={['*']}
          source={{html: ENGINE_HTML, baseUrl: engineBaseUrl}}
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
                setIsLoading(false);
                setIsPlaying(true);
                setStatus('Playing');
              } else if (data.type === 'stopped') {
                if (stopFallbackTimerRef.current) {
                  clearTimeout(stopFallbackTimerRef.current);
                  stopFallbackTimerRef.current = null;
                }
                setIsLoading(false);
              setIsPlaying(false);
              setStatus('Stopped');
            } else if (data.type === 'warning') {
              setStatus(`Warning: ${data.message}`);
            } else if (data.type === 'error') {
              setIsLoading(false);
              setIsPlaying(false);
              setStatus(`Error: ${data.message}`);
            }
          } catch {
            setIsLoading(false);
            setIsPlaying(false);
            setStatus('Player message parse error');
          }
        }}
        />
      ) : null}

      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#0A246A" />
          <Text style={styles.loadingText}>Loading playback...</Text>
        </View>
      ) : null}
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
  disabledButton: {
    opacity: 0.6
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
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  loadingText: {
    color: '#0A246A',
    fontSize: 11,
    fontWeight: '700'
  }
});
