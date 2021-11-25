import yesbuild, { useBuild, useTypeScript } from './dist';

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
