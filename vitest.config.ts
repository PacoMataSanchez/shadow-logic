import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
const at = (p: string): string => resolve(root, p)

export default defineConfig({
  resolve: {
    alias: {
      '@game/core': at('packages/core/src/index.ts'),
      '@game/shell': at('packages/shell/src/index.ts'),
      '@puzzle/kit': at('packages/puzzle-kit/src/index.ts'),
      '@puzzle/authoring': at('packages/authoring/src/index.ts'),
      '@game/shadow-logic': at('games/shadow-logic/src/index.ts'),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'games/**/*.test.ts', 'apps/**/*.test.ts'],
  },
})
