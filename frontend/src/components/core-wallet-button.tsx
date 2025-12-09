import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import type { CoreWalletProvider } from '../types/core-wallet'

type WalletStatus = 'idle' | 'connecting' | 'connected' | 'error'

const getProvider = (): CoreWalletProvider | null => {
  if (typeof window === 'undefined') {
    return null
  }
  return window.avalanche ?? window.core ?? null
}

const truncateAddress = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`

type CoreWalletButtonProps = {
  compact?: boolean
  variant?: 'default' | 'text'
}

export function CoreWalletButton({
  compact = false,
  variant = 'default',
}: CoreWalletButtonProps = {}) {
  const [provider, setProvider] = useState<CoreWalletProvider | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [status, setStatus] = useState<WalletStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setProvider(getProvider())
  }, [])

  useEffect(() => {
    if (!provider?.on) {
      return
    }

    const handleAccountsChanged = (accounts: string[]) => {
      const nextAccount = accounts[0] ?? null
      setAccount(nextAccount)
      setStatus(nextAccount ? 'connected' : 'idle')
    }

    provider.on('accountsChanged', handleAccountsChanged)
    return () =>
      provider.removeListener?.('accountsChanged', handleAccountsChanged)
  }, [provider])

  const connectWallet = useCallback(async () => {
    setError(null)
    if (!provider) {
      setStatus('error')
      setError('Core Wallet no detectada.')
      return
    }

    try {
      setStatus('connecting')
      const accounts = (await provider.request({
        method: 'eth_requestAccounts',
      })) as string[]
      const connectedAccount = accounts?.[0]

      if (!connectedAccount) {
        setStatus('idle')
        return
      }

      setAccount(connectedAccount)
      setStatus('connected')
    } catch (err) {
      setStatus('error')
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo conectar con Core Wallet.',
      )
    }
  }, [provider])

  const disconnectWallet = useCallback(() => {
    setAccount(null)
    setStatus('idle')
    setError(null)
    // Optionally try to disconnect from provider if it has a disconnect method
    if (provider && typeof (provider as any).disconnect === 'function') {
      try {
        (provider as any).disconnect()
      } catch (err) {
        // Ignore disconnect errors
      }
    }
  }, [provider])

  const handleClick = useCallback(() => {
    if (status === 'connected' && account) {
      disconnectWallet()
    } else {
      connectWallet()
    }
  }, [status, account, connectWallet, disconnectWallet])

  const label = useMemo<ReactNode>(() => {
    if (status === 'connecting') {
      return 'Conectando...'
    }

    if (account) {
      return truncateAddress(account)
    }

    return 'Connect Core Wallet'
  }, [account, status])

  const isTextVariant = variant === 'text'

  const className = [
    'inline-flex items-center gap-2 transition disabled:cursor-not-allowed disabled:opacity-70',
    isTextVariant
      ? 'text-xs font-medium text-teal-800 hover:text-teal-900'
      : 'text-sm font-medium text-slate-600 hover:text-teal-700',
    !isTextVariant && 'rounded-full bg-white',
    !isTextVariant && (compact ? 'px-2 py-1' : 'px-3 py-1.5'),
  ]
    .filter(Boolean)
    .join(' ')

  const style: CSSProperties = {
    border: 'none',
    boxShadow: 'none',
  }

  if (isTextVariant) {
    style.background = 'transparent'
    style.padding = 0
    style.textAlign = 'left'
    style.fontSize = '0.75rem'
    style.fontWeight = 500
    style.color = '#0f766e'
  }

  // Show disconnect option when connected
  const buttonContent = account ? (
    <div className="flex items-center gap-2">
      <span>{label}</span>
      <span className="text-xs opacity-70">(click to disconnect)</span>
    </div>
  ) : (
    label
  )

  const content = (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === 'connecting'}
      className={className}
      style={style}
      title={account ? 'Click to disconnect wallet' : 'Click to connect wallet'}
    >
      {buttonContent}
    </button>
  )

  if (compact) {
    return content
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {content}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  )
}
