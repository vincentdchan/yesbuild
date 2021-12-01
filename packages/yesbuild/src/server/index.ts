import Koa from 'koa';
import { grey } from 'chalk';
import { isArray } from 'lodash-es';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { serveStatic } from './middlewares';
import { ServerContext } from './context';
import { watch } from '../watch';

export interface ProductsMapping {
  [key: string]: string,
}

export interface InternalServerOptions {
  host: string,
  port: number,
  buildDir: string,
  productsMapping?: ProductsMapping,
  watchTasks?: string[],
}

export interface YesContext extends Koa.DefaultContext {
  serverContext: ServerContext;
}

export type KoaContext = Koa.ParameterizedContext<Koa.DefaultState, YesContext>;

export function startServer(staticDir: string, options: InternalServerOptions) {
  const serverContext = new ServerContext(options.productsMapping || Object.create(null));
  const app = new Koa<Koa.DefaultState, YesContext>();
  app.use((ctx, next) => {
    ctx.serverContext = serverContext;
    return next();
  });
  app.use(serveStatic(staticDir));

  if (isArray(options.watchTasks)) {
    watch({
      buildDir: options.buildDir,
      taskNames: options.watchTasks,
    })
  }

  const { host, port } = options;
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', function connection(ws) {
    console.log('received connection');
  });

  const httpServer = createServer(app.callback());
  httpServer.on('upgrade', function(request, socket, head) {
    const { pathname } = new URL(request.url);

    if (pathname === '/__yesbuild_ws') {
      wss.handleUpgrade(request, socket as any, head, function done(ws) {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  console.log(`Listening on ${grey('http://' + host + ':' + port)}`)

  httpServer.listen(port);
}
