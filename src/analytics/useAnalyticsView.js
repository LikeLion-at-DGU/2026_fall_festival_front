import { useTranslation } from '../i18n/useTranslation'
import { useEffect, useRef } from 'react'
import { trackEvent } from './analytics'

// A visibility episode, not a lifetime ID cache: closing/reopening counts again.
// A ref survives StrictMode effect replay; cleanup deliberately does not reset it.
export function useAnalyticsView(name, visible, key = 'view', params = {}, resetWhenHidden = true) {
  const last = useRef(null)
  const { language } = useTranslation()
  useEffect(() => {
    if (!visible) { if (resetWhenHidden) last.current = null; return }
    if (last.current === key) return
    last.current = key
    trackEvent(name, { language, ...params })
  })
}
