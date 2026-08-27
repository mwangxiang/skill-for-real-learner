import { defineConfig } from 'tsdown'

const PACKAGE_ID = '@mwangxiang/dsh-visual-learner'
const requestedExternal = (specifier: string): boolean =>
  specifier === 'react' || specifier.startsWith('react/') || specifier.startsWith('@deepseek-ai/')

export default defineConfig({
  entry: { client: 'src-v01/client/index.tsx' },
  outDir: 'lib',
  format: ['cjs'],
  platform: 'browser',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  sourcemap: true,
  clean: false,
  deps: {
    neverBundle: requestedExternal,
    alwaysBundle: (specifier: string) => !requestedExternal(specifier),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
