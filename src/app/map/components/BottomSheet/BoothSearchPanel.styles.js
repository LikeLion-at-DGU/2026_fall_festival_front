import styled from 'styled-components'
import { statusMessageStyles } from '../statusMessageStyles'

export const Panel = styled.div`
  padding: 24px 8px 0;
  color: #555;
  button:focus-visible, input:focus-visible {
    outline: none;
    outline-offset: 2px;
  }
`
export const SearchRow = styled.form`
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ $isNight }) => $isNight ? '#272727' : '#9F9C99'};
`
export const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  height: 40px;
  border: 1px solid ${({ $isNight }) => $isNight ? '#272727' : '#9F9C99'};
  border-radius: 8px;
`
export const Input = styled.input`
  flex: 1;
  width: 100%;
  min-width: 0;
  border: 0;
  padding: 8px 4px;
  background: transparent;
  font: inherit;
  font-size: 16px;
  color: ${({ $isNight }) => $isNight ? '#272727' : '#9F9C99'};
  &::placeholder {
    color: ${({ $isNight }) => $isNight ? '#272727' : '#9F9C99'};
    opacity: 1;
  }

  &::-webkit-search-cancel-button {
    display: none;
  }
`
export const ClearInputButton = styled.button`
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${({ $isNight }) => $isNight ? '#272727' : '#9F9C99'};
  cursor: pointer;

  svg {
    display: block;
  }
`
export const TextButton = styled.button`
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: ${({ $isNight }) => $isNight ? '#272727' : '#9F9C99'};
  font-size: 14px;
  white-space: nowrap;
  &:disabled { opacity: 1; cursor: default; }
`
export const IconButton = styled.button`
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
`
export const CloseMark = styled.span`
  color: ${({ $isNight }) => $isNight ? '#272727' : '#9F9C99'};
  font-size: 26px;
  line-height: 1;
  font-weight: 300;
`
export const HistoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 8px;
`
export const Heading = styled.h2`
  margin: 0;
  padding-top: 12px;
  color: ${({ $isNight }) => $isNight ? '#272727' : '#9F9C99'};
  font-size: 14px;
  font-weight: 600;
`
export const HistoryList = styled.ul`list-style: none; margin: 0; padding: 0;`
export const HistoryItem = styled.li`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding-left: 8px;
`
export const TermButton = styled(TextButton)`
  flex: 1;
  min-width: 0;
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
  font-size: 16px;
`
export const Empty = styled.p`
  ${statusMessageStyles}
`
