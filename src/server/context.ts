import * as path from 'path';

// handle products mappings
export class ServerContext {

	#mappings: Map<string, string> = new Map();

	public constructor(mapOutputs: string[]) {
		for (const outputPath of mapOutputs) {
			const basename = path.basename(outputPath);
			this.#mappings.set(basename, outputPath);
		}
	}

	public tryGetProduct(name: string) {
		return this.#mappings.get(name);
	}

}
