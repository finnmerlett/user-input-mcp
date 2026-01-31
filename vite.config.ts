import { defineConfig } from 'vite'
import { resolve } from 'path'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * Vite config for building MCP Apps UI components.
 * Bundles HTML + TypeScript into single-file HTML outputs.
 * 
 * Due to viteSingleFile limitations, we build a single entry point.
 * Use BUILD_ENTRY env var to select which HTML to build.
 * Default: input-form
 */
const entry = process.env.BUILD_ENTRY || 'input-form'

export default defineConfig({
  root: 'src/ui',
  base: './',
  plugins: [viteSingleFile()],
  build: {
    outDir: '../../build/ui',
    emptyOutDir: false, // Don't empty since we build multiple times
    target: 'esnext',
    rollupOptions: {
      input: resolve(__dirname, `src/ui/${entry}.html`),
    },
  },
})
