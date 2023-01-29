import { Trans } from '@lingui/macro'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import Loader from 'components/Loader'
import useBasicChartData, { LiveDataTimeframeEnum } from 'hooks/useBasicChartData'
import useTheme from 'hooks/useTheme'
import React, { useEffect, useMemo, useState } from 'react'
import { isMobile } from 'react-device-detect'
import { Repeat } from 'react-feather'
import { Flex, Text } from 'rebass'
import styled from 'styled-components/macro'
import { unwrappedToken } from 'utils/unwrappedToken'

import AnimatingNumber from './AnimatingNumber'
import CircleInfoIcon from './CircleInfoIcon'
import LineChart from './LineChart'
import WarningIcon from './WarningIcon'

const LiveChartWrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`
const TimeFrameButton = styled.div<{ active?: boolean }>`
  cursor: pointer;
  width: 26px;
  height: 24px;
  border-radius: 4px;
  line-height: 24px;
  margin-right: 5px;
  text-align: center;
  color: ${({ theme }) => theme.textPrimary};
  font-size: 12px;
  font-weight: 500;
  background-color: ${({ theme }) => theme.backgroundSurface};
  transition: all 0.2s ease;
  ${({ theme, active }) =>
    active
      ? `background-color: ${theme.textPrimary}; color: ${theme.textTertiary};`
      : `
    &:hover {
      background-color: "#4C82FB";
    }
  `}
`

const SwitchButtonWrapper = styled.div`
  display: flex;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  &:hover {
    background-color: ${({ theme }) => theme.textSecondary};
  }
