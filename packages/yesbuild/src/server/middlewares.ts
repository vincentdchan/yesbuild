import Koa from 'koa';
import koaSend, { SendOptions } from 'koa-send';
import * as fs from 'fs';
import { resolve } from 'path';
import { isUndefined } from 'lodash-es';
import { injectHTML } from './inject';
import type { KoaContext, YesContext } from './index';

async function tryInjectHTML(ctx: KoaContext, path: string, options?: SendOptions): Promise<boolean> {
  try {
    const root = options.root || process.cwd();
    path = resolve(root, path);
    let content = await fs.promises.readFile(path, 'utf8');
    content = await injectHTML(content);
    ctx.status = 200;
    ctx.set('Content-Type', 'text/html')
    ctx.body = content;
    return true;
  } catch (err) {
    // parse error or read error
    return false;
  }
}

async function send(ctx: KoaContext, path: string, options?: SendOptions) {
  if (path.endsWith('.html')) {
    if (await tryInjectHTML(ctx, path, options)) {
      return;
    }
  }
  await koaSend(ctx, path, options);
}

const CLIENT_SCRIPT_URL = '/__yesbuild_inject.js';

async function serveClientScript(ctx: KoaContext) {
  ctx.set('Content-Type', 'application/javascript; charset=utf-8');
  const clientPath = 'client.js';
  await koaSend(ctx, clientPath, {
    root: __dirname,
  });
}

export function serveStatic(serveDir: string): Koa.Middleware<Koa.DefaultState, YesContext> {
  return async (ctx: KoaContext, next) => {
    await next();
    if (ctx.method !== 'HEAD' && ctx.method !== 'GET') return;
    // response is already handled
    if (ctx.body != null || ctx.status !== 404) return // eslint-disable-line

    let resolvedPath = ctx.request.path;

    if (resolvedPath === '/') {
      resolvedPath = 'index.html';
    }

    if (resolvedPath === CLIENT_SCRIPT_URL) {
      await serveClientScript(ctx);
      return;
    }

    try {
      await send(ctx, resolvedPath, {
        root: resolve(serveDir),
      });
    } catch (err) {
      const fullPath = ctx.serverContext.tryGetProduct(resolvedPath);
      if (isUndefined(fullPath)) {
        throw err
      }

      await send(ctx, fullPath, {
        root: ctx.serverContext.buildDir,
      });
    }
  }
}
