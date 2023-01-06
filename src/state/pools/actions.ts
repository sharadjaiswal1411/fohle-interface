import { createAction } from '@reduxjs/toolkit'
import { Transaction } from 'types'

import { TickProcessed } from './../../data/pools/tickData'
import { PoolChartEntry, PoolData } from './reducer'

// protocol wide info
export const updatePoolData = createAction<{ pools: PoolData[]; networkId: any }>('pools/updatePoolData')

// add pool address to byAddress
export const addPoolKeys = createAction<{ poolAddresses: string[]; networkId: any }>('pool/addPoolKeys')

export const updatePoolChartData = createAction<{
  poolAddress: string
  chartData: PoolChartEntry[]
  networkId: any
}>('pool/updatePoolChartData')

export const updatePoolTransactions = createAction<{
  poolAddress: string
  transactions: Transaction[]
  networkId: any
}>('pool/updatePoolTransactions')

export const updateTickData = createAction<{
  poolAddress: string
  tickData:
    | {
        ticksProcessed: TickProcessed[]
        feeTier: string
        tickSpacing: number
        activeTickIdx: number
      }
    | undefined
  networkId: any
}>('pool/updateTickData')
