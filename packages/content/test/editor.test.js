const path = require('path')
const { createBrowser } = require('tib')
const { setup, loadConfig, url } = require('@nuxtjs/module-test-utils')

describe('editor option', () => {
  let nuxt, browser, page

  describe('alias works', () => {
    test('local alias', async () => {
      ({ nuxt } = (await setup({
        ...loadConfig(__dirname),
        buildDir: path.join(__dirname, 'fixture', '.nuxt-dev'),
        content: { watch: true, editor: '~/.nuxt-dev/content/editor.vue' }
      })))

      browser = await createBrowser('puppeteer')
      page = await browser.page(url('/home'))
      const html = await page.getHtml()

      expect(html).toContain('v-md-editor')

      await nuxt.close()
      await browser.close()
    }, 60000)

    test('module resolution', async () => {
      ({ nuxt } = (await setup({
        ...loadConfig(__dirname),
        buildDir: path.join(__dirname, 'fixture', '.nuxt-dev'),
        content: { watch: true, editor: '@nuxt/content/templates/editor.vue' }
      })))

      browser = await createBrowser('puppeteer')
      page = await browser.page(url('/home'))
      const html = await page.getHtml()

      expect(html).toContain('v-md-editor')

      await nuxt.close()
      await browser.close()
    }, 60000)
  })

  describe('replacing works', () => {
    test('replacing', async () => {
      ({ nuxt } = (await setup({
        ...loadConfig(__dirname),
        buildDir: path.join(__dirname, 'fixture', '.nuxt-dev'),
        content: { watch: true, editor: '~/components/editor.vue' }
      })))

      browser = await createBrowser('puppeteer')
      page = await browser.page(url('/home'))

      // Double click
      const selector = '.nuxt-content'
      const rect = await page.evaluate((selector) => {
        const element = document.querySelector(selector)
        if (!element) {
          return null
        }
        const { x, y } = element.getBoundingClientRect()
        return { x, y }
      }, selector)
      await page.mouse.click(rect.x, rect.y, { clickCount: 2, delay: 100 })

      await page.waitForSelector('.editor')

      await expect(page.getHtml()).resolves.toMatch(/<div.*class="editor.*><\/div>/s)
      await expect(page.getHtml()).resolves.not.toContain('v-md-editor')

      await nuxt.close()
      await browser.close()
    }, 60000)
  })
})

describe('editor works', () => {
  test('startup', async () => {
    const { nuxt } = await setup({
      ...loadConfig(__dirname),
      buildDir: path.join(__dirname, 'fixture', '.nuxt-dev'),
      content: { watch: true }
    })

    const browser = await createBrowser('puppeteer')
    const page = await browser.page(url('/home'))

    // Double click
    const selector = '.nuxt-content'
    const rect = await page.evaluate((selector) => {
      const element = document.querySelector(selector)
      if (!element) {
        return null
      }
      const { x, y } = element.getBoundingClientRect()
      return { x, y }
    }, selector)
    await page.mouse.click(rect.x, rect.y, { clickCount: 2, delay: 100 })

    await page.waitForSelector('.v-md-editor')

    const editorHtml = await page.getElementHtml('.v-md-editor')

    expect(editorHtml).toContain('This is the home page!')

    await nuxt.close()
    await browser.close()
  }, 60000)
})
