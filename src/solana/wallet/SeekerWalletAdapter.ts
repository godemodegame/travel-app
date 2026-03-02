import type {WalletProvider} from '@/solana/wallet/WalletProvider';
import type {WalletSession} from '@/solana/wallet/WalletSession';
import {PublicKey} from '@solana/web3.js';
import {transact} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import {Buffer} from 'buffer';

export class SeekerWalletAdapter implements WalletProvider {
  private static readonly APP_IDENTITY = {
    name: 'Hokus',
    uri: 'https://hokus.app',
    icon: 'favicon.ico'
  } as const;
  private static readonly DEFAULT_CHAIN = 'solana:devnet';
  private session: WalletSession | null = null;

  async connect(): Promise<WalletSession> {
    const connectedSession = await transact(async wallet => {
      const authorization = await wallet.authorize({
        identity: SeekerWalletAdapter.APP_IDENTITY,
        chain: SeekerWalletAdapter.DEFAULT_CHAIN
      });

      const [account] = authorization.accounts;
      if (!account) {
        throw new Error('Wallet authorized without any accounts');
      }

      return {
        walletAddress: this.normalizeWalletAddress(account.address),
        authToken: authorization.auth_token,
        walletUriBase: authorization.wallet_uri_base,
        chain: SeekerWalletAdapter.DEFAULT_CHAIN
      } satisfies WalletSession;
    });

    this.session = connectedSession;
    return connectedSession;
  }

  async disconnect(): Promise<void> {
    const authToken = this.session?.authToken;
    if (authToken) {
      try {
        await transact(async wallet => {
          await wallet.deauthorize({auth_token: authToken});
        });
      } catch {
        // Ignore deauthorization failures and clear local state.
      }
    }
    this.session = null;
  }

  currentSessionOrNull(): WalletSession | null {
    return this.session;
  }

  private normalizeWalletAddress(address: string): string {
    try {
      return new PublicKey(address).toBase58();
    } catch {
      const decoded = Buffer.from(address, 'base64');
      return new PublicKey(decoded).toBase58();
    }
  }
}
