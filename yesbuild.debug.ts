import yesbuild, { useBuild } from './dist';

yesbuild.registerTask('tsc', () => {

});

yesbuild.registerTask('default', () => {
  useBuild({
    entry: 'src/index.ts',
  });
});
