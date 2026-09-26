import { useLocation } from 'react-router-dom'
import { useAnalyticsView } from './useAnalyticsView'

export default function AnalyticsPage() {
  const { pathname } = useLocation()
  // Query-only map/search/filter changes are interactions, not extra page views.
  useAnalyticsView('page_view', true, pathname)
  return null
}
