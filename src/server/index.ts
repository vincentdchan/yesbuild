import Koa from 'koa';

export interface InternalServerOptions {
  host: string,
  port: number,
  mapOutputs: string[],
}

export function startServer(options: InternalServerOptions) {
  const app = new Koa();
  const { port } = options;
  app.listen(port);
}
