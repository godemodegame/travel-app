import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, NativeModules, Pressable, StyleSheet, Text, View} from 'react-native';
import {WebView} from 'react-native-webview';
import type {SoundscapeScript} from '@/domain/models/SoundscapeScript';
import {resolveSampleAssetUriCandidates} from '@/presentation/audio/soundAssetMap';
import {ENGINE_HTML} from '@/presentation/components/soundscapeEngineHtml';
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
          originWhitelist={['http://localhost:8081', 'about:blank']}
          source={{html: ENGINE_HTML, baseUrl: engineBaseUrl}}
          style={styles.webview}
          cacheEnabled={false}
          incognito
          javaScriptEnabled
          mixedContentMode="never"
          allowFileAccess={false}
          allowingReadAccessToURL="about:blank"
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={request => {
            if (request.url === 'about:blank' || request.url === engineBaseUrl) {
              return true;
            }
            return request.url.startsWith(`${engineBaseUrl}/`);
          }}
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
              if (!data || typeof data.type !== 'string') {
                return;
              }

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
                setStatus(`Warning: ${typeof data.message === 'string' ? data.message : 'Unknown warning'}`);
              } else if (data.type === 'error') {
                setIsLoading(false);
                setIsPlaying(false);
                setStatus(`Error: ${typeof data.message === 'string' ? data.message : 'Unknown error'}`);
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
