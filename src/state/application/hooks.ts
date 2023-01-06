import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import { sendAnalyticsEvent } from '@uniswap/analytics'
import {
  arbitrumBlockClient,
  arbitrumClient,
  blockClient,
  celoBlockClient,
  celoClient,
  client,
  optimismBlockClient,
  optimismClient,
  polygonBlockClient,
  polygonClient,
} from 'apollo/client'
import { DEFAULT_TXN_DISMISS_MS } from 'constants/misc'
import { NetworkInfo, SupportedNetwork } from 'constants/networks'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from 'state/hooks'

import { AppState } from '../index'
import { updateActiveNetworkVersion } from './actions'
import {
  addPopup,
  ApplicationModal,
  PopupContent,
  removePopup,
  setFiatOnrampAvailability,
  setOpenModal,
} from './reducer'

export function useModalIsOpen(modal: ApplicationModal): boolean {
  const openModal = useAppSelector((state: AppState) => state.application.openModal)
  return openModal === modal
}

/** @ref https://dashboard.moonpay.com/api_reference/client_side_api#ip_addresses */
interface MoonpayIPAddressesResponse {
  alpha3?: string
  isAllowed?: boolean
  isBuyAllowed?: boolean
  isSellAllowed?: boolean
}

async function getMoonpayAvailability(): Promise<boolean> {
  const moonpayPublishableKey = process.env.REACT_APP_MOONPAY_PUBLISHABLE_KEY
  if (!moonpayPublishableKey) {
    throw new Error('Must provide a publishable key for moonpay.')
  }
  const moonpayApiURI = process.env.REACT_APP_MOONPAY_API
  if (!moonpayApiURI) {
    throw new Error('Must provide an api endpoint for moonpay.')
  }
  const res = await fetch(`${moonpayApiURI}/v4/ip_address?apiKey=${moonpayPublishableKey}`)
  const data = await (res.json() as Promise<MoonpayIPAddressesResponse>)
  return data.isBuyAllowed ?? false
}

export function useFiatOnrampAvailability(shouldCheck: boolean, callback?: () => void) {
  const dispatch = useAppDispatch()
  const { available, availabilityChecked } = useAppSelector((state: AppState) => state.application.fiatOnramp)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function checkAvailability() {
      setError(null)
      setLoading(true)
      try {
        const result = await getMoonpayAvailability()
        sendAnalyticsEvent('MoonPay Geochecker', { success: result })
        if (stale) return
        dispatch(setFiatOnrampAvailability(result))
        if (result && callback) {
          callback()
        }
      } catch (e) {
        console.error('Error checking onramp availability', e.toString())
        if (stale) return
        setError('Error, try again later.')
        dispatch(setFiatOnrampAvailability(false))
      } finally {
        if (!stale) setLoading(false)
      }
    }

    if (!availabilityChecked && shouldCheck) {
      checkAvailability()
    }

    let stale = false
    return () => {
      stale = true
    }
  }, [availabilityChecked, callback, dispatch, shouldCheck])

  return { available, availabilityChecked, loading, error }
}

export function useToggleModal(modal: ApplicationModal): () => void {
  const isOpen = useModalIsOpen(modal)
  const dispatch = useAppDispatch()
  return useCallback(() => dispatch(setOpenModal(isOpen ? null : modal)), [dispatch, modal, isOpen])
}

export function useCloseModal(): () => void {
  const dispatch = useAppDispatch()
  return useCallback(() => dispatch(setOpenModal(null)), [dispatch])
}

export function useToggleMetamaskConnectionErrorModal(): () => void {
  return useToggleModal(ApplicationModal.METAMASK_CONNECTION_ERROR)
}

export function useOpenModal(modal: ApplicationModal): () => void {
  const dispatch = useAppDispatch()
  return useCallback(() => dispatch(setOpenModal(modal)), [dispatch, modal])
}

export function useToggleWalletModal(): () => void {
  return useToggleModal(ApplicationModal.WALLET)
}

export function useToggleWalletDropdown(): () => void {
  return useToggleModal(ApplicationModal.WALLET_DROPDOWN)
}

export function useToggleSettingsMenu(): () => void {
  return useToggleModal(ApplicationModal.SETTINGS)
}

