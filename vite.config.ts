import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))
const LOADER_ATTR = 'data-sifir-analytics-loader'

function analyticsLoaderPlugin(): Plugin {
  return {
    name: 'sifir-analytics-loader',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (html.includes(LOADER_ATTR)) return html
        const loader = execFileSync('python3', ['scripts/analytics_loader.py'], {
          cwd: root,
          encoding: 'utf-8',
        }).trim()
        if (!loader.includes(LOADER_ATTR)) {
          throw new Error('analytics loader did not emit data-sifir-analytics-loader')
        }
        return html.replace('</head>', `    ${loader}\n  </head>`)
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), analyticsLoaderPlugin()],
  base: '/sifir/',
})
