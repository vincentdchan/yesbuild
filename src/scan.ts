import {
	build as esbuild,
	BuildOptions as EsBuildOptions,
	Plugin as EsBuildPlugin,
	OnResolveArgs as EsBuildResolveArgs,
	Metafile as EsMetaFile,
} from 'esbuild';
import { TaskNode, makeTaskOutput } from './buildGraph';
import { makeFileDep } from './dependency';

function generateScanPlugin(entry: string, task: TaskNode): EsBuildPlugin {
	return {
		name: 'yesbuild:scan',
		setup: (build) => {
			build.onResolve({ filter: /.,*/ }, (args: EsBuildResolveArgs) => {
				// console.log(`data: ${JSON.stringify(args, null, 2)}`)
				return {};
			});
		},
	};
}

export async function scanProject(entry: string, outdir: string, platform: string, task: TaskNode) {
	const esBuildOptions: EsBuildOptions = {
		entryPoints: [entry],
		bundle: true,
		format: 'esm',
		logLevel: 'error',
		splitting: true,
		outdir,
		sourcemap: true,
		platform: platform as any,
		metafile: true,
		plugins: [
			generateScanPlugin(entry, task)
		]
	};

	const result = await esbuild(esBuildOptions);
	const metafile = result.metafile!;
	buildGraphFromEsBuild(metafile, task);
}

function buildGraphFromEsBuild(metafile: EsMetaFile, task: TaskNode) {
	const { outputs } = metafile;
	for (const key of Object.keys(outputs)) {
		const output = outputs[key];
		const taskOutput = makeTaskOutput();

		for (const dep of Object.keys(output.inputs)) {
			taskOutput.deps.push(makeFileDep(dep));
		}

		task.outputs[key] = taskOutput;
	}
}
