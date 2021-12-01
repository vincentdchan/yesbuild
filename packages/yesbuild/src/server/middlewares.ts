import Koa from 'koa';
import send from 'koa-send';
import { resolve } from 'path';
import { isUndefined } from 'lodash-es';
import type { KoaContext, YesContext } from './index';

export function serveStatic(serveDir: string): Koa.Middleware<Koa.DefaultState, YesContext> {
  return async (ctx: KoaContext, next) => {
    await next();
    if (ctx.method !== 'HEAD' && ctx.method !== 'GET') return;
    // response is already handled
    if (ctx.body != null || ctx.status !== 404) return // eslint-disable-line

    if (ctx.request.path === '/') {
      await send(ctx, 'index.html', {
        root: resolve(serveDir),
      });
      return;
    }

    try {
      await send(ctx, ctx.path, {
        root: resolve(serveDir),
      });
    } catch (err) {
      const path = ctx.request.path;
      const fullPath = ctx.serverContext.tryGetProduct(path);
      if (isUndefined(fullPath)) {
        throw err
      }

      await send(ctx, fullPath);
    }
  }
}
