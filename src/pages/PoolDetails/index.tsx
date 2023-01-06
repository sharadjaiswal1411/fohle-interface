import { Trans } from '@lingui/macro'
import BarChart from 'components/BarChart/alt'
import { ButtonGray, ButtonPrimary } from 'components/Button'
import { DarkGrayCard, GrayBadge, GrayCard } from 'components/Card'
import { AutoColumn } from 'components/Column'
import CurrencyLogo from 'components/CurrencyLogo'
import DensityChart from 'components/DensityChart'
import DoubleCurrencyLogo from 'components/DoubleLogo2'
import Loader, { LocalLoader } from 'components/Loader'
import { GenericImageWrapper } from 'components/Logo'
import Percent from 'components/Percent'
import { AutoRow, RowBetween, RowFixed } from 'components/Row'
import { MonoSpace } from 'components/shared'
import { ToggleElementFree, ToggleWrapper } from 'components/Toggle/index'
import { MAX_WIDTH_MEDIA_BREAKPOINT } from 'components/Tokens/constants'
import TransactionTable from 'components/TransactionsTable'
import { PolygonNetworkInfo } from 'constants/networks'
import { useColor } from 'hooks/useColor'
import { PageWrapper, ThemedBackground } from 'pages/styled'
import React, { useEffect, useMemo, useState } from 'react'
import { Download } from 'react-feather'
import { useParams } from 'react-router-dom'
import { useActiveNetworkVersion } from 'state/application/hooks'
import { usePoolChartData, usePoolDatas, usePoolTransactions } from 'state/pools/hooks'
import styled from 'styled-components/macro'
import { StyledInternalLink, TYPE } from 'theme'
import { ThemedText } from 'theme'
import { feeTierPercent } from 'utils'
import { unixToDate } from 'utils/date'
import { networkPrefix } from 'utils/networkPrefix'
import { formatAmount, formatDollarAmount } from 'utils/numbers'

import { ExternalLink as StyledExternalLink } from '../../theme/components'

