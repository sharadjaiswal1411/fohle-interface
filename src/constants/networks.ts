import ARBITRUM_LOGO_URL from '../assets/images/arbitrum.svg'
import CELO_LOGO_URL from '../assets/images/celo-logo.svg'
import ETHEREUM_LOGO_URL from '../assets/images/ethereum-logo.png'
import OPTIMISM_LOGO_URL from '../assets/images/optimism.svg'
import POLYGON_LOGO_URL from '../assets/images/polygon-logo.png'
import { SupportedChainId } from './chains'

const INFURA_KEY = process.env.REACT_APP_INFURA_KEY
if (typeof INFURA_KEY === 'undefined') {
  throw new Error(`REACT_APP_INFURA_KEY must be a defined environment variable`)
}

/**
 * Fallback JSON-RPC endpoints.
 * These are used if the integrator does not provide an endpoint, or if the endpoint does not work.
 *
 * MetaMask allows switching to any URL, but displays a warning if it is not on the "Safe" list:
 * https://github.com/MetaMask/metamask-mobile/blob/bdb7f37c90e4fc923881a07fca38d4e77c73a579/app/core/RPCMethods/wallet_addEthereumChain.js#L228-L235
 * https://chainid.network/chains.json
 *
 * These "Safe" URLs are listed first, followed by other fallback URLs, which are taken from chainlist.org.
 */
export const FALLBACK_URLS: { [key in SupportedChainId]: string[] } = {
  [SupportedChainId.MAINNET]: [
    // "Safe" URLs
    'https://api.mycryptoapi.com/eth',
    'https://cloudflare-eth.com',
    // "Fallback" URLs
    'https://rpc.ankr.com/eth',
    'https://eth-mainnet.public.blastapi.io',
  ],
  [SupportedChainId.ROPSTEN]: [
    // "Fallback" URLs
    'https://rpc.ankr.com/eth_ropsten',
  ],
  [SupportedChainId.RINKEBY]: [
    // "Fallback" URLs
    'https://rinkeby-light.eth.linkpool.io/',
  ],
  [SupportedChainId.GOERLI]: [
    // "Safe" URLs
    'https://rpc.goerli.mudit.blog/',
    // "Fallback" URLs
    'https://rpc.ankr.com/eth_goerli',
  ],
  [SupportedChainId.KOVAN]: [
    // "Safe" URLs
    'https://kovan.poa.network',
    // "Fallback" URLs
    'https://eth-kovan.public.blastapi.io',
  ],
  [SupportedChainId.POLYGON]: [
    // "Safe" URLs
    'https://polygon-rpc.com/',
    'https://rpc-mainnet.matic.network',
    'https://matic-mainnet.chainstacklabs.com',
    'https://rpc-mainnet.maticvigil.com',
    'https://rpc-mainnet.matic.quiknode.pro',
    'https://matic-mainnet-full-rpc.bwarelabs.com',
  ],
  [SupportedChainId.POLYGON_MUMBAI]: [
    // "Safe" URLs
    'https://matic-mumbai.chainstacklabs.com',
    'https://rpc-mumbai.maticvigil.com',
    'https://matic-testnet-archive-rpc.bwarelabs.com',
  ],
  [SupportedChainId.ARBITRUM_ONE]: [
    // "Safe" URLs
    'https://arb1.arbitrum.io/rpc',
    // "Fallback" URLs
    'https://arbitrum.public-rpc.com',
  ],
  [SupportedChainId.ARBITRUM_RINKEBY]: [
    // "Safe" URLs
    'https://rinkeby.arbitrum.io/rpc',
  ],
  [SupportedChainId.OPTIMISM]: [
    // "Safe" URLs
    'https://mainnet.optimism.io/',
    // "Fallback" URLs
    'https://rpc.ankr.com/optimism',
  ],
  [SupportedChainId.OPTIMISM_GOERLI]: [
    // "Safe" URLs
    'https://goerli.optimism.io',
  ],
  [SupportedChainId.OPTIMISTIC_KOVAN]: [
    // "Safe" URLs
    'https://kovan.optimism.io',
  ],
  [SupportedChainId.CELO]: [
    // "Safe" URLs
    `https://forno.celo.org`,
  ],
  [SupportedChainId.CELO_ALFAJORES]: [
    // "Safe" URLs
    `https://alfajores-forno.celo-testnet.org`,
  ],
}

/**
 * Known JSON-RPC endpoints.
 * These are the URLs used by the interface when there is not another available source of chain data.
 */
