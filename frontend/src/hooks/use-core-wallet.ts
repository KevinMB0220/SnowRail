/**
 * Hook to manage Core Wallet connection state
 * Provides centralized wallet state management
 */

import { useCallback, useEffect, useState } from 'react';
import type { CoreWalletProvider } from '../types/core-wallet';

type WalletStatus = 'idle' | 'connecting' | 'connected' | 'error';

const getProvider = (): CoreWalletProvider | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.avalanche ?? window.core ?? null;
};

export function useCoreWallet() {
  const [provider, setProvider] = useState<CoreWalletProvider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Initialize provider and check for existing connection
  useEffect(() => {
    const providerInstance = getProvider();
    setProvider(providerInstance);

    // Check for existing connection immediately
    if (providerInstance) {
      providerInstance
        .request({ method: 'eth_accounts' })
        .then((accounts: unknown) => {
          const accountsArray = accounts as string[];
          const connectedAccount = accountsArray?.[0] ?? null;
          if (connectedAccount) {
            setAccount(connectedAccount);
            setStatus('connected');
          }
        })
        .catch(() => {
          // Ignore errors
        });
    }
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!provider?.on) {
      return;
    }

    const handleAccountsChanged = (accounts: string[]) => {
      const nextAccount = accounts[0] ?? null;
      setAccount(nextAccount);
      setStatus(nextAccount ? 'connected' : 'idle');
      setError(null);
    };

    provider.on('accountsChanged', handleAccountsChanged);

    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
    };
  }, [provider]);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    setError(null);
    if (!provider) {
      setStatus('error');
      setError('Core Wallet no detectada.');
      return;
    }

    try {
      setStatus('connecting');
      const accounts = (await provider.request({
        method: 'eth_requestAccounts',
      })) as string[];
      const connectedAccount = accounts?.[0];

      if (!connectedAccount) {
        setStatus('idle');
        return;
      }

      setAccount(connectedAccount);
      setStatus('connected');
    } catch (err) {
      setStatus('error');
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo conectar con Core Wallet.',
      );
    }
  }, [provider]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setStatus('idle');
    setError(null);
  }, []);

  return {
    account,
    status,
    error,
    isConnected: status === 'connected' && !!account,
    isConnecting: status === 'connecting',
    connectWallet,
    disconnectWallet,
  };
}
