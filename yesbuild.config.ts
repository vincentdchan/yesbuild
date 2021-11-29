import yesbuild, { uesEsBuild, useTypeScript, useParallel,
  useCopyFrom, useTask, useDevServer } from './dist';

yesbuild.defineTask('tsc', () => {
  return useTypeScript({
    rootNames: [
      'src/index.ts',
    ],
    compilerOptions: {
      'declaration': true,
      'emitDeclarationOnly': true,
    },
  });
});

yesbuild.defineTask('esbuild', () => uesEsBuild({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  sourcemap: true,
  external: ['typescript']
}));

yesbuild.defineTask('default', () => useParallel([
  'esbuild',
  'tsc',
]));

yesbuild.defineTask('serve', function*() {
  yield useCopyFrom('./package.json');
  const { outputs } = yield useTask('esbuild');
  return useDevServer({
    outputs,
  });
});
