import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { scanProject } from './scan';
import { ModuleGraph } from './moduleGraph';
import type { ConfigOptions } from './configProject';

export abstract class Profile {

	constructor(
		public readonly name: string,
		public readonly workDir: string) {

		fs.mkdirSync(this.workDir, { recursive: true });
		fs.mkdirSync(this.workDir, { recursive: true });
	}

	abstract doConfig(options: ConfigOptions): void;

}

function mkFilesDir(workDir: string): string {
	return path.join(workDir, 'files');
}

export class DebugProfile extends Profile {

	private __graph: ModuleGraph = new ModuleGraph();

	constructor(workDir: string) {
		super('debug', workDir);
	}

	async doConfig(options: ConfigOptions) {
		const { entry, platform } = options;
		const filesDir = mkFilesDir(this.workDir);
		await scanProject(entry, filesDir, platform, this.__graph);
		const depsFilePath = path.join(this.workDir, 'yesbuild.yml');
		await this.dumpGraphToYaml(options, depsFilePath);
	}

	private async dumpGraphToYaml(options: ConfigOptions, path: string): Promise<any> {
		const objs: any = {};

		objs["base"] = process.cwd();
		objs["options"] = options;
		objs["deps"] = this.__graph.toDepJson();

		const result = yaml.dump(objs);

		return fs.promises.writeFile(path, result);
	}

}

export class ReleaseProfile extends Profile {

	constructor(workDir: string) {
		super('release', workDir);
	}

	doConfig() {
		// @TODO(Vincent Chan) not implement
	}

}
