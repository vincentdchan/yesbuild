import yesbuild, { uesEsBuild, useTypeScript, useParallel } from './dist';

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
  uesEsBuild({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    sourcemap: true,
    external: ['typescript']
  });
});

yesbuild.registerTask('default', () => {
  useParallel([
    'esbuild',
    'tsc',
  ]);
});
