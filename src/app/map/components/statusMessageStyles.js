import { css } from 'styled-components'

export const statusMessageStyles = css`
  margin: 0;
  padding: 24px 0;
  text-align: center;
  color: ${({ $isNight }) => $isNight ? '#272727' : '#9F9C99'};
  font-family: Pretendard;
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
`
