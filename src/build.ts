import { join } from 'path';
import yaml from 'js-yaml';
import * as fs from 'fs';

export interface BuildOptions {
	buildDir: string,
}

export async function build(options: BuildOptions) {
	const { buildDir } = options;
	const ymlPath = join(buildDir, 'yesbuild.yml');
	if (!fs.existsSync(ymlPath)) {
		throw new Error(`ysebuild.yml not found in ${ymlPath}`);
	}

	const content = await fs.promises.readFile(ymlPath, 'utf-8');
	const objs = yaml.load(content);
	console.log(JSON.stringify(objs, null, 2));
}
