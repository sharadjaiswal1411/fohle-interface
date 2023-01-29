import { Token } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import axios from 'axios'
import { COINGECKO_API_URL } from 'constants/index'
import { getUnixTime, subHours } from 'date-fns'
import { useMemo } from 'react'
import useSWR from 'swr'
export enum LiveDataTimeframeEnum {
  HOUR = '1H',
  FOUR_HOURS = '4H',
  DAY = '1D',
  WEEK = '1W',
  MONTH = '1M',
  SIX_MONTHS = '6M',
}

const getTimeFrameHours = (timeFrame: LiveDataTimeframeEnum) => {
  switch (timeFrame) {
    case LiveDataTimeframeEnum.HOUR:
      return 1
    case LiveDataTimeframeEnum.FOUR_HOURS:
      return 4
    case LiveDataTimeframeEnum.DAY:
      return 24
    case LiveDataTimeframeEnum.WEEK:
      return 7 * 24
    case LiveDataTimeframeEnum.MONTH:
      return 30 * 24
    case LiveDataTimeframeEnum.SIX_MONTHS:
      return 180 * 24
    default:
      return 7 * 24
  }
}
const generateCoingeckoUrl = (
  chainName: string,
  address: string | undefined,
  timeFrame: LiveDataTimeframeEnum | 'live'
): string => {
  const timeTo = getUnixTime(new Date())
  const timeFrom =
    timeFrame === 'live' ? timeTo - 1000 : getUnixTime(subHours(new Date(), getTimeFrameHours(timeFrame)))

  return `${COINGECKO_API_URL}/${chainName}/contract/${address}/market_chart/range?vs_currency=usd&from=${timeFrom}&to=${timeTo}`
}
const getClosestPrice = (prices: any[], time: number) => {
  let closestIndex = 0
  prices.forEach((item, index) => {
    if (Math.abs(item[0] - time) < Math.abs(prices[closestIndex][0] - time)) {
      closestIndex = index
    }
  })
  return prices[closestIndex][0] - time > 10000000 ? 0 : prices[closestIndex][1]
}

// interface ChartDataInfo {
//   readonly time: number
//   readonly value: number
// }

const fetchCoingeckoDataSWR = async (data: any): Promise<any> => {
  const { chainName, tokenAddresses, timeFrame } = data
  console.log('chainName', { chainName, tokenAddresses })
  return await Promise.all(
    [tokenAddresses[0], tokenAddresses[1]].map((address) =>
      axios
        .get(generateCoingeckoUrl(chainName, address, timeFrame), { timeout: 5000 })
        .then((res) => {
          if (res.status === 204) {
            throw new Error('No content')
          }
          return res.data
        })
        .catch((error) => {
          throw error
        })
    )
  )
}

export default function useBasicChartData(tokens: (Token | null | undefined)[], timeFrame: LiveDataTimeframeEnum) {
  const isReverse = useMemo(() => {
    if (!tokens || !tokens[0] || !tokens[1] || tokens[0].equals(tokens[1])) return false
    const [token0] = tokens[0].sortsBefore(tokens[1]) ? [tokens[0], tokens[1]] : [tokens[1], tokens[0]]
    return token0 !== tokens[0]
  }, [tokens])

  const tokenAddresses = useMemo(
    () =>
      tokens
        .filter(Boolean)
        .map((token) =>
          (token?.isNative ? '0x0000000000000000000000000000000000001010' : token?.address)?.toLowerCase()
        ),
    [tokens]
  )
  const { chainId } = useWeb3React()
  let chainName = 'polygon-pos'
  switch (chainId) {
    case 1:
      chainName = 'ethereum'
      break
    default:
      chainName = 'polygon-pos'
  }

  const {
    data: coingeckoData,
    error: coingeckoError,
    isValidating: coingeckoLoading,
  } = useSWR(
    tokenAddresses[0] && tokenAddresses[1] && { tokenAddresses, chainName, timeFrame },
    fetchCoingeckoDataSWR,
    {
      shouldRetryOnError: false,
      revalidateOnFocus: false,
      revalidateIfStale: false,
    }
  )

  const chartData = useMemo(() => {
    if (coingeckoData && coingeckoData[0]?.prices?.length > 0 && coingeckoData[1]?.prices?.length > 0) {
      const [data1, data2] = coingeckoData
      return data1.prices.map((item: number[]) => {
        const closestPrice = getClosestPrice(data2.prices, item[0])
        return { time: item[0], value: closestPrice > 0 ? parseFloat((item[1] / closestPrice).toPrecision(6)) : 0 }
      })
    } else return []
  }, [coingeckoData, isReverse])

  const error = !!coingeckoError || chartData.length === 0

  const { data: liveCoingeckoData } = useSWR(
    coingeckoData ? [tokenAddresses, chainName, 'live'] : null,
    fetchCoingeckoDataSWR,
    {
      refreshInterval: 60000,
      shouldRetryOnError: false,
      revalidateOnFocus: false,
      revalidateIfStale: false,
    }
  )

  const latestData = useMemo(() => {
    if (liveCoingeckoData) {
      const [data1, data2] = liveCoingeckoData
      if (data1.prices?.length > 0 && data2.prices?.length > 0) {
        const newValue = parseFloat(
          (data1.prices[data1.prices.length - 1][1] / data2.prices[data2.prices.length - 1][1]).toPrecision(6)
        )
        return { time: new Date().getTime(), value: newValue }
      }
    }

    return null
  }, [liveCoingeckoData, tokenAddresses])

  return {
    data: useMemo(() => (latestData ? [...chartData, latestData] : chartData), [latestData, chartData]),
    error,
    loading: !tokenAddresses[0] || !tokenAddresses[1] || coingeckoLoading,
  }
}
