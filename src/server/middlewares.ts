import Koa from 'koa';
import send from 'koa-send';
import { resolve } from 'path';

export function serveStatic(serveDir: string): Koa.Middleware {
	return async (ctx, next) => {
		await next();
		if (ctx.method !== 'HEAD' && ctx.method !== 'GET') return;
		// response is already handled
    if (ctx.body != null || ctx.status !== 404) return // eslint-disable-line

		try {
      await send(ctx, ctx.path, {
				root: resolve(serveDir),
			});
    } catch (err) {
      if (err.status !== 404) {
        throw err
      }
    }
	}
}
