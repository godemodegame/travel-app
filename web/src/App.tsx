import {useMemo, useRef, useState} from 'react';

type Tab = 'focus' | 'mint' | 'library';

type SoundParams = {
  rainIntensity: number;
  thunderChance: number;
  forestDensity: number;
  windDepth: number;
};

type HokusNft = {
  mintAddress: string;
  name: string;
  loopLengthSec: number;
  soundParams: SoundParams;
};

class RainEngine {
  private ctx: AudioContext | null = null;
  private nodes: AudioNode[] = [];
  private sources: AudioScheduledSourceNode[] = [];
  private thunderTimer: number | null = null;

  private ensureCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private noiseBuffer(seconds: number, brightness: number): AudioBuffer {
    const ctx = this.ensureCtx();
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    const alpha = 0.95 - brightness * 0.32;
    for (let i = 0; i < len; i += 1) {
      const white = Math.random() * 2 - 1;
      last = alpha * last + (1 - alpha) * white;
      data[i] = last;
    }
    return buffer;
  }

  stop(): void {
    if (this.thunderTimer) {
      window.clearInterval(this.thunderTimer);
      this.thunderTimer = null;
    }
    this.sources.forEach(src => {
      try {
        src.stop();
      } catch {
        // ignore
      }
    });
    this.nodes.forEach(node => {
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    });
    this.nodes = [];
    this.sources = [];
  }

  play(nft: HokusNft): void {
    this.stop();
    const ctx = this.ensureCtx();

    const master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);
    this.nodes.push(master);

    const bed = ctx.createBufferSource();
    bed.buffer = this.noiseBuffer(Math.max(12, nft.loopLengthSec), nft.soundParams.rainIntensity / 100);
    bed.loop = true;

    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 1300 + nft.soundParams.rainIntensity * 10;

    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 150;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.35 + nft.soundParams.rainIntensity / 160;

    bed.connect(low);
    low.connect(high);
    high.connect(rainGain);
    rainGain.connect(master);

    bed.start();
    this.sources.push(bed);
    this.nodes.push(low, high, rainGain);

    if (nft.soundParams.thunderChance >= 65) {
      const thunderPulse = () => {
        const at = ctx.currentTime;

        const crack = ctx.createBufferSource();
        crack.buffer = this.noiseBuffer(0.5, 0.2);
        const crackBand = ctx.createBiquadFilter();
        crackBand.type = 'bandpass';
        crackBand.frequency.value = 1300;
        const crackGain = ctx.createGain();
        crackGain.gain.setValueAtTime(0.0001, at);
        crackGain.gain.exponentialRampToValueAtTime(0.45, at + 0.02);
        crackGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);

        const rumble = ctx.createBufferSource();
        rumble.buffer = this.noiseBuffer(3.5, 0.08);
        const rumbleLow = ctx.createBiquadFilter();
        rumbleLow.type = 'lowpass';
        rumbleLow.frequency.value = 220;
        const rumbleGain = ctx.createGain();
        rumbleGain.gain.setValueAtTime(0.0001, at + 0.04);
        rumbleGain.gain.exponentialRampToValueAtTime(0.5, at + 0.3);
        rumbleGain.gain.exponentialRampToValueAtTime(0.0001, at + 2.8);

        crack.connect(crackBand);
        crackBand.connect(crackGain);
        crackGain.connect(master);

        rumble.connect(rumbleLow);
        rumbleLow.connect(rumbleGain);
        rumbleGain.connect(master);

        crack.start(at);
        crack.stop(at + 0.5);
        rumble.start(at + 0.03);
        rumble.stop(at + 3.2);

        this.sources.push(crack, rumble);
        this.nodes.push(crackBand, crackGain, rumbleLow, rumbleGain);
      };

      thunderPulse();
      const spacing = Math.max(9000, 16000 - nft.soundParams.thunderChance * 55);
      this.thunderTimer = window.setInterval(thunderPulse, spacing);
    }
  }
}

const randomNft = (serial: number): HokusNft => {
  const rand = () => Math.floor(Math.random() * 100);
  return {
    mintAddress: `WEB${Date.now().toString(36)}${serial.toString(36)}`,
    name: `Hokus Sound #${String(serial).padStart(4, '0')}`,
    loopLengthSec: 48 + Math.floor(Math.random() * 132),
    soundParams: {
      rainIntensity: 35 + rand(),
      thunderChance: rand(),
      forestDensity: rand(),
      windDepth: rand()
    }
  };
};

