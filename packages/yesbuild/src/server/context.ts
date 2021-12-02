import { join, relative } from 'path';
import * as fs from 'fs';
import type { WebSocket } from 'ws';

export interface ProductsMapping {
  [key: string]: string,
}

// handle products mappings
export class ServerContext {

  private __clientPools: Set<WebSocket> = new Set();
  private __mappedDir: string[] = [];

  public constructor(
    public buildDir: string,
    mapTasks: string[],
  ) {
    this.__mappedDir = mapTasks.map(taskName => join(buildDir, taskName));
  }

  public tryGetProduct(name: string): string | undefined {
    if (name[0] === '/') {
      name = name.slice(1);
    }
    for (const dir of this.__mappedDir) {
      const testFile = join(dir, name);
      if (fs.existsSync(testFile)) {
        return relative(this.buildDir, testFile);
      }
    }
    return undefined;
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
