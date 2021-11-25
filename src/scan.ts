import {
	build as esbuild,
	BuildOptions as EsBuildOptions,
	Plugin as EsBuildPlugin,
	OnResolveArgs as EsBuildResolveArgs,
} from 'esbuild';

function generateScanPlugin(entry: string): EsBuildPlugin {
	return {
		name: 'yesbuild:scan',
		setup: (build) => {
			build.onResolve({ filter: /.,*/ }, (args: EsBuildResolveArgs) => {
				console.log(`data: ${JSON.stringify(args, null, 2)}`)
				return {};
			});
		},
	};
}

export async function scanProject(entry: string, platform: string) {
	const esBuildOptions: EsBuildOptions = {
		entryPoints: [entry],
		bundle: true,
		format: 'esm',
		logLevel: 'error',
		// splitting: true,
		sourcemap: true,
		platform: platform as any,
		plugins: [
			generateScanPlugin(entry)
		]
	};

	await esbuild(esBuildOptions);
}