export function useShowClaimPopup(): boolean {
  return useModalIsOpen(ApplicationModal.CLAIM_POPUP)
}

export function useToggleShowClaimPopup(): () => void {
  return useToggleModal(ApplicationModal.CLAIM_POPUP)
}

export function useToggleSelfClaimModal(): () => void {
  return useToggleModal(ApplicationModal.SELF_CLAIM)
}

export function useToggleDelegateModal(): () => void {
  return useToggleModal(ApplicationModal.DELEGATE)
}

export function useToggleVoteModal(): () => void {
  return useToggleModal(ApplicationModal.VOTE)
}

export function useToggleQueueModal(): () => void {
  return useToggleModal(ApplicationModal.QUEUE)
}

export function useToggleExecuteModal(): () => void {
  return useToggleModal(ApplicationModal.EXECUTE)
}

export function useTogglePrivacyPolicy(): () => void {
  return useToggleModal(ApplicationModal.PRIVACY_POLICY)
}

export function useToggleFeatureFlags(): () => void {
  return useToggleModal(ApplicationModal.FEATURE_FLAGS)
}

// returns a function that allows adding a popup
export function useAddPopup(): (content: PopupContent, key?: string, removeAfterMs?: number) => void {
  const dispatch = useAppDispatch()

  return useCallback(
    (content: PopupContent, key?: string, removeAfterMs?: number) => {
      dispatch(
        addPopup({
          content,
          key,
          removeAfterMs: removeAfterMs ?? DEFAULT_TXN_DISMISS_MS,
        })
      )
    },
    [dispatch]
  )
}

// returns a function that allows removing a popup via its key
export function useRemovePopup(): (key: string) => void {
  const dispatch = useAppDispatch()
  return useCallback(
    (key: string) => {
      dispatch(removePopup({ key }))
    },
    [dispatch]
  )
}

// get the list of active popups
export function useActivePopups(): AppState['application']['popupList'] {
  const list = useAppSelector((state: AppState) => state.application.popupList)
  return useMemo(() => list.filter((item) => item.show), [list])
}

// Get all required subgraph clients
export function useClients(): {
  dataClient: ApolloClient<NormalizedCacheObject>
  blockClient: ApolloClient<NormalizedCacheObject>
} {
  const dataClient = useDataClient()
  const blockClient = useBlockClient()
  return {
    dataClient,
    blockClient,
  }
}

// returns a function that allows adding a popup
export function useActiveNetworkVersion(): [NetworkInfo, (activeNetworkVersion: NetworkInfo) => void] {
  const dispatch = useAppDispatch()
  const activeNetwork = useAppSelector((state: AppState) => state.application.activeNetworkVersion)
  const update = useCallback(
    (activeNetworkVersion: NetworkInfo) => {
      dispatch(updateActiveNetworkVersion({ activeNetworkVersion }))
    },
    [dispatch]
  )
  return [activeNetwork, update]
}

// get the apollo client related to the active network
function useDataClient(): ApolloClient<NormalizedCacheObject> {
  const [activeNetwork] = useActiveNetworkVersion()
  switch (activeNetwork.id) {
    case SupportedNetwork.ETHEREUM:
      return client
    case SupportedNetwork.ARBITRUM:
      return arbitrumClient
    case SupportedNetwork.OPTIMISM:
      return optimismClient
    case SupportedNetwork.POLYGON:
      return polygonClient
    case SupportedNetwork.CELO:
      return celoClient
    default:
      return client
  }
}

// get the apollo client related to the active network for fetching blocks
function useBlockClient(): ApolloClient<NormalizedCacheObject> {
  const [activeNetwork] = useActiveNetworkVersion()
  switch (activeNetwork.id) {
    case SupportedNetwork.ETHEREUM:
      return blockClient
    case SupportedNetwork.ARBITRUM:
      return arbitrumBlockClient
    case SupportedNetwork.OPTIMISM:
      return optimismBlockClient
    case SupportedNetwork.POLYGON:
      return polygonBlockClient
    case SupportedNetwork.CELO:
      return celoBlockClient
    default:
      return blockClient
  }
}
