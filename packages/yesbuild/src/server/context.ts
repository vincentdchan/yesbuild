import type { WebSocket } from 'ws';

export interface ProductsMapping {
  [key: string]: string,
}

// handle products mappings
export class ServerContext {

  private __clientPools: Set<WebSocket> = new Set();

  public constructor(
    private productsMapping: ProductsMapping,
  ) {}

  public tryGetProduct(name: string) {
    return this.productsMapping[name];
  }

  public addClient(ws: WebSocket) {
    this.__clientPools.add(ws);

    ws.on('close', () => {
      this.__clientPools.delete(ws);
    });
  }

  public notifyAllClientsToUpdate() {
    const msg = JSON.stringify({
      type: 'YESBUILD_FORCE_REFRESH',
    });
    for (const client of this.__clientPools) {
      client.send(msg);
    }
  }

}
