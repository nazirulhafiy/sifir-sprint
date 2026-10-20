#!/usr/bin/env node
/**
 * Layout check for the built game.
 *
 * Same browser harness as e2e/ (Playwright). Serves `vite preview` of `dist/`
 * unless LAYOUT_CHECK_URL is set, then opens Chromium and WebKit.
 *
 * Fails when the page scrolls horizontally, `[data-box]` elements overlap
 * (a box that contains another is not an overlap), a `[data-box]` element is
 * clipped (scroll size greater than its client box on a non-visible overflow
 * axis, or a clipping ancestor cuts its border box), or a `[data-one-line]`
 * element wraps onto more than one line.
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium, webkit } from '@playwright/test'

const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))

const VIEWPORTS = [
  { name: '375x667', width: 375, height: 667 },
  { name: '390x844', width: 390, height: 844 },
  { name: '390x680', width: 390, height: 680 },
  { name: '1280x800', width: 1280, height: 800 },
]

const SCHEMES = ['light', 'dark']
const SCREENS = ['start', 'play', 'masa-tamat']
const TOLERANCE_PX = 1

const browserTypes = { chromium, webkit }

function selectedBrowsers() {
  const raw = process.env.LAYOUT_CHECK_BROWSERS || 'chromium,webkit'
  const names = raw.split(',').map((name) => name.trim()).filter(Boolean)
  for (const name of names) {
    if (!browserTypes[name]) {
      throw new Error(`Unknown browser "${name}". Use chromium and/or webkit.`)
    }
  }
  return names
}

function previewUrl(port) {
  return `http://127.0.0.1:${port}/sifir/`
}

function startPreview(port) {
  const child = spawn(
    process.execPath,
    [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  let log = ''
  child.stdout.on('data', (chunk) => {
    log += chunk
  })
  child.stderr.on('data', (chunk) => {
    log += chunk
  })
  return { child, log: () => log }
}

async function waitForPreview(url, child, log) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`vite preview exited ${child.exitCode}\n${log()}`)
    }
    try {
      const response = await fetch(url)
      if (response.ok || response.status === 404) return
    } catch {
      /* preview not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Timed out waiting for ${url}\n${log()}`)
}

function describeFailures(failures) {
  return failures.map((failure) => {
    if (failure.kind === 'horizontal-overflow') {
      return `  horizontal overflow: scrollWidth ${failure.scrollWidth} > clientWidth ${failure.clientWidth}`
    }
    if (failure.kind === 'overlap') {
      return `  overlap: ${failure.a} × ${failure.b} (x ${failure.overlapX}px, y ${failure.overlapY}px)`
    }
    if (failure.kind === 'clipped') {
      if (failure.via === 'ancestor') {
        return `  clipped: ${failure.label} border box is cut by a clipping ancestor`
      }
      return `  clipped: ${failure.label} scroll ${failure.scrollWidth}×${failure.scrollHeight} client ${failure.clientWidth}×${failure.clientHeight}`
    }
    if (failure.kind === 'wrap') {
      return `  wrapped: ${failure.label} is ${failure.lines} lines`
    }
    if (failure.kind === 'missing-markers') {
      return `  missing markers: play screen has no [data-box] elements`
    }
    return `  ${JSON.stringify(failure)}`
  })
}

async function settle(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 8000)),
      ])
    }
    for (const animation of document.getAnimations()) {
      try {
        animation.finish()
      } catch {
        /* animation may already be finished */
      }
    }
  })
}

