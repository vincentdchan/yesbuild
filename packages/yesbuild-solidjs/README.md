
# SolidJS Plugin for Yesbuild

[![npm version](https://img.shields.io/npm/v/yesbuild-solidjs.svg)](https://www.npmjs.com/package/yesbuild-solidjs)


[Example](https://github.com/vincentdchan/yesbuild-solidjs-example)


## Install

```
pnpm add -D yesbuild-solidjs
```

## Usage

```typescript
yesbuild.defineTask('solidjs', function* () {
  yield useSolidJS({
    files: './src/**/*',
    relative: './src',
  });
});
```
