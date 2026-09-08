import { expect, test, type Locator, type Page } from '@playwright/test'

const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: '390x680', width: 390, height: 680 },
] as const

function isInViewport(box: { x: number; y: number; width: number; height: number }, vw: number, vh: number) {
  return box.x >= 0 && box.y >= 0 && box.x + box.width <= vw && box.y + box.height <= vh
}

async function assertFullyInViewport(locator: Locator, vw: number, vh: number, label: string) {
  const box = await locator.boundingBox()
  expect(box, `${label} should have a bounding box`).not.toBeNull()
  expect(isInViewport(box!, vw, vh), `${label} should be fully in viewport`).toBe(true)
}

async function assertInputDoesNotCoverStreakLabel(page: Page) {
  const streak = page.getByTestId('stat-streak')
  const input = page.getByTestId('input')
  const streakLabel = streak.locator('p').first()
  await expect(streakLabel).toHaveText(/streak/i)

  const inputBox = await input.boundingBox()
  const labelBox = await streakLabel.boundingBox()
  expect(inputBox).not.toBeNull()
  expect(labelBox).not.toBeNull()

  const overlapX =
    Math.min(inputBox!.x + inputBox!.width, labelBox!.x + labelBox!.width) -
    Math.max(inputBox!.x, labelBox!.x)
  const overlapY =
    Math.min(inputBox!.y + inputBox!.height, labelBox!.y + labelBox!.height) -
    Math.max(inputBox!.y, labelBox!.y)

  expect(
    overlapX <= 0 || overlapY <= 0,
    'input chip should not cover the STREAK label',
  ).toBe(true)
}

async function assertEquationDoesNotOverlapInput(page: Page) {
  const equation = page.getByTestId('equation')
  const input = page.getByTestId('input')

  const equationBox = await equation.boundingBox()
  const inputBox = await input.boundingBox()
  expect(equationBox, 'equation should have a bounding box').not.toBeNull()
  expect(inputBox, 'input chip should have a bounding box').not.toBeNull()

  const overlapX =
    Math.min(equationBox!.x + equationBox!.width, inputBox!.x + inputBox!.width) -
    Math.max(equationBox!.x, inputBox!.x)
  const overlapY =
    Math.min(equationBox!.y + equationBox!.height, inputBox!.y + inputBox!.height) -
    Math.max(equationBox!.y, inputBox!.y)

  const gap = inputBox!.y - (equationBox!.y + equationBox!.height)

  expect(
    overlapX <= 0 || overlapY <= 0,
    `equation and input chip must not overlap (overlapX=${overlapX}, overlapY=${overlapY}, gap=${gap})`,
  ).toBe(true)
  expect(gap, 'equation and input chip should have non-negative vertical gap').toBeGreaterThanOrEqual(0)
}

async function assertPlayLayoutFits(page: Page, vw: number, vh: number) {
  await page.setViewportSize({ width: vw, height: vh })
  await page.goto('./')

  await page.getByTestId('mula').click()
  await expect(page.getByTestId('soalan')).toBeVisible()

  const markah = page.getByTestId('stat-markah')
  const streak = page.getByTestId('stat-streak')
  const soalan = page.getByTestId('soalan')

  await expect(markah).toBeVisible()
  await expect(streak).toBeVisible()

  await assertFullyInViewport(markah, vw, vh, 'MARKAH')
  await assertFullyInViewport(streak, vw, vh, 'STREAK')
  await assertFullyInViewport(soalan, vw, vh, 'soalan')
  await assertInputDoesNotCoverStreakLabel(page)
  await assertEquationDoesNotOverlapInput(page)
}

test.describe('play layout fits short iPhone viewports', () => {
  for (const { name, width, height } of VIEWPORTS) {
    test(`MARKAH, STREAK, and soalan stay in viewport at ${name} after Mula`, async ({ page }) => {
      await assertPlayLayoutFits(page, width, height)
    })
  }
})