export function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [tab, setTab] = useState<Tab>('focus');
  const [nfts, setNfts] = useState<HokusNft[]>([]);
  const [activeMintAddress, setActiveMintAddress] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const engineRef = useRef(new RainEngine());

  const activeNft = useMemo(
    () => nfts.find(n => n.mintAddress === activeMintAddress) ?? nfts[0] ?? null,
    [nfts, activeMintAddress]
  );

  const connectWallet = () => setWalletConnected(true);

  const mintNft = () => {
    const nft = randomNft(nfts.length + 1);
    setNfts(prev => [nft, ...prev]);
    setActiveMintAddress(nft.mintAddress);
    setTab('focus');
  };

  const togglePlay = () => {
    if (!activeNft) {
      setTab('mint');
      return;
    }

    if (isPlaying) {
      engineRef.current.stop();
      setIsPlaying(false);
      return;
    }

    engineRef.current.play(activeNft);
    setIsPlaying(true);
  };

  const selectNft = (mintAddress: string) => {
    if (mintAddress === activeMintAddress) return;
    engineRef.current.stop();
    setIsPlaying(false);
    setActiveMintAddress(mintAddress);
  };

  if (!walletConnected) {
    const finalStep = onboardingStep >= 2;
    return (
      <div className="onboarding-root">
        <div className="panel">
          <div className="panel-title">Hokus Setup</div>
          {!finalStep ? (
            <>
              <h1>{onboardingStep === 0 ? 'Welcome to Hokus' : 'Mint NFT Sound Profiles'}</h1>
              <p>
                {onboardingStep === 0
                  ? 'Ambient focus app where each NFT has unique rain DNA.'
                  : 'Mint, select active NFT, press PLAY. Thunder layer adds thunder sounds.'}
              </p>
              <div className="row">
                <button onClick={() => setOnboardingStep(2)}>Skip Intro</button>
                <button onClick={() => setOnboardingStep(s => s + 1)}>Next</button>
              </div>
            </>
          ) : (
            <>
              <h1>Connect Wallet</h1>
              <p>Web demo mode: wallet connection is simulated.</p>
              <button onClick={connectWallet}>Connect Wallet</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <header>
        <h1>Hokus Web</h1>
        <div className="tabs">
          <button onClick={() => setTab('focus')} className={tab === 'focus' ? 'active' : ''}>Focus</button>
          <button onClick={() => setTab('mint')} className={tab === 'mint' ? 'active' : ''}>Mint</button>
          <button onClick={() => setTab('library')} className={tab === 'library' ? 'active' : ''}>My NFTs</button>
        </div>
      </header>

      {tab === 'focus' ? (
        <section className="panel">
          <div className="panel-title">Hokus Player</div>
          <h2>{activeNft ? activeNft.name : 'No NFT loaded'}</h2>
          <p>{activeNft ? `Loop ${activeNft.loopLengthSec}s` : 'Mint NFT to unlock playback'}</p>
          <button onClick={togglePlay}>{activeNft ? (isPlaying ? 'STOP' : 'PLAY') : 'MINT'}</button>
          {nfts.length > 1 ? (
            <div className="chips">
              {nfts.map(nft => (
                <button
                  key={nft.mintAddress}
                  className={nft.mintAddress === activeNft?.mintAddress ? 'chip active' : 'chip'}
                  onClick={() => selectNft(nft.mintAddress)}>
                  {nft.name}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === 'mint' ? (
        <section className="panel">
          <div className="panel-title">Mint</div>
          <h2>Create NFT</h2>
          <p>Devnet-style demo mint (free in web version).</p>
          <button onClick={mintNft}>Mint NFT</button>
        </section>
      ) : null}

      {tab === 'library' ? (
        <section className="panel">
          <div className="panel-title">My NFTs</div>
          <h2>{nfts.length} profiles</h2>
          {nfts.length === 0 ? <p>No NFTs yet.</p> : null}
          <div className="list">
            {nfts.map(nft => (
              <div key={nft.mintAddress} className="list-item">
                <strong>{nft.name}</strong>
                <span>{`rain ${nft.soundParams.rainIntensity} • thunder ${nft.soundParams.thunderChance}`}</span>
                <button onClick={() => { setTab('focus'); selectNft(nft.mintAddress); }}>Set Active</button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
