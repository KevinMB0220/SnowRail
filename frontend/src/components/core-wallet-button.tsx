import { useMemo } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import { useCoreWallet } from '../hooks/use-core-wallet'

const truncateAddress = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`

type CoreWalletButtonProps = {
  compact?: boolean
  variant?: 'default' | 'text'
  showDisconnect?: boolean
}

export function CoreWalletButton({
  compact = false,
  variant = 'default',
  showDisconnect = false,
}: CoreWalletButtonProps = {}) {
  const { account, error, isConnected, isConnecting, connectWallet, disconnectWallet } = useCoreWallet()

  const handleClick = () => {
    if (isConnected && account) {
      disconnectWallet()
    } else {
      connectWallet()
    }
  }

  const label = useMemo<ReactNode>(() => {
    if (isConnecting) {
      return 'Conectando...'
    }

    if (isConnected && account) {
      return truncateAddress(account)
    }

    return 'Connect Core Wallet'
  }, [account, isConnected, isConnecting])

  const isTextVariant = variant === 'text'

  const className = [
    'inline-flex items-center gap-2 transition disabled:cursor-not-allowed disabled:opacity-70',
    isTextVariant
      ? 'text-xs font-medium text-electric-blue hover:text-white'
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
    style.color = '#00d4ff'
  }

  // Show disconnect option when connected and showDisconnect is false (legacy behavior)
  const buttonContent = isConnected && account && !showDisconnect ? (
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
      disabled={isConnecting}
      className={className}
      style={style}
      title={isConnected && account ? 'Click to disconnect wallet' : 'Click to connect wallet'}
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
