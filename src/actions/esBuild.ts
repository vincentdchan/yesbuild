import { ActionExecutor, registerAction, ExecutionContext } from './common';
import {
	build as esbuild,
	BuildOptions as EsBuildOptions,
	Metafile as EsMetaFile,
} from 'esbuild';
import type { OutputLog } from '../logger';

export interface BuildOptions {
	entry: string,
	platform: string,
	outdir?: string,
	external?: string[],
}

export class EsbuildBundleExecutor extends ActionExecutor {

	public static actionName: string = 'esbuild'

	private __outputs: OutputLog[] = [];

	public constructor(private options: BuildOptions) {
		super();
	}

	public async execute(ctx: ExecutionContext) {
		const { entry, platform, external } = this.options;
		const { taskDir } = ctx;
		const esBuildOptions: EsBuildOptions = {
			entryPoints: [entry],
			bundle: true,
			format: 'esm',
			logLevel: 'error',
			splitting: true,
			outdir: taskDir,
			sourcemap: true,
			platform: platform as any,
			metafile: true,
			external,
			plugins: []
		};

		const result = await esbuild(esBuildOptions);
		const metafile = result.metafile!;
		this.buildGraphFromEsBuild(metafile);
	}

	buildGraphFromEsBuild(metafile: EsMetaFile) {
		const { outputs } = metafile;
		for (const key of Object.keys(outputs)) {
			const output = outputs[key];
			this.__outputs.push({
				file: key,
				size: output.bytes,
			});

			for (const dep of Object.keys(output.inputs)) {
				this.dependencyBuilder.dependFile(dep);
			}
		}
	}

	public getOutputs(): OutputLog[] {
		return this.__outputs;
	}

	public getParams(): BuildOptions {
		return this.options;
	}

}

registerAction(EsbuildBundleExecutor);
