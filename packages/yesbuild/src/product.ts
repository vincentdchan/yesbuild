import * as path from 'path';

export interface ProductWithSize {
  file: string,
  size: number,
}

export type ProductsWithSize = ProductWithSize[];

export class ProductBuilder {

  #currentDir: string;
  #outputs: ProductsWithSize = [];

  constructor() {
    this.#currentDir = process.cwd();
  }

  public push(filename: string, size: number) {
    const file = path.relative(this.#currentDir, filename);
    this.#outputs.push({ file, size });
  }

  public finalize(): ProductsWithSize {
    return this.#outputs;
  }

}
