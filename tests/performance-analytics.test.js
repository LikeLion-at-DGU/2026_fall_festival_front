import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'
import * as React from 'react'
import { JSDOM } from 'jsdom'
import { transformWithEsbuild } from 'vite'
import { festivalDay } from '../src/analytics/policy.js'

function evaluate(source, dependencies, name) {
  const code = source.replace(/^import[\s\S]*?from ['"][^'"]+['"];?\r?\n/gm, '')
    .replace(/export default /g, '').replace(/export function /g, 'function ')
  return vm.runInNewContext(`${code}\n;${name}`, { ...dependencies, console, AbortController })
}

test('performance event follows rendered detail content, including empty/unspecified setlists; excludes redirect/loading/failure', async () => {
  const dom = new JSDOM('<div id="root"></div>')
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const { createRoot } = await import('react-dom/client')
  const events = []
  const dependencies = {
    React, useEffect: React.useEffect, useRef: React.useRef, useState: React.useState,
    useTranslation: () => ({ language: 'ko', t: (key) => key }),
    trackEvent: (name, params) => events.push({ name, params }),
  }
  const useAnalyticsView = evaluate(readFileSync(new URL('../src/analytics/useAnalyticsView.js', import.meta.url), 'utf8'), dependencies, 'useAnalyticsView')
  let resolveRequest
  let rejectRequest
  const source = readFileSync(new URL('../src/app/performance/PerformanceDetailPage.jsx', import.meta.url), 'utf8')
  const { code } = await transformWithEsbuild(source, 'PerformanceDetailPage.jsx', {
    loader: 'jsx', jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment',
  })
  const Page = evaluate(code, {
    ...dependencies, useAnalyticsView, festivalDay,
    useParams: () => ({ id: '7' }), useNavigate: () => () => {},
    Navigate: ({ to }) => React.createElement('div', { 'data-redirect': to }),
    PerformanceInfo: () => React.createElement('div', { 'data-performance': true }, 'Detail'),
    Setlist: () => React.createElement('div', null, 'Setlist'),
    S: new Proxy({}, { get: () => 'div' }),
    getPerformanceDetail: () => new Promise((resolve, reject) => { resolveRequest = resolve; rejectRequest = reject }),
  }, 'PerformanceDetailPage')
  try {
    for (const outcome of ['true', 'missing', 'null', 'false', 'failure', 'not_found']) {
      events.length = 0
      const root = createRoot(document.getElementById('root'))
      try {
        await React.act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(Page))))
        assert.equal(events.length, 0, 'loading is not a detail view')
        await React.act(async () => {
          if (outcome === 'failure' || outcome === 'not_found') {
            rejectRequest({ response: { status: outcome === 'not_found' ? 404 : 500 } })
          } else {
            const performance = { performance_id: 7, festival_date: '2026-09-30', songs: [] }
            if (outcome !== 'missing') performance.has_setlist = JSON.parse(outcome)
            resolveRequest({ data: { success: true, data: performance } })
          }
        })
        const shown = ['true', 'missing', 'null'].includes(outcome)
        assert.equal(Boolean(document.querySelector('[data-performance]')), shown, outcome)
        assert.equal(events.filter((event) => event.name === 'performance_selected').length, shown ? 1 : 0, outcome)
        await React.act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(Page))))
        assert.equal(events.filter((event) => event.name === 'performance_selected').length, shown ? 1 : 0, 'rerender must not count again')
      } finally {
        await React.act(async () => root.unmount())
      }
    }
  } finally {
    dom.window.close()
    delete globalThis.window; delete globalThis.document; delete globalThis.IS_REACT_ACT_ENVIRONMENT
  }
})
