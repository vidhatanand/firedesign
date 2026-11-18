// The fd:* events each behaviour module documents in its header comment (the first block comment of fire/js/<name>.js).

import path from 'node:path';
import { ROOT, read, topFiles } from './source.mjs';

const EVENT = /fd:[a-z]+(?![a-z:])/g;

// First balanced { ... } group in `text`, collapsed to one line.
function braceGroup(text) {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(start, i + 1).replace(/\s+/g, ' ');
  }
  return null;
}

/**
 * Per module: { header lines, mentions: [{ event, classes: [class], shape, line }] }.
 * `classes` are the fd- classes written on the line that names the event; when that line names none, the classes written
 * in its section are used (a section runs from a line that starts with a capital letter, unindented, to the next one).
 */
export function readModuleEvents() {
  const modules = {};
  for (const file of topFiles('fire/js', ['.js'])) {
    const name = path.basename(file, '.js');
    const m = read(file).match(/^\s*\/\*([\s\S]*?)\*\//);
    if (!m) continue;
    const lines = m[1].split('\n').map((l) => l.replace(/^ ?\* ?/, '').replace(/\s+$/, ''));
    const indent = (l) => l.match(/^ */)[0].length;
    const mentions = [];
    const heading = (l) => l.length > 0 && /^[A-Z]/.test(l);
    // Section id per line, and the classes each section writes.
    const section = [];
    let at = -1;
    lines.forEach((l, i) => { if (heading(l)) at = i; section[i] = at; });
    const classesIn = (text) => [...text.matchAll(/(?<![\w-])\.?(fd-[a-z0-9-]+)/g)].map((x) => x[1]);
    const sectionClasses = new Map();
    lines.forEach((l, i) => { if (section[i] >= 0) sectionClasses.set(section[i], [...(sectionClasses.get(section[i]) || []), ...classesIn(l)]); });
    lines.forEach((line, i) => {
      EVENT.lastIndex = 0;
      const names = [...new Set(line.match(EVENT) || [])];
      if (!names.length) return;
      // The statement: this line plus continuation lines indented deeper than it.
      let text = line;
      for (let j = i + 1; j < lines.length && lines[j].trim() && indent(lines[j]) > indent(line) + 1 && !EVENT.test(lines[j]); j++) text += ' ' + lines[j].trim();
      const own = [...new Set(classesIn(line))];
      // No class on the line: the classes of the nearest line above it that is indented less (the entry it belongs to);
      // failing that, those of its section when the section is small enough to be about one thing.
      let head = [];
      for (let j = i - 1, cur = indent(line); j >= 0 && cur > 0; j--) {
        if (!lines[j].trim() || indent(lines[j]) >= cur) continue;
        cur = indent(lines[j]);
        head = [...new Set(classesIn(lines[j]))];
        if (head.length) break;
      }
      for (const event of names) {
        const at = line.indexOf(event);
        const rest = line.slice(at + event.length) + text.slice(line.length);
        // Only a brace group that belongs to this event: before the next event name on the line.
        const next = rest.search(/fd:[a-z]/);
        const scope = next < 0 ? rest : rest.slice(0, next);
        let shape = braceGroup(scope);
        // "detail.value = { start, end }" documents the value, not the whole detail.
        if (shape && /detail\.value\s*=\s*$/.test(scope.slice(0, scope.indexOf('{')))) shape = `{ value: ${shape} }`;
        mentions.push({ event, classes: own.length ? own : head, shape, line: line.trim(), text: rest });
      }
    });
    modules[name] = mentions;
  }
  return modules;
}

/** events: name -> { detail, shapes: { module: [shape] } }. The generic shape of core.js wins as `detail`. */
export function summariseEvents(modules) {
  const events = {};
  for (const mod of Object.keys(modules).sort()) {
    for (const { event, shape } of modules[mod]) {
      if (/^fd:(dismissed)$/.test(event)) continue;
      const e = (events[event] ??= { detail: '', shapes: {} });
      if (shape) {
        const list = (e.shapes[mod] ??= []);
        if (!list.includes(shape)) list.push(shape);
      }
    }
  }
  for (const name of Object.keys(events).sort()) {
    const e = events[name];
    const generic = e.shapes.core?.[0];
    const first = Object.keys(e.shapes).sort().map((m) => e.shapes[m][0])[0];
    e.detail = generic || first || '';
  }
  return Object.fromEntries(Object.keys(events).sort().map((k) => [k, events[k]]));
}
