
ESBUILD=./node_modules/.bin/esbuild

all: clean core client ts-plugin bootstrap
	echo "Done!"

core:
	$(ESBUILD) --bundle packages/yesbuild/src/index.ts --outfile=dist/index.js --platform=node --external:chokidar --external:esbuild --external:node-html-parser --sourcemap
	mkdir -p packages/yesbuild/dist
	cp dist/index.js packages/yesbuild/dist/index.js
	cp dist/index.js.map packages/yesbuild/dist/index.js.map

client: packages/yesbuild/client/index.ts
	$(ESBUILD) --bundle packages/yesbuild/client/index.ts --minify --outfile=dist/client.js --platform=browser --sourcemap=inline
	cp dist/client.js packages/yesbuild/dist/client.js

ts-plugin:
	$(ESBUILD) --bundle packages/yesbuild-typescript/index.ts --outfile=dist/yesbuild-typescript.js --platform=node --external:yesbuild --external:typescript --external:tsconfig --sourcemap
	mkdir -p packages/yesbuild-typescript/dist
	cp dist/yesbuild-typescript.js packages/yesbuild-typescript/dist/index.js
	cp dist/yesbuild-typescript.js.map packages/yesbuild-typescript/dist/index.js.map

bootstrap:
	node_modules/.bin/yesbuild

clean:
	rm -rf build
	rm -rf packages/yesbuild/dist
	rm -rf packages/yesbuild-typescript/dist
