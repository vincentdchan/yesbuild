
# Yesbuild

A scable and extensible build system for the Web ecosystem.

## Features

- Automatically dependencies tracing
- Fast and incremental build
- Parallel
- Simple syntaxes to config
- Easy to composite
- Easy to know what happended
- Full typed plugin API
- Easy to integrate with other bunders

## Why

Currently, most the bundles hide the details internally.
When the project become large, the dependencies become complex.
There is no way to understand how to optimize the procedure.

Besides, It's hard for bundler to build incrementally.
A lot of `cache-loader` is used to implement this,
but it's not very friendly. The users have no idea what
files have been cached.

Yesbuild is a friendly tool for you to build your own build system.
It makes your building procedure more reasonable, more easy to
compositing things.

## Install

### Globally

```sh
npm install -g yesbuild
```

### Scoped

```sh
yarn install yesbuild
```

or

```sh
pnpm i yesbuild
```
