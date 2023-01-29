export enum TransactionType {
  SWAP,
  MINT,
  BURN,
}

export enum VolumeWindow {
  daily,
  weekly,
  monthly,
}

export type Transaction = {
  type: TransactionType
  hash: string
  timestamp: string
  sender: string
  token0Symbol: string
  token1Symbol: string
  token0Address: string
  token1Address: string
  amountUSD: number
  amountToken0: number
  amountToken1: number
}
