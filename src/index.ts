(async () => {
  try {
    await import('mockjs');
  } catch (e) {
    throw new Error('vite-plugin-vue-mock requires mockjs to be present in the dependency tree.');
  }
})();

import type { ViteMockOptions } from './types';
import type { Plugin } from 'vite';

import path from 'path';
import { ResolvedConfig, normalizePath } from 'vite';
import { createMockServer, requestMiddleware } from './createMockServer';

export function viteMockServe(opt: ViteMockOptions): Plugin {
  const { supportTs = true } = opt;
  const defaultEnter = normalizePath(
    path.resolve(process.cwd(), `src/main.${supportTs ? 'ts' : 'js'}`)
  );
  const { injectFile = defaultEnter } = opt;

  let isDev = false;
  let config: ResolvedConfig;
  let needSourcemap = false;

  return {
    name: 'vite:mock',
    enforce: 'pre',
    configResolved(resolvedConfig) {
      config = resolvedConfig;
      isDev = config.command === 'serve';
      needSourcemap = !!resolvedConfig.build.sourcemap;
      isDev && createMockServer(opt);
    },

    configureServer: async ({ middlewares }) => {
      const { localEnabled = isDev } = opt;
      if (!localEnabled) {
        return;
      }
      const middleware = await requestMiddleware(opt);
      middlewares.use(middleware);
    },

    async transform(code: string, id: string) {
      if (isDev || !id.endsWith(injectFile)) {
        return null;
      }

      const { prodEnabled = true, injectCode = '' } = opt;
      if (!prodEnabled) {
        return null;
      }

      return {
        map: needSourcemap ? this.getCombinedSourcemap() : null,
        code: `${code}\n${injectCode}`,
      };
    },
  };
}

export * from './types';
