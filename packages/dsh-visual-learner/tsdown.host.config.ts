import { defineConfig } from 'tsdown'

const productionExternal = /^(?:node:|@deepseek-ai\/)/

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: true,
  sourcemap: true,
  clean: true,
  deps: {
    neverBundle: (specifier: string) => productionExternal.test(specifier),
    alwaysBundle: (specifier: string) => !productionExternal.test(specifier),
  },
})
