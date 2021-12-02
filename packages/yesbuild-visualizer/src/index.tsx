import ForceGraph from 'force-graph';
import { isArray } from 'lodash-es';

const nodes = [];
const links = [];

const ROOT_VAL = 30;

function putNode(id, group, name, val) {
  nodes.push({ id, group, name, val });
}

function putLink(from: string, to: string) {
  links.push({
    source: from,
    target: to,
  });
}

function showGraph() {
  const element = document.getElementById('app');
  const graph = ForceGraph();
  graph(element)
    .nodeAutoColorBy('group')
    .graphData({ nodes, links });
}

function removeElement(element: HTMLElement) {
  element.parentElement.removeChild(element);
}

function readFileAsContent(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('error', (err) => reject(err));
    reader.addEventListener('load', () => {
      resolve(reader.result as string);
    });

    reader.readAsText(file, 'utf-8');
  });
}

interface NameTuple {
  name: string,
  content: string,
}

function main() {
  const dropZone = document.getElementById('drop_zone');

  async function readFileTuple(file: File): Promise<NameTuple> {
    const content = await readFileAsContent(file);
    return {
      name: file.name,
      content,
    };
  }

  async function handleFiles(files: File[]) {
    const nameTuplesPromises: Promise<NameTuple>[] = [];

    for (const file of files) {
      nameTuplesPromises.push(readFileTuple(file));
    }

    const nameTuples = await Promise.all(nameTuplesPromises);

    await handleNameTuples(nameTuples);
  }

  async function handleNameTuples(tuples: NameTuple[]) {
    try {
      const jsYaml = await import('js-yaml');

      for (const { name, content } of tuples) {
        const depObjs = jsYaml.load(content);
        console.log(depObjs);
        const id = 'yml:' + name;
        putNode(id, 'file', name, ROOT_VAL);
        handleYmlFile(id, depObjs, 1);
      }

      removeElement(dropZone);
      showGraph();
    } catch (err) {
      console.error(err);
    }
  }

  function handleYmlFile(ymlId: string, objs: any, depth: number) {
    if (isArray(objs.deps)) {
      for (const dep of objs.deps) {
        appDepToId(ymlId, dep, depth);
      }
    }

    if (isArray(objs.tasks)) {
      for (const task of objs.tasks) {
        const id = 'task:' + task.name;
        putNode(id, 'task', task.name, ROOT_VAL - depth * 5);
        putLink(id, ymlId);
        if (isArray(task.deps)) {
          for (const dep of task.deps) {
            appDepToId(id, dep, depth - 1);
          }
        } else if (task.deps === '*') {
          appDepToId(id, task.deps, depth - 1);
        }
      }
    }
  }

  const createdFile = new Set<string>();
  function appDepToId(parentId: string, dep: string, depth: number) {
    if (dep.startsWith('file://')) {
      const fileName = dep.slice('file://'.length);
      const id = 'file:' + fileName;
      if (createdFile.has(fileName)) {
        putLink(id, parentId);
      } else {
        putNode(id, 'file', fileName, 5);
        putLink(id, parentId);
      }
    } else if (dep.startsWith('task://')) {
      const toTaskName = dep.slice('task://'.length);
      putLink('task:' + toTaskName, parentId);
    } else {
      putNode(dep, 'dep', dep, 5)
      putLink(dep, parentId);
    }
  }

  dropZone.addEventListener('drop', (ev) => {
    ev.preventDefault();

    const files: File[] = [];
    if (ev.dataTransfer.items) {
      // Use DataTransferItemList interface to access the file(s)
      for (let i = 0; i < ev.dataTransfer.items.length; i++) {
        // If dropped items aren't files, reject them
        if (ev.dataTransfer.items[i].kind === 'file') {
          const file = ev.dataTransfer.items[i].getAsFile();
          files.push(file);
        }
      }
    } else {
      // Use DataTransfer interface to access the file(s)
      for (let i = 0; i < ev.dataTransfer.files.length; i++) {
        files.push(ev.dataTransfer.files[i]);
      }
    }

    handleFiles(files);
  });

  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragover');
  });

}

main();
