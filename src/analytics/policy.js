import { FESTIVAL_DATES } from '../constants/festivalDates.js'

export const MEASUREMENT_ID = 'G-E9CQ5GQLDK'
export const normalizeLanguage = (value) => ({ 'zh-CN': 'zh' }[value] ?? (['ko', 'en', 'zh', 'ja'].includes(value) ? value : 'ko'))
export const boothType = (booth) => String(booth?.category ?? booth?.place_type ?? 'unknown').toLowerCase()
export function festivalDay(date) {
  const value = date || new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date())
  const index = FESTIVAL_DATES.indexOf(value)
  return index >= 0 ? String(index + 1) : value < FESTIVAL_DATES[0] ? 'before' : value > FESTIVAL_DATES.at(-1) ? 'after' : 'unknown'
}
export function isExcluded({ hostname, pathname }, { dev = false, adminApp = false, adminAuthed = false } = {}) {
  return dev || adminApp || adminAuthed || !['dgufesta.com', 'www.dgufesta.com'].includes(hostname.toLowerCase())
    || /^\/(admin|login|lanterns|notices|lost-found|ui-preview)(\/|$)/i.test(pathname)
}
export function pageName(pathname) {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/info/notices')) return 'notice'
  return ({ map: 'map', performance: 'performance', info: 'info', lantern: 'lantern' })[pathname.split('/')[1]] ?? 'other'
}
// Campaigns belong to the landing page view only; never retain arbitrary input.
export function safeLocation(href, includeCampaign = false) {
  const url = new URL(href)
  const query = new URLSearchParams()
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content']) {
    if (includeCampaign && url.searchParams.has(key)) query.set(key, url.searchParams.get(key))
  }
  return `${url.origin}${url.pathname}${query.size ? `?${query}` : ''}`
}
export function errorType(error) {
  const code = error?.response?.data?.code ?? error?.code
  if (['DAILY_LIMIT_EXCEEDED', 'BOOTH_NOT_FOUND', 'DUPLICATE_BOOTH_LANTERN', 'FORBIDDEN_WORD_DETECTED', 'INVALID_REQUEST_PARAM'].includes(code)) return code.toLowerCase()
  const status = error?.response?.status
  return status >= 500 ? 'server' : status === 401 || status === 403 ? 'auth' : status >= 400 ? 'request' : error?.response ? 'invalid_response' : 'network'
}
