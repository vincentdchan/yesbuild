
export interface ProductsMapping {
  [key: string]: string,
}


// handle products mappings
export class ServerContext {

  public constructor(private productsMapping: ProductsMapping) {
  }

  public tryGetProduct(name: string) {
    return this.productsMapping[name];
  }

}
