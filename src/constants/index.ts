import { BigNumber } from '@ethersproject/bignumber'

import { SupportedNetwork } from './networks'

export const MATIC_ADDRESS = '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270'
export const CELO_ADDRESS = '0x471EcE3750Da237f93B8E339c536989b8978a438'

const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
const ARBITRUM_WETH_ADDRESS = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1'

export const WETH_ADDRESSES = [WETH_ADDRESS, ARBITRUM_WETH_ADDRESS]

export const MAX_UINT128 = BigNumber.from(2).pow(128).sub(1)

export const POOL_HIDE: { [key: string]: string[] } = {
  [SupportedNetwork.ETHEREUM]: [
    '0x86d257cdb7bc9c0df10e84c8709697f92770b335',
    '0xf8dbd52488978a79dfe6ffbd81a01fc5948bf9ee',
    '0x8fe8d9bb8eeba3ed688069c3d6b556c9ca258248',
    '0xa850478adaace4c08fc61de44d8cf3b64f359bec',
    '0x277667eb3e34f134adf870be9550e9f323d0dc24',
    '0x8c0411f2ad5470a66cb2e9c64536cfb8dcd54d51',
    '0x055284a4ca6532ecc219ac06b577d540c686669d',
  ],
  [SupportedNetwork.POLYGON]: ['0x5f616541c801e2b9556027076b730e0197974f6a'],
  [SupportedNetwork.OPTIMISM]: [],
  [SupportedNetwork.CELO]: [],
}

export const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/coins'