export const RPC_URLS: { [key in SupportedChainId]: string[] } = {
  [SupportedChainId.MAINNET]: [
    `https://mainnet.infura.io/v3/${INFURA_KEY}`,
    ...FALLBACK_URLS[SupportedChainId.MAINNET],
  ],
  [SupportedChainId.RINKEBY]: [
    `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
    ...FALLBACK_URLS[SupportedChainId.RINKEBY],
  ],
  [SupportedChainId.ROPSTEN]: [
    `https://ropsten.infura.io/v3/${INFURA_KEY}`,
    ...FALLBACK_URLS[SupportedChainId.ROPSTEN],
  ],
  [SupportedChainId.GOERLI]: [`https://goerli.infura.io/v3/${INFURA_KEY}`, ...FALLBACK_URLS[SupportedChainId.GOERLI]],
  [SupportedChainId.KOVAN]: [`https://kovan.infura.io/v3/${INFURA_KEY}`, ...FALLBACK_URLS[SupportedChainId.KOVAN]],
  [SupportedChainId.OPTIMISM]: [
    `https://optimism-mainnet.infura.io/v3/${INFURA_KEY}`,
    ...FALLBACK_URLS[SupportedChainId.OPTIMISM],
  ],
  [SupportedChainId.OPTIMISM_GOERLI]: [
    `https://optimism-goerli.infura.io/v3/${INFURA_KEY}`,
    ...FALLBACK_URLS[SupportedChainId.OPTIMISM_GOERLI],
  ],
  [SupportedChainId.OPTIMISTIC_KOVAN]: [
    `https://kovan-goerli.infura.io/v3/${INFURA_KEY}`,
    ...FALLBACK_URLS[SupportedChainId.OPTIMISTIC_KOVAN],
  ],
  [SupportedChainId.ARBITRUM_ONE]: [
    `https://arbitrum-mainnet.infura.io/v3/${INFURA_KEY}`,
    ...FALLBACK_URLS[SupportedChainId.ARBITRUM_ONE],
  ],
  [SupportedChainId.ARBITRUM_RINKEBY]: [
    `https://arbitrum-rinkeby.infura.io/v3/${INFURA_KEY}`,
    ...FALLBACK_URLS[SupportedChainId.ARBITRUM_RINKEBY],
  ],
  [SupportedChainId.POLYGON]: [
    `https://polygon-mainnet.infura.io/v3/${INFURA_KEY}`,
    ...FALLBACK_URLS[SupportedChainId.POLYGON],
  ],
  [SupportedChainId.POLYGON_MUMBAI]: [
    `https://polygon-mumbai.infura.io/v3/${INFURA_KEY}`,
    ...FALLBACK_URLS[SupportedChainId.POLYGON_MUMBAI],
  ],
  [SupportedChainId.CELO]: FALLBACK_URLS[SupportedChainId.CELO],
  [SupportedChainId.CELO_ALFAJORES]: FALLBACK_URLS[SupportedChainId.CELO_ALFAJORES],
}

export enum SupportedNetwork {
  ETHEREUM,
  ARBITRUM,
  OPTIMISM,
  POLYGON,
  CELO,
}

export type NetworkInfo = {
  id: SupportedNetwork
  route: string
  name: string
  imageURL: string
  bgColor: string
  primaryColor: string
  secondaryColor: string
  blurb?: string
  chainId?: number
}

export const EthereumNetworkInfo: NetworkInfo = {
  id: SupportedNetwork.ETHEREUM,
  route: '',
  name: 'Ethereum',
  bgColor: '#fc077d',
  primaryColor: '#fc077d',
  secondaryColor: '#2172E5',
  imageURL: ETHEREUM_LOGO_URL,
  chainId: SupportedChainId.MAINNET,
}

export const ArbitrumNetworkInfo: NetworkInfo = {
  id: SupportedNetwork.ARBITRUM,
  route: 'arbitrum',
  name: 'Arbitrum',
  imageURL: ARBITRUM_LOGO_URL,
  bgColor: '#0A294B',
  primaryColor: '#0490ED',
  secondaryColor: '#96BEDC',
}

export const OptimismNetworkInfo: NetworkInfo = {
  id: SupportedNetwork.OPTIMISM,
  route: 'optimism',
  name: 'Optimism',
  bgColor: '#F01B36',
  primaryColor: '#F01B36',
  secondaryColor: '#FB7876',
  imageURL: OPTIMISM_LOGO_URL,
}

export const PolygonNetworkInfo: NetworkInfo = {
  id: SupportedNetwork.POLYGON,
  route: 'polygon',
  name: 'Polygon',
  bgColor: '#8247e5',
  primaryColor: '#8247e5',
  secondaryColor: '#FB7876',
  imageURL: POLYGON_LOGO_URL,
  blurb: '',
  chainId: SupportedChainId.POLYGON,
}
export const CeloNetworkInfo: NetworkInfo = {
  id: SupportedNetwork.CELO,
  route: 'celo',
  name: 'Celo',
  bgColor: '#02502F',
  primaryColor: '#35D07F',
  secondaryColor: '#9ACDB2',
  imageURL: CELO_LOGO_URL,
  blurb: '',
}

export const SUPPORTED_NETWORK_VERSIONS: NetworkInfo[] = [
  EthereumNetworkInfo,
  PolygonNetworkInfo,
  OptimismNetworkInfo,
  CeloNetworkInfo,
]
