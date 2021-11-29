import yesbuild, { uesEsBuild, useTypeScript, useParallel,
  useCopyFrom, useTask, useDevServer } from './dist';

yesbuild.registerTask('tsc', () => {
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

yesbuild.registerTask('esbuild', () => uesEsBuild({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  sourcemap: true,
  external: ['typescript']
}));

yesbuild.registerTask('default', () => useParallel([
  'esbuild',
  'tsc',
]));

yesbuild.registerTask('serve', function*() {
  yield useCopyFrom('./package.json');
  const { outputs } = yield useTask('esbuild');
  return useDevServer({
    outputs,
  });
});
