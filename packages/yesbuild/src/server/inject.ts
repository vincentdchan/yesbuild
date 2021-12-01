import { parse } from 'node-html-parser';

export function injectHTML(html: string) {
  parse(html);
}
