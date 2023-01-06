import { createAction } from '@reduxjs/toolkit'
import { NetworkInfo } from 'constants/networks'

export const updateActiveNetworkVersion = createAction<{ activeNetworkVersion: NetworkInfo }>(
  'application/updateActiveNetworkVersion'
)
