import * as fs from 'fs';

export class Profile {

	constructor(
		public readonly name: string,
		public readonly workDir: string) {

		fs.mkdirSync(this.workDir, { recursive: true });
		fs.mkdirSync(this.workDir, { recursive: true });
	}

}

export class DebugProfile extends Profile {

	constructor(workDir: string) {
		super('debug', workDir);
	}

}

export class ReleaseProfile extends Profile {

	constructor(workDir: string) {
		super('release', workDir);
	}

}
