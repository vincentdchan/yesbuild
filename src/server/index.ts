import Koa from 'koa';
import { serveStatic } from './middlewares';
import { ServerContext } from './context';

export interface InternalServerOptions {
  host: string,
  port: number,
  mapOutputs: string[],
}

export interface YesContext extends Koa.DefaultContext {
  serverContext: ServerContext;
}

export function startServer(staticDir: string, options: InternalServerOptions) {
  const serverContext = new ServerContext();
  const app = new Koa<Koa.DefaultState, YesContext>();
  app.use((ctx, next) => {
    ctx.serverContext = serverContext;
    return next();
  });
  app.use(serveStatic(staticDir));
  const { port } = options;
  app.listen(port);
}
