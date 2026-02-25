# Hokus (React Native + TypeScript)

Hokus is a focus app where each NFT generates a unique script-based ambient soundscape.

## Current mint model

- Mint is **free** for now (`0 SOL`).
- Mint happens **on-chain on Solana testnet** from the app.
- Mint count is unlimited.
- Every minted NFT gets a unique `soundFingerprint`.
- Each NFT stores a numeric parameter set that drives sound generation.

## NFT sound parameters

Each NFT includes:

- `rainIntensity`, `rainTexture`
- `thunderChance`, `thunderPower`
- `forestDensity`, `windDepth`
- `rhythmComplexity`, `stereoWidth`
- `reverbAmount`, `lowNoise`

Model: [HokusNft.ts](/Users/godemodegame/repos/travel-app/src/domain/models/HokusNft.ts)

## Script generation

Sound script is deterministic from NFT parameters and fingerprint.

- Script types: rain (base), thunder (rare), forest (rarer), wind (optional)
- Generator: [generateSoundscapeScript.ts](/Users/godemodegame/repos/travel-app/src/domain/usecases/generateSoundscapeScript.ts)
- Free mint candidate + uniqueness: [mintFreeHokusNft.ts](/Users/godemodegame/repos/travel-app/src/domain/usecases/mintFreeHokusNft.ts)
- On-chain mint client (SPL + Metadata + Master Edition): [MetaplexHokusNftClient.ts](/Users/godemodegame/repos/travel-app/src/solana/nft/MetaplexHokusNftClient.ts)

## App flow

- `Mint` tab: generates preview and mints free NFT
- `My NFTs` tab: lists all minted NFTs and fingerprints
- `Focus` tab: uses latest NFT as active sound profile

Store: [HokusNftStore.tsx](/Users/godemodegame/repos/travel-app/src/presentation/state/HokusNftStore.tsx)

## Solana Mobile SDK

Integrated packages:

- `@solana/web3.js`
- `@solana-mobile/mobile-wallet-adapter-protocol`
- `@solana-mobile/mobile-wallet-adapter-protocol-web3js`

Wallet adapter scaffold:

- [SeekerWalletAdapter.ts](/Users/godemodegame/repos/travel-app/src/solana/wallet/SeekerWalletAdapter.ts)
