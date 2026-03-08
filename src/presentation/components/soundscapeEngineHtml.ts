export const ENGINE_HTML = `
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
