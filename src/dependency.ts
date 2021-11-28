import { isUndefined, isArray } from 'lodash-es';

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
 * Helper to collect and finalize the dependencies
 * 
 * For example, sort the string literal
 * to help comparation and merging.
 */
export class DependencyBuilder {

  private __deps: Dependencies = undefined;

  public constructor() {}

  public addDep(literal: string) {
    if (this.__deps === '*') {
      return;
    }
    if (literal === '*') {
      this.__deps = '*';
      return;
    }
    if (isUndefined(this.__deps)) {
      this.__deps = [];
    }
    this.__deps.push(literal);
  }

  public dependFile(path: string) {
    this.addDep(makeFileDep(path));
  }

  public dependTask(taskName: string) {
    this.addDep(makeTaskDep(taskName));
  }

  public finalize(): Dependencies {
    if (isArray(this.__deps)) {
      return this.__deps.sort();
    } else {
      return this.__deps;
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
