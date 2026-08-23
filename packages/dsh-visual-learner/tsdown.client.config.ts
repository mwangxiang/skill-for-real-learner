import { defineConfig } from 'tsdown'

const PACKAGE_ID = '@mwangxiang/dsh-visual-learner'

export default defineConfig({
  entry: { client: 'src/client/index.tsx' },
  outDir: 'lib',
  format: ['cjs'],
  platform: 'browser',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  sourcemap: true,
  clean: false,
  deps: {
    neverBundle: (specifier: string) => !specifier.startsWith('.') && !specifier.startsWith('\0'),
    alwaysBundle: (specifier: string) => specifier.startsWith('.'),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
