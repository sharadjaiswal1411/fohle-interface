import { Trans } from '@lingui/macro'
import { Trace } from '@uniswap/analytics'
import { PageName } from '@uniswap/analytics-events'
import { useWeb3React } from '@web3-react/core'
import { ButtonPrimary } from 'components/Button'
import PoolTable from 'components/Pools/PoolTable/PoolTable'
import { sortAscendingAtom, sortMethodAtom } from 'components/Pools/state'
import { MAX_WIDTH_MEDIA_BREAKPOINT, MEDIUM_MEDIA_BREAKPOINT } from 'components/Tokens/constants'
import { filterStringAtom } from 'components/Tokens/state'
import { POOL_HIDE } from 'constants/index'
import { EthereumNetworkInfo, SUPPORTED_NETWORK_VERSIONS } from 'constants/networks'
import { chainIdToBackendName, isValidBackendChainName } from 'graphql/data/util'
import { useOnGlobalChainSwitch } from 'hooks/useGlobalChainSwitch'
import { useResetAtom } from 'jotai/utils'
import { useAtomValue } from 'jotai/utils'
import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useActiveNetworkVersion } from 'state/application/hooks'
import { useAllPoolData } from 'state/pools/hooks'
import { PoolData } from 'state/pools/reducer'
import styled from 'styled-components/macro'
import { ThemedText } from 'theme'
import { notEmpty } from 'utils'

const ExploreContainer = styled.div`
  width: 100%;
  min-width: 320px;
  padding: 68px 12px 0px;

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.md}px`}) {
    padding-top: 48px;
  }

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.sm}px`}) {
    padding-top: 20px;
  }
`
const TitleContainer = styled.div`
  margin-bottom: 32px;
  max-width: ${MAX_WIDTH_MEDIA_BREAKPOINT};
  margin-left: auto;
  margin-right: auto;
  display: flex;
`

const ResponsiveButtonPrimary = styled(ButtonPrimary)`
  border-radius: 12px;
  font-size: 16px;
  padding: 6px 8px;
  width: fit-content;
  ${({ theme }) => theme.deprecated_mediaWidth.deprecated_upToSmall`
    flex: 1 1 auto;
    width: 100%;
  `};
`
const FiltersContainer = styled.div`
  display: flex;
  gap: 8px;
  height: 40px;

  @media only screen and (max-width: ${MEDIUM_MEDIA_BREAKPOINT}) {
    order: 2;
  }
`
const SearchContainer = styled(FiltersContainer)`
  width: 100%;
  margin-left: 8px;

  @media only screen and (max-width: ${MEDIUM_MEDIA_BREAKPOINT}) {
    margin: 0px;
    order: 1;
  }
`
const FiltersWrapper = styled.div`
  display: flex;
  max-width: ${MAX_WIDTH_MEDIA_BREAKPOINT};
  margin: 0 auto;
  margin-bottom: 20px;

  @media only screen and (max-width: ${MEDIUM_MEDIA_BREAKPOINT}) {
    flex-direction: column;
    gap: 8px;
  }
`

const Pools = () => {
  const resetFilterString = useResetAtom(filterStringAtom)
  const location = useLocation()
  const navigate = useNavigate()

  const { chainName: chainNameParam } = useParams<{ chainName?: string }>()
  const { chainId: connectedChainId } = useWeb3React()
  const connectedChainName = chainIdToBackendName(connectedChainId)

  const [activeNetwork, setActiveNetwork] = useActiveNetworkVersion()
  useEffect(() => {
    if (chainNameParam?.toLowerCase() === 'ethereum') {
      setActiveNetwork(EthereumNetworkInfo)
    } else {
      SUPPORTED_NETWORK_VERSIONS.map((n) => {
        if (location.pathname.includes(n.route.toLocaleLowerCase())) {
          setActiveNetwork(n)
        }
      })
    }
  }, [chainNameParam, setActiveNetwork])

  // get all the pool datas that exist
  const allPoolData = useAllPoolData()
  const poolDatas = useMemo(() => {
    return Object.values(allPoolData)
      .map((p) => p.data)
      .filter(notEmpty)
  }, [allPoolData])

  const sortMethod = useAtomValue(sortMethodAtom)
  const sortAscending = useAtomValue(sortAscendingAtom)
  const sortedPools = useMemo(() => {
    return poolDatas
      ? poolDatas
          .filter((x) => !!x && !POOL_HIDE[activeNetwork.id].includes(x.address))
          .sort((a, b) => {
            if (a && b) {
              return a[sortMethod as keyof PoolData] > b[sortMethod as keyof PoolData]
                ? (sortAscending ? 1 : -1) * 1
                : (sortAscending ? 1 : -1) * -1
            } else {
              return -1
            }
          })
          .slice(0, 50)
      : []
  }, [activeNetwork, poolDatas, sortAscending, sortMethod])

  useEffect(() => {
    resetFilterString()
  }, [location, resetFilterString])

  useEffect(() => {
    if (!chainNameParam) {
      navigate(`/pools/${connectedChainName.toLowerCase()}`, { replace: true })
    }
  }, [chainNameParam, connectedChainName, navigate])

  useOnGlobalChainSwitch((chain) => {
    if (isValidBackendChainName(chain)) {
      navigate(`/pools/${chain.toLowerCase()}`, { replace: true })
    }
  })

  return (
    <Trace page={PageName.TOKENS_PAGE} shouldLogImpression>
      <ExploreContainer>
        <TitleContainer>
          <ThemedText.LargeHeader>
            <Trans>Top pools on Thera ECOSYSTEM</Trans>
          </ThemedText.LargeHeader>
        </TitleContainer>
        <FiltersWrapper>
          <FiltersContainer>{/*<NetworkFilter />*/}</FiltersContainer>
          <SearchContainer>
            {/*<SearchBar />*/}
            <ResponsiveButtonPrimary data-cy="join-pool-button" id="join-pool-button" as={Link} to="/add/ETH">
              + <Trans>Create New</Trans>
            </ResponsiveButtonPrimary>
            <ResponsiveButtonPrimary data-cy="join-pool-button" id="join-pool-button" as={Link} to="/pool">
              <Trans>Manage Pools</Trans>
            </ResponsiveButtonPrimary>
          </SearchContainer>
        </FiltersWrapper>
        <PoolTable poolDatas={sortedPools} />
      </ExploreContainer>
    </Trace>
  )
}

export default Pools