const ContentLayout = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  grid-gap: 1em;
  @media screen and (max-width: 800px) {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
`

const TitleContainer = styled.div`
  margin-top: 32px;
  margin-bottom: 32px;
  max-width: ${MAX_WIDTH_MEDIA_BREAKPOINT};
  margin-left: auto;
  margin-right: auto;
  display: flex;
`

const TokenButton = styled(GrayCard)`
  padding: 8px 12px;
  border-radius: 10px;
  :hover {
    cursor: pointer;
    opacity: 0.6;
  }
`

const ResponsiveRow = styled(RowBetween)`
  ${({ theme }) => theme.deprecated_mediaWidth.deprecated_upToSmall`
    flex-direction: column;
    align-items: flex-start;
    row-gap: 24px;
    width: 100%:
  `};
`

const ToggleRow = styled(RowBetween)`
  @media screen and (max-width: 600px) {
    flex-direction: column;
  }
`

enum ChartView {
  VOL,
  PRICE,
  DENSITY,
  FEES,
}

export default function PoolDetails() {
  const [activeNetwork] = useActiveNetworkVersion()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const { tokenAddress } = useParams<{ tokenAddress?: string; chainName?: string }>()

  // theming
  const backgroundColor = useColor()
  // token data
  const poolData = usePoolDatas([tokenAddress || ''])[0]
  const chartData = usePoolChartData(tokenAddress || '')
  const transactions = usePoolTransactions(tokenAddress || '')

  const [view, setView] = useState(ChartView.VOL)
  const [latestValue, setLatestValue] = useState<number | undefined>()
  const [valueLabel, setValueLabel] = useState<string | undefined>()

  const formattedTvlData = useMemo(() => {
    if (chartData) {
      return chartData.map((day) => {
        return {
          time: unixToDate(day.date),
          value: day.totalValueLockedUSD,
        }
      })
    } else {
      return []
    }
  }, [chartData])

  const formattedVolumeData = useMemo(() => {
    if (chartData) {
      return chartData.map((day) => {
        return {
          time: unixToDate(day.date),
          value: day.volumeUSD,
        }
      })
    } else {
      return []
    }
  }, [chartData])

  const formattedFeesUSD = useMemo(() => {
    if (chartData) {
      return chartData.map((day) => {
        return {
          time: unixToDate(day.date),
          value: day.feesUSD,
        }
      })
    } else {
      return []
    }
  }, [chartData])

  //watchlist

  return (
    <PageWrapper>
      <ThemedBackground backgroundColor={backgroundColor} />
      {poolData ? (
        <AutoColumn gap="32px">
          <RowBetween>
            <AutoRow gap="4px">
              <TitleContainer>
                <ThemedText.LargeHeader>
                  <Trans>Pool Details</Trans>
                </ThemedText.LargeHeader>
              </TitleContainer>
            </AutoRow>
          </RowBetween>
          <ResponsiveRow align="flex-end">
            <AutoColumn gap="lg">
              <RowFixed>
                <DoubleCurrencyLogo address0={poolData.token0.address} address1={poolData.token1.address} size={24} />
                <TYPE.label
                  ml="8px"
                  mr="8px"
                  fontSize="24px"
                >{` ${poolData.token0.symbol} / ${poolData.token1.symbol} `}</TYPE.label>
                <GrayBadge>{feeTierPercent(poolData.feeTier)}</GrayBadge>
                {activeNetwork === PolygonNetworkInfo ? null : (
                  <GenericImageWrapper src={activeNetwork.imageURL} style={{ marginLeft: '8px' }} size="26px" />
                )}
              </RowFixed>
              <ResponsiveRow>
                <StyledInternalLink to={'/tokens' + networkPrefix(activeNetwork) + poolData.token0.address}>
                  <TokenButton>
                    <RowFixed>
                      <CurrencyLogo address={poolData.token0.address} size="20px" />
                      <TYPE.label fontSize="16px" ml="4px" style={{ whiteSpace: 'nowrap' }} width="fit-content">
                        {`1 ${poolData.token0.symbol} =  ${formatAmount(poolData.token1Price, 4)} ${
                          poolData.token1.symbol
                        }`}
                      </TYPE.label>
                    </RowFixed>
                  </TokenButton>
                </StyledInternalLink>
                <StyledInternalLink to={'/tokens' + networkPrefix(activeNetwork) + poolData.token1.address}>
                  <TokenButton ml="10px">
                    <RowFixed>
                      <CurrencyLogo address={poolData.token1.address} size="20px" />
                      <TYPE.label fontSize="16px" ml="4px" style={{ whiteSpace: 'nowrap' }} width="fit-content">
                        {`1 ${poolData.token1.symbol} =  ${formatAmount(poolData.token0Price, 4)} ${
                          poolData.token0.symbol
                        }`}
                      </TYPE.label>
                    </RowFixed>
                  </TokenButton>
                </StyledInternalLink>
              </ResponsiveRow>
            </AutoColumn>
            {activeNetwork !== PolygonNetworkInfo ? null : (
              <RowFixed>
                <StyledExternalLink
                  href={`/#/add/${poolData.token0.address}/${poolData.token1.address}/${poolData.feeTier}`}
                >
                  <ButtonGray width="170px" mr="12px" style={{ height: '44px' }}>
                    <RowBetween>
                      <Download size={24} />
                      <div style={{ display: 'flex', alignItems: 'center' }}>Add Liquidity</div>
                    </RowBetween>
                  </ButtonGray>
                </StyledExternalLink>
                <StyledExternalLink
                  href={`/#/swap?inputCurrency=${poolData.token0.address}&outputCurrency=${poolData.token1.address}`}
                >
                  <ButtonPrimary width="100px" style={{ height: '44px' }}>
                    Trade
                  </ButtonPrimary>
                </StyledExternalLink>
              </RowFixed>
            )}
          </ResponsiveRow>
          <ContentLayout>
            <DarkGrayCard>
              <AutoColumn gap="lg">
                <GrayCard padding="16px">
                  <AutoColumn gap="md">
                    <TYPE.main>Total Tokens Locked</TYPE.main>
                    <RowBetween>
                      <RowFixed>
                        <CurrencyLogo address={poolData.token0.address} size="20px" />
                        <TYPE.label fontSize="14px" ml="8px">
                          {poolData.token0.symbol}
                        </TYPE.label>
                      </RowFixed>
                      <TYPE.label fontSize="14px">{formatAmount(poolData.tvlToken0)}</TYPE.label>
                    </RowBetween>
                    <RowBetween>
                      <RowFixed>
                        <CurrencyLogo address={poolData.token1.address} size="20px" />
                        <TYPE.label fontSize="14px" ml="8px">
                          {poolData.token1.symbol}
                        </TYPE.label>
                      </RowFixed>
                      <TYPE.label fontSize="14px">{formatAmount(poolData.tvlToken1)}</TYPE.label>
                    </RowBetween>
                  </AutoColumn>
                </GrayCard>
                <AutoColumn gap="4px">
                  <TYPE.main fontWeight={400}>TVL</TYPE.main>
                  <TYPE.label fontSize="24px">{formatDollarAmount(poolData.tvlUSD)}</TYPE.label>
                  <Percent value={poolData.tvlUSDChange} />
                </AutoColumn>
                <AutoColumn gap="4px">
                  <TYPE.main fontWeight={400}>Volume 24h</TYPE.main>
                  <TYPE.label fontSize="24px">{formatDollarAmount(poolData.volumeUSD)}</TYPE.label>
                  <Percent value={poolData.volumeUSDChange} />
                </AutoColumn>
                <AutoColumn gap="4px">
                  <TYPE.main fontWeight={400}>24h Fees</TYPE.main>
                  <TYPE.label fontSize="24px">
                    {formatDollarAmount(poolData.volumeUSD * (poolData.feeTier / 1000000))}
                  </TYPE.label>
                </AutoColumn>
              </AutoColumn>
            </DarkGrayCard>
            <DarkGrayCard>
              <ToggleRow align="flex-start">
                <AutoColumn>
                  <TYPE.label fontSize="24px" height="30px">
                    <MonoSpace>
                      {latestValue
                        ? formatDollarAmount(latestValue)
                        : view === ChartView.VOL
                        ? formatDollarAmount(formattedVolumeData[formattedVolumeData.length - 1]?.value)
                        : view === ChartView.DENSITY
                        ? ''
                        : formatDollarAmount(formattedTvlData[formattedTvlData.length - 1]?.value)}{' '}
                    </MonoSpace>
                  </TYPE.label>
                  <TYPE.main height="20px" fontSize="12px">
                    {valueLabel ? <MonoSpace>{valueLabel} (UTC)</MonoSpace> : ''}
                  </TYPE.main>
                </AutoColumn>
                <ToggleWrapper width="240px">
                  <ToggleElementFree
                    isActive={view === ChartView.VOL}
                    fontSize="12px"
                    onClick={() => (view === ChartView.VOL ? setView(ChartView.DENSITY) : setView(ChartView.VOL))}
                  >
                    Volume
                  </ToggleElementFree>
                  <ToggleElementFree
                    isActive={view === ChartView.DENSITY}
                    fontSize="12px"
                    onClick={() => (view === ChartView.DENSITY ? setView(ChartView.VOL) : setView(ChartView.DENSITY))}
                  >
                    Liquidity
                  </ToggleElementFree>
                  <ToggleElementFree
                    isActive={view === ChartView.FEES}
                    fontSize="12px"
                    onClick={() => (view === ChartView.FEES ? setView(ChartView.VOL) : setView(ChartView.FEES))}
                  >
                    Fees
                  </ToggleElementFree>
                </ToggleWrapper>
              </ToggleRow>
              {view === ChartView.VOL ? (
                <BarChart
                  data={formattedVolumeData}
                  color={backgroundColor}
                  minHeight={340}
                  setValue={setLatestValue}
                  setLabel={setValueLabel}
                  value={latestValue}
                  label={valueLabel}
                />
              ) : view === ChartView.FEES ? (
                <BarChart
                  data={formattedFeesUSD}
                  color={backgroundColor}
                  minHeight={340}
                  setValue={setLatestValue}
                  setLabel={setValueLabel}
                  value={latestValue}
                  label={valueLabel}
                />
              ) : (
                <DensityChart address={tokenAddress || ''} />
              )}
            </DarkGrayCard>
          </ContentLayout>
          <TYPE.main fontSize="24px">Transactions</TYPE.main>
          <DarkGrayCard>
            {transactions ? <TransactionTable transactions={transactions} /> : <LocalLoader fill={false} />}
          </DarkGrayCard>
        </AutoColumn>
      ) : (
        <Loader />
      )}
    </PageWrapper>
  )
}
