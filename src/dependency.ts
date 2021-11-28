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

/// This function is assuming d1 and d2 are normalized.
///
/// Merging rules is based on pattern matching:
///
/// undefined, d2        => d2
/// d1       , undefined => d1
/// '*'      , d2        => '*'
/// d1       , '*' .     => '*'
/// string[] , string[]  => mergeLiteral(d1, d2)
export function mergeDependencies(d1: Dependencies, d2: Dependencies, changedCell?: DependenciesChangedCell): Dependencies {
  if (isUndefined(d1)) {
    if (changedCell && !isUndefined(d2)) {
      changedCell.changed = true;
    }
    return d2;
  }
  if (isUndefined(d2)) {
    if (changedCell) {
      changedCell.changed = true;
    }
    return d1;
  }
  if (d1 === '*' || d2 === '*') {
    if (changedCell && d1 !== d2) {
      changedCell.changed = true;
    }
    return '*';
  }

  if (isArray(d1) && isArray(d2)) {
    return mergeDependenciesArray(d1, d2, changedCell);
  }

  throw new Error(`Unexpected dependencies: ${d1} and ${d2}`);
}

/// This function is assuming d1 and d2 are sorted.
function mergeDependenciesArray(d1: string[], d2: string[], changedCell?: DependenciesChangedCell): string[] {
  const result: string[] = [];
  let mayChanged: boolean = false;

  for (let i = 0, j = 0; i < d1.length || j < d2.length;) {
    const str1 = d1[i];
    const str2 = d2[j];

    if (isUndefined(str1)) {
      result.push(str2);
      j++;
      mayChanged = true;
    } else if (isUndefined(str2)) {
      result.push(str1);
      i++;
      mayChanged = true;
    } else if (str1 === str2) {
      result.push(str1);
      i++;
      j++;
    } else if (str1 < str2) {
      result.push(str1);
      i++
      mayChanged = true;
    } else {  // str1 > str2
      result.push(str2);
      j++;
      mayChanged = true;
    }
  }

  if (mayChanged && changedCell) {
    changedCell.changed = true;
  }

  return result;
}
