import yesbuild, { useBuild, useTypeScript, useParallel } from './dist';

yesbuild.registerTask('tsc', () => {
  useTypeScript({
    rootNames: [
      'src/index.ts',
    ],
    compilerOptions: {
      'declaration': true,
      'emitDeclarationOnly': true,
    },
  });
});

yesbuild.registerTask('esbuild', () => {
  useBuild({
    entry: 'src/index.ts',
    platform: 'node',
    external: ['typescript']
  });
});

yesbuild.registerTask('default', () => {
  useParallel([
    'esbuild',
    'tsc',
  ]);
});
