import * as path from 'path';

export interface OutputLog {
  file: string,
  size: number,
}

export type Outputs = OutputLog[];

export class OutputBuilder {

  private __currentDir: string;
  private __outputs: Outputs = [];

  constructor() {
    this.__currentDir = process.cwd();
  }

  public push(filename: string, size: number) {
    const file = path.relative(this.__currentDir, filename);
    this.__outputs.push({ file, size });
  }

  public finalize(): Outputs {
    return this.__outputs;
  }

}
