
ESBUILD=./node_modules/.bin/esbuild

all: core ts-plugin bootstrap
	echo "Done!"

core:
	$(ESBUILD) --bundle packages/yesbuild/src/index.ts --outfile=dist/index.js --platform=node --external:chokidar --external:esbuild --external:typescript --external:glob --sourcemap
	rm -rf packages/yesbuild/dist
	mkdir -p packages/yesbuild/dist
	cp dist/index.js packages/yesbuild/dist/index.js
	cp dist/index.js.map packages/yesbuild/dist/index.js.map

ts-plugin:
	$(ESBUILD) --bundle packages/yesbuild-typescript/index.ts --outfile=dist/yesbuild-typescript.js --platform=node --external:yesbuild --external:typescript --external:tsconfig --sourcemap
	rm -rf packages/yesbuild-typescript/dist
	mkdir -p packages/yesbuild-typescript/dist
	cp dist/yesbuild-typescript.js packages/yesbuild-typescript/dist/index.js
	cp dist/yesbuild-typescript.js.map packages/yesbuild-typescript/dist/index.js.map

bootstrap:
	node_modules/.bin/yesbuild config
