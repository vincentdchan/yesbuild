import yesbuild, { useBuild, useTypeScript, useParallel } from './dist';

yesbuild.registerTask('tsc', () => {
  useTypeScript({});
});

yesbuild.registerTask('default', () => {
  useBuild({
    entry: 'src/index.ts',
    platform: 'node',
    external: ['typescript']
  });
});

yesbuild.registerTask('parallel', () => {
  useParallel([
    'default',
    'tsc',
  ]);
});
