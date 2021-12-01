import type { HTMLElement } from 'node-html-parser';

const injectScript = `<script src="__yesbuild_inject.js" module></script>`

function injectEmptyBody(origin: string, body: HTMLElement): string {
  let newBody: string;
  if (body.rawAttrs.length === 0) {
    newBody =`<body>${injectScript}</body>`;
  } else {
    newBody = `<body ${body.rawAttrs}>\n`;
    newBody += injectScript;
    newBody += '\n';
    newBody += '</body>';
  }
  const [beginPos, endPos] = body.range;
  const head = origin.slice(0, beginPos);
  const tail = origin.slice(endPos);
  return head + newBody + tail;
}

function injectNonEmptyBody(origin: string, body: HTMLElement): string {
  const lastIndex = body.childNodes.length - 1;
  const lastChild = body.childNodes[lastIndex];
  const [, endPos] = lastChild.range;
  const head = origin.slice(0, endPos);
  const tail = origin.slice(endPos);
  return head + '\n' + injectScript + '\n' + tail;
}

export async function injectHTML(origin: string): Promise<string> {
  const { parse } = await import('node-html-parser');
  const result = parse(origin);
  const bodyElement = result.querySelector('body');
  if (!bodyElement) {
    return origin;
  }
  if (bodyElement.childNodes.length === 0) {
    return injectEmptyBody(origin, bodyElement);
  }
  return injectNonEmptyBody(origin, bodyElement);
}
