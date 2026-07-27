/**
 * Rendert einen Vorlagen-Syntaxbaum gegen einen Datensatz.
 *
 * Der Renderer kennt keine medizinische Semantik – er setzt ausschliesslich
 * um, was in den Vorlagen steht. Fehler (unbekannter Filter, kaputte
 * Bedingung) fuehren nie zum Abbruch, sondern werden gesammelt und an die
 * Oberflaeche gemeldet.
 */

import { parseTemplate } from './tokenizer.js';
import { evaluateCondition } from './expression.js';
import { applyFilters } from './format.js';
import { cleanupText } from './cleanup.js';
import { asText, getPath, isTruthy } from './values.js';

const templateCache = new Map();

/** Parst mit Cache – dieselbe Vorlage wird bei jedem Tastendruck gerendert. */
export function getParsedTemplate(source) {
  const key = String(source ?? '');
  if (!templateCache.has(key)) templateCache.set(key, parseTemplate(key));
  return templateCache.get(key);
}

export function clearTemplateCache() {
  templateCache.clear();
}

/**
 * Scope-Kette: Schleifenvariablen liegen in vorgelagerten Rahmen, die
 * Formulardaten im Wurzelrahmen.
 */
function createScope(data, frames = []) {
  return {
    lookup(path) {
      const root = String(path).split('.')[0].split('[')[0];
      for (let index = frames.length - 1; index >= 0; index -= 1) {
        if (Object.prototype.hasOwnProperty.call(frames[index], root)) {
          return getPath(frames[index], path);
        }
      }
      return getPath(data, path);
    },
    extend(frame) {
      return createScope(data, [...frames, frame]);
    },
  };
}

/** Adapter, damit der Ausdrucksinterpreter dieselbe Kette benutzt. */
function scopeProxy(scope) {
  return new Proxy({}, {
    get: (_target, property) => (typeof property === 'string' ? scope.lookup(property) : undefined),
    has: () => true,
  });
}

/**
 * @param {string} source Vorlagentext
 * @param {object} data   Formulardaten
 * @param {{ cleanup?: boolean }} [options]
 * @returns {{ text: string, errors: string[] }}
 */
export function render(source, data, options = {}) {
  const { cleanup = true } = options;
  const parsed = getParsedTemplate(source);
  const errors = [...parsed.errors];
  const collect = (error) => {
    const message = error && error.message ? error.message : String(error);
    if (!errors.includes(message)) errors.push(message);
  };

  const scope = createScope(data || {});
  let text = renderNodes(parsed.nodes, scope, collect);
  if (cleanup) text = cleanupText(text);

  return { text, errors };
}

function renderNodes(nodes, scope, collect) {
  let output = '';
  for (const node of nodes || []) output += renderNode(node, scope, collect);
  return output;
}

function renderNode(node, scope, collect) {
  switch (node.type) {
    case 'text':
      return node.value;

    case 'var': {
      const value = scope.lookup(node.path);
      return asText(applyFilters(value, node.filters, collect));
    }

    case 'if': {
      for (const branch of node.branches) {
        if (branch.condition === null) return renderNodes(branch.children, scope, collect);
        if (evaluateCondition(branch.condition, scopeProxy(scope), collect)) {
          return renderNodes(branch.children, scope, collect);
        }
      }
      return '';
    }

    case 'unless':
      return evaluateCondition(node.condition, scopeProxy(scope), collect)
        ? ''
        : renderNodes(node.children, scope, collect);

    case 'each': {
      const raw = scope.lookup(node.path);
      const items = normaliseIterable(raw);
      let output = '';
      items.forEach((item, index) => {
        const frame = {
          this: item,
          '@index': index,
          '@number': index + 1,
          '@first': index === 0,
          '@last': index === items.length - 1,
          '@count': items.length,
        };
        if (node.alias) frame[node.alias] = item;
        output += renderNodes(node.children, scope.extend(frame), collect);
      });
      return output;
    }

    default:
      return '';
  }
}

/**
 * Iteriert ueber Listenfelder. Leere Eintraege einer Wiederholgruppe werden
 * uebersprungen, damit eine angelegte, aber nicht ausgefuellte Zeile keinen
 * leeren Aufzaehlungspunkt erzeugt.
 */
function normaliseIterable(value) {
  if (Array.isArray(value)) return value.filter((entry) => !isBlankEntry(entry));
  if (value === null || value === undefined || value === '') return [];
  if (typeof value === 'string') return value.split('\n').map((line) => line.trim()).filter(Boolean);
  return [value];
}

function isBlankEntry(entry) {
  if (entry === null || entry === undefined) return true;
  if (typeof entry === 'string') return entry.trim() === '';
  if (typeof entry === 'object') return Object.values(entry).every((value) => !isTruthy(value));
  return false;
}
