import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      "rxjs",
      "@univerjs/presets",
      "@univerjs/preset-sheets-core",
      "@univerjs/preset-sheets-filter",
      "@univerjs/preset-sheets-data-validation",
      "@univerjs/preset-sheets-find-replace",
      "@univerjs/preset-sheets-hyper-link",
      "@univerjs/preset-sheets-conditional-formatting",
      "@univerjs/preset-sheets-note",
    ],
  },
  test: { testTimeout: 60000 },
})
