import { test, expect } from '@playwright/test'

const state = (page) => page.evaluate(() => window.__pong.state())

async function waitRally(page, timeout = 6000) {
  await page.waitForFunction(() => window.__pong.state().phase === 'rally', undefined, { timeout })
}

async function startMode(page, mode = 'classic') {
  await page.goto('/')
  if (mode !== 'classic') {
    await page.locator(`.opt`, { hasText: mode.toUpperCase() }).first().click()
  }
  await page.getByRole('button', { name: 'ИГРАТЬ' }).click()
}

test.describe('Pong (tvimogame)', () => {
  test('renders header, footer and start overlay', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/tvimogame/i)
    await expect(page.locator('.pong-brand')).toContainText('tvimogame')
    await expect(page.locator('.pong-footer')).toContainText('tvimogame')
    await expect(page.locator('.pong-nav-text')).toHaveText('Pong')
    await expect(page.locator('.overlay--menu .overlay-title')).toHaveText('PONG')
    await expect(page.locator('.field')).toBeVisible()
    await expect(page.locator('.paddle').first()).toBeVisible()
  })

  test('mode selection highlights and starts a match', async ({ page }) => {
    await page.goto('/')
    const blitz = page.locator('.opt', { hasText: 'BLITZ' }).first()
    await blitz.click()
    await expect(blitz).toHaveClass(/opt--active/)

    await page.getByRole('button', { name: 'ИГРАТЬ' }).click()
    const s = await state(page)
    expect(s.mode).toBe('blitz')
    expect(['serving', 'rally']).toContain(s.phase)
  })

  test('W moves paddle up, S moves paddle down, arrows work', async ({ page }) => {
    await startMode(page)
    await waitRally(page)

    const before = (await state(page)).playerY
    await page.keyboard.down('w')
    await page.waitForTimeout(250)
    await page.keyboard.up('w')
    const afterW = (await state(page)).playerY
    expect(afterW).toBeLessThan(before)

    const beforeS = (await state(page)).playerY
    await page.keyboard.down('s')
    await page.waitForTimeout(250)
    await page.keyboard.up('s')
    const afterS = (await state(page)).playerY
    expect(afterS).toBeGreaterThan(beforeS)

    // arrow keys
    const b1 = (await state(page)).playerY
    await page.keyboard.down('ArrowUp')
    await page.waitForTimeout(200)
    await page.keyboard.up('ArrowUp')
    const b2 = (await state(page)).playerY
    expect(b2).toBeLessThan(b1)
  })

  test('paddle stays within field bounds', async ({ page }) => {
    await startMode(page)
    await waitRally(page)
    await page.keyboard.down('w')
    await page.waitForTimeout(800)
    await page.keyboard.up('w')
    const top = (await state(page)).playerY
    expect(top).toBeGreaterThanOrEqual(44)

    await page.keyboard.down('s')
    await page.waitForTimeout(800)
    await page.keyboard.up('s')
    const bottom = (await state(page)).playerY
    expect(bottom).toBeLessThanOrEqual(456)
  })

  test('ball moves after start', async ({ page }) => {
    await startMode(page)
    await waitRally(page)
    const a = (await state(page)).balls[0]
    const p1 = { x: a.x, y: a.y }
    await page.waitForTimeout(250)
    const b = (await state(page)).balls[0]
    const moved = Math.hypot(b.x - p1.x, b.y - p1.y)
    expect(moved).toBeGreaterThan(5)
  })

  test('ball bounces off top wall', async ({ page }) => {
    await startMode(page)
    await waitRally(page)
    await page.evaluate(() => window.__pong.debug.setBall({ x: 400, y: 30, vx: 0, vy: -320 }))
    await page.waitForFunction(() => window.__pong.state().balls[0].vy > 0, undefined, { timeout: 5000 })
    const b = (await state(page)).balls[0]
    expect(b.y).toBeGreaterThan(0)
    expect(b.y).toBeLessThan(500)
  })

  test('ball bounces off bottom wall', async ({ page }) => {
    await startMode(page)
    await waitRally(page)
    await page.evaluate(() => window.__pong.debug.setBall({ x: 400, y: 470, vx: 0, vy: 320 }))
    await page.waitForFunction(() => window.__pong.state().balls[0].vy < 0, undefined, { timeout: 5000 })
    const b = (await state(page)).balls[0]
    expect(b.y).toBeGreaterThan(0)
    expect(b.y).toBeLessThan(500)
  })

  test('paddle collision changes ball direction', async ({ page }) => {
    await startMode(page)
    await waitRally(page)
    await page.evaluate(() => {
      window.__pong.debug.setPlayerY(250)
      window.__pong.debug.setBall({ x: 70, y: 250, vx: -320, vy: 0 })
    })
    await page.waitForFunction(() => window.__pong.state().balls[0].vx > 0, undefined, { timeout: 5000 })
    const b = (await state(page)).balls[0]
    expect(b.x).toBeGreaterThan(40)
  })

  test('ball out left scores for AI; out right scores for player', async ({ page }) => {
    await startMode(page)
    await waitRally(page)
    await page.evaluate(() => window.__pong.debug.setScores(0, 0))

    await page.evaluate(() => window.__pong.debug.setBall({ x: -50, y: 250, vx: -320, vy: 0 }))
    await page.waitForFunction(() => window.__pong.state().aiScore === 1, undefined, { timeout: 5000 })

    await page.waitForFunction(() => window.__pong.state().phase === 'rally', undefined, { timeout: 6000 })
    await page.evaluate(() => window.__pong.debug.setBall({ x: 850, y: 250, vx: 320, vy: 0 }))
    await page.waitForFunction(() => window.__pong.state().playerScore === 1, undefined, { timeout: 5000 })
  })

  test('ball returns to center after a goal', async ({ page }) => {
    await startMode(page)
    await waitRally(page)
    await page.evaluate(() => window.__pong.debug.setBall({ x: 850, y: 250, vx: 320, vy: 0 }))
    await page.waitForFunction(() => window.__pong.state().phase === 'serving', undefined, { timeout: 6000 })
    const b = (await state(page)).balls[0]
    expect(b.x).toBeGreaterThan(380)
    expect(b.x).toBeLessThan(420)
    expect(b.y).toBeGreaterThan(230)
    expect(b.y).toBeLessThan(270)
  })

  test('Space pauses and resumes the game', async ({ page }) => {
    await startMode(page)
    await waitRally(page)
    await page.keyboard.press(' ')
    await page.waitForFunction(() => window.__pong.state().phase === 'paused', undefined, { timeout: 3000 })
    const p1 = (await state(page)).balls[0]
    await page.waitForTimeout(300)
    const p2 = (await state(page)).balls[0]
    expect(Math.hypot(p2.x - p1.x, p2.y - p1.y)).toBeLessThan(1)

    await page.keyboard.press(' ')
    await page.waitForFunction(
      () => window.__pong.state().phase !== 'paused',
      undefined,
      { timeout: 3000 },
    )
  })

  test('reaching 10 points shows victory overlay', async ({ page }) => {
    await startMode(page)
    await waitRally(page)
    await page.evaluate(() => window.__pong.debug.setScores(9, 0))
    await page.evaluate(() => window.__pong.debug.setBall({ x: 850, y: 250, vx: 320, vy: 0 }))
    await page.waitForFunction(() => window.__pong.state().phase === 'over', undefined, { timeout: 6000 })
    const s = await state(page)
    expect(s.result).toBe('win')
    await expect(page.locator('.overlay-title--win')).toHaveText('ПОБЕДА')
  })

  test('AI reaching 10 points shows defeat overlay', async ({ page }) => {
    await startMode(page)
    await waitRally(page)
    await page.evaluate(() => window.__pong.debug.setScores(0, 9))
    await page.evaluate(() => window.__pong.debug.setBall({ x: -50, y: 250, vx: -320, vy: 0 }))
    await page.waitForFunction(() => window.__pong.state().phase === 'over', undefined, { timeout: 6000 })
    const s = await state(page)
    expect(s.result).toBe('lose')
    await expect(page.locator('.overlay-title--lose')).toHaveText('ПОРАЖЕНИЕ')
  })

  test('bonus activates effect on ball contact and then expires', async ({ page }) => {
    await startMode(page)
    await waitRally(page)
    await page.evaluate(() => {
      window.__pong.debug.setLastHitter('player')
      window.__pong.debug.spawnBonus('big', 400, 250)
      window.__pong.debug.setBall({ x: 385, y: 250, vx: 320, vy: 0 })
    })
    await page.waitForFunction(
      () => window.__pong.state().playerBigUntil > window.__pong.state().t,
      undefined,
      { timeout: 5000 },
    )
    const h = await page.evaluate(() => window.__pong.state().playerBigUntil > window.__pong.state().t)
    expect(h).toBe(true)
    // force expiry and confirm effect ends
    await page.evaluate(() => {
      const g = window.__pong.state()
      g.playerBigUntil = g.t - 1
    })
    await page.waitForFunction(
      () => window.__pong.state().playerBigUntil <= window.__pong.state().t,
      undefined,
      { timeout: 3000 },
    )
  })

  test('record persists in localStorage and survives reload', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.getByRole('button', { name: 'ИГРАТЬ' }).click()
    await page.waitForFunction(() => window.__pong.state().phase === 'rally', undefined, { timeout: 6000 })
    await page.evaluate(() => window.__pong.debug.setScores(9, 0))
    await page.evaluate(() => window.__pong.debug.setBall({ x: 850, y: 250, vx: 320, vy: 0 }))
    await page.waitForFunction(() => window.__pong.state().phase === 'over', undefined, { timeout: 6000 })

    const rec = await page.evaluate(() => localStorage.getItem('pong_classic_best'))
    expect(rec).not.toBeNull()

    await page.reload()
    await page.waitForFunction(() => !!window.__pong, undefined, { timeout: 6000 })
    const rec2 = await page.evaluate(() => localStorage.getItem('pong_classic_best'))
    expect(rec2).toBe(rec)
    await expect(page.locator('.panel .stat-value--accent').first()).toContainText(/missed|—|\d/)
  })
})