`

const getDifferentValues = (chartData: any, hoverValue: number | null) => {
  if (chartData && chartData.length > 0) {
    const firstValue = chartData[0].value
    const lastValue = chartData[chartData.length - 1].value
    const differentValue = hoverValue !== null ? hoverValue - lastValue : lastValue - firstValue
    const compareValue = hoverValue !== null ? lastValue : firstValue
    return {
      chartColor: lastValue - firstValue >= 0 ? '#4C82FB' : '#4C82FB',
      different: differentValue.toPrecision(6),
      differentPercent: compareValue === 0 ? 100 : ((differentValue / compareValue) * 100).toFixed(2),
    }
  }
  return {
    chartColor: '#4C82FB',
    different: 0,
    differentPercent: 0,
  }
}

const getTimeFrameText = (timeFrame: LiveDataTimeframeEnum) => {
  switch (timeFrame) {
    case LiveDataTimeframeEnum.HOUR:
      return 'Past hour'
    case LiveDataTimeframeEnum.FOUR_HOURS:
      return 'Past 4 hours'
    case LiveDataTimeframeEnum.DAY:
      return 'Past 24 hours'
    case LiveDataTimeframeEnum.WEEK:
      return 'Past Week'
    case LiveDataTimeframeEnum.MONTH:
      return 'Past Month'
    case LiveDataTimeframeEnum.SIX_MONTHS:
      return 'Past 6 Months'
  }
}

function LiveChart({ currencies, onRotateClick }: { currencies: any; onRotateClick?: () => void }) {
  const theme = useTheme()
  const nativeInputCurrency = currencies.INPUT ? unwrappedToken(currencies.INPUT || undefined) : undefined
  const nativeOutputCurrency = currencies.OUTPUT ? unwrappedToken(currencies.OUTPUT || undefined) : undefined
  const tokens = useMemo(() => {
    return [nativeInputCurrency, nativeOutputCurrency].map((currency) => currency?.wrapped)
  }, [nativeInputCurrency, nativeOutputCurrency])

  const isWrappedToken = !!tokens[0]?.address && tokens[0]?.address === tokens[1]?.address
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const [timeFrame, setTimeFrame] = useState<LiveDataTimeframeEnum>(LiveDataTimeframeEnum.DAY)
  const [stateProChart, setStateProChart] = useState({
    hasProChart: false,
    pairAddress: '',
    apiVersion: '',
    loading: true,
  })
  const { data: chartData, error: basicChartError, loading: basicChartLoading } = useBasicChartData(tokens, timeFrame)
  const isProchartError = !stateProChart.hasProChart && !stateProChart.loading
  const isBasicchartError = basicChartError && !basicChartLoading

  useEffect(() => {
    if (hoverValue !== null) {
      setHoverValue(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData])

  useEffect(() => {
    if (!currencies.INPUT || !currencies.OUTPUT) return
    setStateProChart({ hasProChart: false, pairAddress: '', apiVersion: '', loading: true })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(currencies)])

  const showingValue = hoverValue ?? (chartData[chartData.length - 1]?.value || 0)

  const { chartColor, different, differentPercent } = getDifferentValues(chartData, hoverValue)

  const renderTimeframes = () => {
    return (
      <Flex marginTop="5px">
        {[...Object.values(LiveDataTimeframeEnum)].map((item) => {
          return (
            <TimeFrameButton key={item} onClick={() => setTimeFrame(item)} active={timeFrame === item}>
              {item}
            </TimeFrameButton>
          )
        })}
      </Flex>
    )
  }

  return (
    <LiveChartWrapper>
      {isWrappedToken ? (
        <Flex
          minHeight={isMobile ? '380px' : '440px'}
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          color={theme.textPrimary}
          style={{ gap: '16px' }}
        >
          <CircleInfoIcon />
          <Text fontSize={16} textAlign="center">
            <Trans>
              You can swap {nativeInputCurrency?.symbol} for {nativeOutputCurrency?.symbol} (and vice versa)
              <br />
              Exchange rate is always 1 to 1.
            </Trans>
          </Text>
        </Flex>
      ) : (
        <>
          <Flex justifyContent="space-between" alignItems="center" paddingY="4px">
            <Flex flex={isMobile ? 2 : 1}>
              <DoubleCurrencyLogo
                currency0={nativeInputCurrency}
                currency1={nativeOutputCurrency}
                size={24}
                margin={true}
              />
              <Flex alignItems="center" fontSize={isMobile ? 14 : 18} color={theme.textPrimary}>
                <Flex alignItems="center">
                  <Text fontSize={isMobile ? 18 : 24} fontWeight={500} color={theme.textSecondary}>
                    {nativeInputCurrency?.symbol}
                  </Text>
                  <Text marginLeft="4px" style={{ whiteSpace: 'nowrap' }}>
                    {' / '}
                    {nativeOutputCurrency?.symbol}
                  </Text>
                </Flex>
                <SwitchButtonWrapper onClick={onRotateClick}>
                  <Repeat size={14} />
                </SwitchButtonWrapper>
              </Flex>
            </Flex>
            {!isMobile && renderTimeframes()}
          </Flex>

          <>
            <Flex justifyContent="space-between" alignItems="flex-start" marginTop="12px">
              <Flex flexDirection="column" alignItems="flex-start">
                {showingValue === 0 || basicChartError ? (
                  <Text fontSize={28} color={theme.textPrimary}>
                    --
                  </Text>
                ) : (
                  <AnimatingNumber
                    value={showingValue}
                    symbol={nativeOutputCurrency?.symbol}
                    fontSize={isMobile ? 24 : 28}
                  />
                )}
                <Flex marginTop="2px">
                  {showingValue === 0 || basicChartError ? (
                    <Text fontSize={12} color={theme.textTertiary}>
                      --
                    </Text>
                  ) : (
                    <>
                      <Text
                        fontSize={12}
                        color={different >= 0 ? theme.accentSuccess : theme.accentCritical}
                        marginRight="5px"
                      >
                        {different} ({differentPercent}%)
                      </Text>
                      {!hoverValue && (
                        <Text fontSize={12} color={theme.textTertiary}>
                          {getTimeFrameText(timeFrame)}
                        </Text>
                      )}
                    </>
                  )}
                </Flex>
              </Flex>
            </Flex>
            {isMobile && renderTimeframes()}
            <div style={{ flex: 1, marginTop: '12px' }}>
              {basicChartLoading || isBasicchartError ? (
                <Flex
                  minHeight={isMobile ? '300px' : '370px'}
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  color={theme.textTertiary}
                  style={{ gap: '16px' }}
                >
                  {basicChartLoading ? (
                    <Loader />
                  ) : (
                    isBasicchartError && (
                      <>
                        <WarningIcon />
                        <Text fontSize={16}>
                          <Trans>Chart is unavailable right now</Trans>
                        </Text>
                      </>
                    )
                  )}
                </Flex>
              ) : (
                <LineChart
                  data={chartData}
                  setHoverValue={setHoverValue}
                  color={chartColor}
                  timeFrame={timeFrame}
                  minHeight={370}
                />
              )}
            </div>
          </>
        </>
      )}
    </LiveChartWrapper>
  )
}

export default React.memo(LiveChart)
