import { expect, test, type Locator } from '@playwright/test'

function isInViewport(box: { x: number; y: number; width: number; height: number }, vw: number, vh: number) {
  return box.x >= 0 && box.y >= 0 && box.x + box.width <= vw && box.y + box.height <= vh
}

async function assertFullyInViewport(locator: Locator, vw: number, vh: number) {
  const box = await locator.boundingBox()
  expect(box, 'element should have a bounding box').not.toBeNull()
  expect(isInViewport(box!, vw, vh), 'element should be fully in viewport').toBe(true)
}

test('MARKAH and STREAK stay in viewport on iPhone after Mula', async ({ page }) => {
  const vw = 390
  const vh = 844

  await page.setViewportSize({ width: vw, height: vh })
  await page.goto('./')

  await page.getByTestId('mula').click()
  await expect(page.getByTestId('soalan')).toBeVisible()

  const markah = page.getByTestId('stat-markah')
  const streak = page.getByTestId('stat-streak')
  const input = page.getByTestId('input')

  await expect(markah).toBeVisible()
  await expect(streak).toBeVisible()

  await assertFullyInViewport(markah, vw, vh)
  await assertFullyInViewport(streak, vw, vh)

  // Input chip may lightly overhang the stats row, but must not cover STREAK label text.
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
})