async function measure(page) {
  return page.evaluate((tolerance) => {
    function px(value) {
      return Math.round(value * 10) / 10
    }

    function describe(el) {
      const tag = el.tagName.toLowerCase()
      const testid = el.getAttribute('data-testid')
      if (testid) return `${tag}[data-testid="${testid}"]`
      const text = (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40)
      return text ? `${tag} "${text}"` : tag
    }

    function clips(overflow) {
      return overflow === 'hidden' || overflow === 'clip' || overflow === 'scroll' || overflow === 'auto'
    }

    function lineCount(el) {
      const text = (el.innerText || '').replace(/\s+/g, ' ').trim()
      if (!text) return 1
      const range = document.createRange()
      range.selectNodeContents(el)
      const rects = [...range.getClientRects()].filter((rect) => rect.width > 0.5 && rect.height > 0.5)
      const tops = []
      for (const rect of rects) {
        if (!tops.some((top) => Math.abs(top - rect.top) <= 2)) tops.push(rect.top)
      }
      return Math.max(1, tops.length)
    }

    const failures = []
    const doc = document.documentElement
    const scrollWidth = Math.max(doc.scrollWidth, document.body?.scrollWidth ?? 0)
    const clientWidth = doc.clientWidth
    if (scrollWidth > clientWidth + tolerance) {
      failures.push({
        kind: 'horizontal-overflow',
        scrollWidth,
        clientWidth,
      })
    }

    const boxes = [...document.querySelectorAll('[data-box]')]
    const measured = boxes.map((el) => ({
      el,
      label: describe(el),
      rect: el.getBoundingClientRect(),
    }))

    for (let i = 0; i < measured.length; i += 1) {
      for (let j = i + 1; j < measured.length; j += 1) {
        const a = measured[i]
        const b = measured[j]
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue
        const overlapX = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left)
        const overlapY = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top)
        if (overlapX > tolerance && overlapY > tolerance) {
          failures.push({
            kind: 'overlap',
            a: a.label,
            b: b.label,
            overlapX: px(overlapX),
            overlapY: px(overlapY),
          })
        }
      }
    }

    for (const el of boxes) {
      const style = getComputedStyle(el)
      const overflowY = el.scrollHeight - el.clientHeight
      const overflowX = el.scrollWidth - el.clientWidth
      // scrollHeight > clientHeight with overflow:visible still paints (flex
      // min-h-0 and Chromium's border-in-scrollHeight). Count it only when
      // that axis actually clips.
      if (
        (clips(style.overflowY) && overflowY > tolerance) ||
        (clips(style.overflowX) && overflowX > tolerance)
      ) {
        failures.push({
          kind: 'clipped',
          via: 'scroll',
          label: describe(el),
          scrollWidth: el.scrollWidth,
          scrollHeight: el.scrollHeight,
          clientWidth: el.clientWidth,
          clientHeight: el.clientHeight,
        })
        continue
      }

      const rect = el.getBoundingClientRect()
      if (rect.width < 1 && rect.height < 1) continue
      let parent = el.parentElement
      while (parent) {
        const parentStyle = getComputedStyle(parent)
        const parentRect = parent.getBoundingClientRect()
        const cutX =
          clips(parentStyle.overflowX) &&
          (rect.left < parentRect.left - tolerance || rect.right > parentRect.right + tolerance)
        const cutY =
          clips(parentStyle.overflowY) &&
          (rect.top < parentRect.top - tolerance || rect.bottom > parentRect.bottom + tolerance)
        if (cutX || cutY) {
          failures.push({ kind: 'clipped', via: 'ancestor', label: describe(el) })
          break
        }
        parent = parent.parentElement
      }
    }

    for (const el of document.querySelectorAll('[data-one-line]')) {
      const lines = lineCount(el)
      if (lines > 1) {
        failures.push({ kind: 'wrap', label: describe(el), lines })
      }
    }

    return failures
  }, TOLERANCE_PX)
}

async function openScreen(context, screen, url) {
  if (screen === 'masa-tamat') return openMasaTamat(context, url)

  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.getByTestId('landing').waitFor()
  if (screen === 'play') {
    await page.getByTestId('mula').click()
    await page.getByTestId('soalan').waitFor()
  }
  await settle(page)
  return page
}

