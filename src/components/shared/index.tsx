import styled from 'styled-components/macro'

export const PageButtons = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.2em;
  margin-bottom: 0.5em;
`

export const Arrow = styled.div<{ faded: boolean }>`
  color: ${({ theme }) => theme.textPrimary};
  opacity: ${(props) => (props.faded ? 0.3 : 1)};
  padding: 0 20px;
  user-select: none;
  :hover {
    cursor: pointer;
  }
`

export const Break = styled.div`
  height: 1px;
  background-color: ${({ theme }) => theme.deprecated_bg1};
  width: 100%;
`

export const MonoSpace = styled.span`
  font-variant-numeric: tabular-nums;
`