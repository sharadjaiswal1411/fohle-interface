import { CeloNetworkInfo, NetworkInfo, PolygonNetworkInfo } from 'constants/networks'

import { CELO_ADDRESS, MATIC_ADDRESS, WETH_ADDRESSES } from '../constants'

export function formatTokenSymbol(address: string, symbol: string, activeNetwork?: NetworkInfo) {
  // dumb catch for matic
  if (address === MATIC_ADDRESS && activeNetwork === PolygonNetworkInfo) {
    return 'MATIC'
  }

  // dumb catch for Celo
  if (address === CELO_ADDRESS && activeNetwork === CeloNetworkInfo) {
    return 'CELO'
  }

  if (WETH_ADDRESSES.includes(address)) {
    return 'ETH'
  }
  return symbol
}

export function formatTokenName(address: string, name: string, activeNetwork?: NetworkInfo) {
  // dumb catch for matic
  if (address === MATIC_ADDRESS && activeNetwork === PolygonNetworkInfo) {
    return 'MATIC'
  }

  // dumb catch for Celo
  if (address === CELO_ADDRESS && activeNetwork === CeloNetworkInfo) {
    return 'CELO'
  }

  if (WETH_ADDRESSES.includes(address)) {
    return 'Ether'
  }
  return name
}
