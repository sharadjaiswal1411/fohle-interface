import { Trans } from '@lingui/macro'
import { ReactNode } from 'react'
import { PoolData } from 'state/pools/reducer'
import styled from 'styled-components/macro'

import { MAX_WIDTH_MEDIA_BREAKPOINT } from '../constants'
import { HeaderRow, LoadedRow, LoadingRow } from './TokenRow'
//import { PageButtons, Arrow, Break } from 'components/shared'

const PAGE_SIZE = 20
const GridContainer = styled.div`
  display: flex;
  flex-direction: column;
  max-width: ${MAX_WIDTH_MEDIA_BREAKPOINT};
  background-color: ${({ theme }) => theme.backgroundSurface};
  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);
  margin-left: auto;
  margin-right: auto;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
  border: 1px solid ${({ theme }) => theme.backgroundOutline};
`

const TokenDataContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 100%;
  width: 100%;
`

const NoTokenDisplay = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  height: 60px;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 16px;
  font-weight: 500;
  align-items: center;
  padding: 0px 28px;
  gap: 8px;
`

function NoTokensState({ message }: { message: ReactNode }) {
  return (
    <GridContainer>
      <HeaderRow />
      <NoTokenDisplay>{message}</NoTokenDisplay>
    </GridContainer>
  )
}

const LoadingRows = ({ rowCount }: { rowCount: number }) => (
  <>
    {Array(rowCount)
      .fill(null)
      .map((_, index) => {
        return <LoadingRow key={index} first={index === 0} last={index === rowCount - 1} />
      })}
  </>
)

function LoadingTokenTable({ rowCount = PAGE_SIZE }: { rowCount?: number }) {
  return (
    <GridContainer>
      <HeaderRow />
      <TokenDataContainer>
        <LoadingRows rowCount={rowCount} />
      </TokenDataContainer>
    </GridContainer>
  )
}

export default function PoolTable({ poolDatas }: { poolDatas: PoolData[] }) {
  // const [page, setPage] = useState(1)
  // const [maxPage, setMaxPage] = useState(1)

  //console.log("poolDatas",poolDatas);

  // useEffect(() => {
  //    let extraPages = 1
  //    if (poolDatas.length % PAGE_SIZE === 0) {
  //      extraPages = 0
  //    }
  //    setMaxPage(Math.floor(poolDatas.length / PAGE_SIZE) + extraPages)
  //  }, [poolDatas])

  /* loading and error state */
  if (!poolDatas) {
    return <LoadingTokenTable rowCount={PAGE_SIZE} />
  } else if (poolDatas?.length === 0) {
    return <NoTokensState message={<Trans>No Pools found</Trans>} />
  } else {
    return (
      <GridContainer>
        <HeaderRow />
        <TokenDataContainer>
          {poolDatas.map(
            (pool, index) =>
              pool && (
                <LoadedRow key={pool?.address} tokenListIndex={index} totalPools={poolDatas.length} poolData={pool} />
              )
          )}
          {/*         <PageButtons>
            <div
              onClick={() => {
                setPage(page === 1 ? page : page - 1)
              }}
            >
              <Arrow faded={page === 1 ? true : false}>←</Arrow>
            </div>
            <div>{'Page ' + page + ' of ' + maxPage}</div>
            <div
              onClick={() => {
                setPage(page === maxPage ? page : page + 1)
              }}
            >
              <Arrow faded={page === maxPage ? true : false}>→</Arrow>
            </div>
          </PageButtons>*/}
        </TokenDataContainer>
      </GridContainer>
    )
  }
}