async function openMasaTamat(context, url) {
  const page = await context.newPage()
  try {
    // One fastForward skips setInterval ticks. Step one second at a time.
    await page.clock.install()
    await page.clock.resume()
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.getByTestId('landing').waitFor()
    await page.getByTestId('mula').click()
    await page.getByTestId('soalan').waitFor()
    for (let step = 0; step < 62; step += 1) {
      if (await page.getByTestId('masa-tamat').isVisible()) break
      await page.clock.fastForward(1000)
    }
    await page.getByTestId('masa-tamat').waitFor({ timeout: 2_000 })
  } catch {
    await page.goto(withMasa(url, 5), { waitUntil: 'domcontentloaded' })
    await page.getByTestId('landing').waitFor()
    await page.getByTestId('mula').click()
    await page.getByTestId('masa-tamat').waitFor({ timeout: 15_000 })
  }
  await settle(page)
  return page
}

function withMasa(url, seconds) {
  const next = new URL(url)
  next.searchParams.set('masa', String(seconds))
  return next.href
}

async function runBrowser(name, url) {
  const started = Date.now()
  const browser = await browserTypes[name].launch()
  const failures = []
  try {
    for (const viewport of VIEWPORTS) {
      for (const scheme of SCHEMES) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          colorScheme: scheme,
          deviceScaleFactor: 1,
        })
        await context.addInitScript(() => {
          try {
            localStorage.setItem('sifir-sprint.bisu', '1')
          } catch {
            /* private mode */
          }
        })
        try {
          for (const screen of SCREENS) {
            const page = await openScreen(context, screen, url)
            try {
              const found = await measure(page)
              if (screen === 'play') {
                const boxes = await page.locator('[data-box]').count()
                if (boxes < 1) found.push({ kind: 'missing-markers' })
              }
              if (found.length > 0) {
                failures.push({
                  browser: name,
                  viewport: viewport.name,
                  scheme,
                  screen,
                  found,
                })
              }
            } finally {
              await page.close()
            }
          }
        } finally {
          await context.close()
        }
      }
    }
  } finally {
    await browser.close()
  }
  return { name, ms: Date.now() - started, failures }
}

function formatSeconds(ms) {
  return `${(ms / 1000).toFixed(1)}s`
}

function printReport(results, url) {
  const failures = results.flatMap((result) => result.failures)
  const status = failures.length === 0 ? 'PASS' : 'FAIL'
  const checks = results.length * VIEWPORTS.length * SCHEMES.length * SCREENS.length
  const lines = [
    `layout-check: ${status}`,
    `url: ${url}`,
    `label: ${process.env.LAYOUT_CHECK_LABEL || 'current'}`,
    `checks: ${checks} (${results.length} browsers × ${VIEWPORTS.length} viewports × ${SCHEMES.length} schemes × ${SCREENS.length} screens)`,
    `browsers: ${results.map((result) => `${result.name} ${formatSeconds(result.ms)}`).join(', ')}`,
    `total: ${formatSeconds(results.reduce((sum, result) => sum + result.ms, 0))}`,
  ]
  if (failures.length === 0) {
    console.log(lines.join('\n'))
    return
  }
  console.log(lines.join('\n'))
  console.log('')
  for (const failure of failures) {
    console.log(`${failure.browser} ${failure.scheme} ${failure.viewport} ${failure.screen}`)
    console.log(describeFailures(failure.found).join('\n'))
  }
}

async function main() {
  const names = selectedBrowsers()
  const port = Number(process.env.LAYOUT_CHECK_PORT || 4173)
  const externalUrl = process.env.LAYOUT_CHECK_URL
  let preview = null
  const url = externalUrl || previewUrl(port)

  if (!externalUrl) {
    preview = startPreview(port)
    try {
      await waitForPreview(url, preview.child, preview.log)
    } catch (error) {
      preview.child.kill('SIGTERM')
      throw error
    }
  }

  try {
    const results = []
    for (const name of names) {
      results.push(await runBrowser(name, url))
    }
    printReport(results, url)
    const failed = results.some((result) => result.failures.length > 0)
    if (preview) preview.child.kill('SIGTERM')
    process.exit(failed ? 1 : 0)
  } finally {
    if (preview && preview.child.exitCode === null) preview.child.kill('SIGTERM')
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error)
  process.exit(1)
})
