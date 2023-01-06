import { TimePeriod } from 'graphql/data/util'
import { atom, useAtom } from 'jotai'
import { atomWithReset } from 'jotai/utils'
import { useCallback } from 'react'

export enum TokenSortMethod {
  feeTier = 'feeTier',
  volumeUSD = 'volumeUSD',
  tvlUSD = 'tvlUSD',
  volumeUSDWeek = 'volumeUSDWeek',
  tvlUSDChange = 'tvlUSDChange',
}

export const filterStringAtom = atomWithReset<string>('')
export const filterTimeAtom = atom<TimePeriod>(TimePeriod.DAY)
export const sortMethodAtom = atom<TokenSortMethod>(TokenSortMethod.tvlUSD)
export const sortAscendingAtom = atom<boolean>(false)

/* keep track of sort category for token table */
export function useSetSortMethod(newSortMethod: TokenSortMethod) {
  const [sortMethod, setSortMethod] = useAtom(sortMethodAtom)
  const [sortAscending, setSortAscending] = useAtom(sortAscendingAtom)

  return useCallback(() => {
    if (sortMethod === newSortMethod) {
      setSortAscending(!sortAscending)
    } else {
      setSortMethod(newSortMethod)
      setSortAscending(false)
    }
  }, [sortMethod, setSortMethod, setSortAscending, sortAscending, newSortMethod])
}
