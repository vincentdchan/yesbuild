import * as path from 'path';

export interface OutputLog {
  file: string,
  size: number,
}

export type Outputs = OutputLog[];

export class OutputBuilder {

  #currentDir: string;
  #outputs: Outputs = [];

  constructor() {
    this.#currentDir = process.cwd();
  }

  public push(filename: string, size: number) {
    const file = path.relative(this.#currentDir, filename);
    this.#outputs.push({ file, size });
  }

  public finalize(): Outputs {
    return this.#outputs;
  }

}
