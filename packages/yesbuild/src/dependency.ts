import { isUndefined, isArray } from 'lodash-es';
import * as fs from 'fs';

const FILE_PREFIX = 'file://';

export type Dependencies = string[] | '*' | undefined;

function makeFileDep(path: string) {
  return FILE_PREFIX + path;
}

function makeTestDep(prefix: string): (literal: string) => string | null {
  return (literal: string) => {
    if (!literal.startsWith(prefix)) {
      return null;
    }
    return literal.slice(prefix.length);
  }
}

const TASK_PREFIX = 'task://';

function makeTaskDep(path: string) {
  return TASK_PREFIX + path;
}

export const testFileDep = makeTestDep(FILE_PREFIX);
export const testTaskDep = makeTestDep(TASK_PREFIX);

/**
 * Only check the lock files instead of checking the large node_modules.
 */
const ALLOW_LOCKS = [
  'yarn.lock',
  'pnpm-lock.yaml',
  'package-lock.json',
];

/**
 * Helper to collect and finalize the dependencies
 * 
 * For example, sort the string literal
 * to help comparation and merging.
 */
export class DependencyBuilder {

  #deps: Dependencies = undefined;
  #hasDepentLock: boolean = false;

  public constructor() {}

  public addDep(literal: string) {
    if (this.#deps === '*') {
      return;
    }
    if (literal === '*') {
      this.#deps = '*';
      return;
    }
    if (isUndefined(this.#deps)) {
      this.#deps = [];
    }
    this.#deps.push(literal);
  }

  public dependFile(path: string) {
    if (/^node_modules/.test(path) && this.#tryDependNpmLock()) {
      return;
    }
    this.addDep(makeFileDep(path));
  }

  #tryDependNpmLock(): boolean {
    if (this.#hasDepentLock) {
      return true;
    }

    for (const name of ALLOW_LOCKS) {
      if (fs.existsSync(name)) {
        this.addDep(makeFileDep(name));
        this.#hasDepentLock = true;
        return true;
      }
    }

    return false;
  }

  public dependTask(taskName: string) {
    this.addDep(makeTaskDep(taskName));
  }

  public finalize(): Dependencies {
    if (isArray(this.#deps)) {
      return this.#deps.sort();
    } else {
      return this.#deps;
    }
  }

}

export interface DependenciesChangedCell {
  changed: boolean;
}

function dependenciesArrayEquals(d1: string[], d2: string[]): boolean {
  if (d1.length !== d2.length) {
    return false;
  }

  for (let i = 0; i < d1.length; i++) {
    const str1 = d1[i];
    const str2 = d2[i];
    if (str1 !== str2) {
      return false;
    }
  }

  return true;
}

export const Deps = {

  /// check if dependencies is equal
  equals(d1: Dependencies, d2: Dependencies): boolean {
    if (d1 === d2) {
      return true;
    }

    if (isArray(d1) && isArray(d2)) {
      return dependenciesArrayEquals(d1, d2);
    }

    return false;
  }

}
