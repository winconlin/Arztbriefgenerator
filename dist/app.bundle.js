/*
 * Arztbriefgenerator – erzeugtes Browser-Bundle.
 *
 * NICHT VON HAND BEARBEITEN. Diese Datei entsteht aus den Modulen unter
 * src/ und wird mit "npm run build" neu erzeugt.
 *
 * Sie ist ein klassisches Skript ohne ES-Modul-Importe, damit die Anwendung
 * auch beim direkten Öffnen von index.html über file:// funktioniert.
 * Zur Laufzeit wird nichts nachgeladen.
 *
 * Einstiegspunkt: src/main.js
 * Enthaltene Module: 28
 */
(function () {
  'use strict';

  var __definitionen = {};
  var __instanzen = {};

  function __resolve(basis, pfad) {
    var teile = basis.split("/");
    teile.pop();
    pfad.split("/").forEach(function (stueck) {
      if (stueck === "." || stueck === "") return;
      if (stueck === "..") teile.pop();
      else teile.push(stueck);
    });
    return teile.join("/");
  }

  function __laden(id) {
    if (__instanzen[id]) return __instanzen[id];
    var definition = __definitionen[id];
    if (!definition) throw new Error("Modul nicht im Bundle enthalten: " + id);
    var exporte = {};
    __instanzen[id] = exporte;
    definition(exporte, function (pfad) { return __laden(__resolve(id, pfad)); });
    return exporte;
  }

  __definitionen["src/engine/tokenizer.js"] = function (__exports, __require) {
/* ---- src/engine/tokenizer.js ---- */
/**
 * Zerlegt einen Vorlagentext in einen Syntaxbaum.
 *
 * Unterstuetzte Konstrukte:
 *   {{ feld }}                       Platzhalter
 *   {{ feld | date }}                Platzhalter mit Filterkette
 *   {{ feld | num:2 }}               Filter mit Argument
 *   {{#if ausdruck}} … {{/if}}
 *   {{#if a}} … {{#elseif b}} … {{#else}} … {{/if}}
 *   {{#unless ausdruck}} … {{/unless}}
 *   {{#each liste}} … {{/each}}      Kontext: this, @index, @number, @first, @last
 *   {{#each liste as eintrag}} … {{/each}}
 *   {{! Kommentar }}                 erscheint nicht in der Ausgabe
 *
 * Der Parser ist tolerant: Ein unbekanntes oder unvollstaendiges Konstrukt
 * wird als Fehler gemeldet, der restliche Text aber weiter verarbeitet.
 */

const TAG_PATTERN = /\{\{([\s\S]*?)\}\}/g;

/**
 * Zeilen, die ausschliesslich Block- oder Kommentar-Tags enthalten
 * ({{#if}}, {{#else}}, {{/if}}, {{#each}}, {{!…}}), sind reine Struktur und
 * duerfen keinen Zeilenumbruch erzeugen. Ohne diese Regel hinterlaesst jeder
 * nicht erfuellte optionale Absatz eine Leerzeile im Brief.
 *
 * Platzhalter wie {{p2y12}} sind davon ausgenommen – sie erzeugen Inhalt.
 */
const STANDALONE_BLOCK_LINE = /^[ \t]*((?:\{\{[#/!][^{}]*\}\}[ \t]*)+)\r?\n/gm;

function stripStandaloneBlockLines(source) {
  return source.replace(STANDALONE_BLOCK_LINE, '$1');
}

class TemplateSyntaxError extends Error {}

/**
 * @returns {{ nodes: Array, errors: Array<string> }}
 */
function parseTemplate(source) {
  const text = stripStandaloneBlockLines(String(source ?? '').replace(/\r\n?/g, '\n'));
  const errors = [];
  const root = { type: 'root', children: [] };
  const stack = [root];
  let lastIndex = 0;
  let match;

  const currentChildren = () => stack[stack.length - 1].children;

  const pushText = (value) => {
    if (value === '') return;
    const children = currentChildren();
    const previous = children[children.length - 1];
    if (previous && previous.type === 'text') previous.value += value;
    else children.push({ type: 'text', value });
  };

  TAG_PATTERN.lastIndex = 0;
  while ((match = TAG_PATTERN.exec(text)) !== null) {
    pushText(text.slice(lastIndex, match.index));
    lastIndex = TAG_PATTERN.lastIndex;

    const raw = match[1].trim();
    if (raw === '') continue;

    try {
      handleTag(raw, stack, errors);
    } catch (error) {
      errors.push(error.message);
      // Unverstandenes Tag bleibt sichtbar, damit der Fehler im Brief auffaellt
      // statt still Inhalt zu verschlucken.
      pushText(match[0]);
    }
  }
  pushText(text.slice(lastIndex));

  while (stack.length > 1) {
    const unclosed = stack.pop();
    errors.push(`Nicht geschlossener Block {{#${unclosed.type}}}`);
  }

  return { nodes: root.children, errors };
}

function handleTag(raw, stack, errors) {
  const currentChildren = () => stack[stack.length - 1].children;

  if (raw.startsWith('!')) return; // Kommentar

  if (raw.startsWith('/')) {
    const name = raw.slice(1).trim().toLowerCase();
    const open = stack[stack.length - 1];
    if (stack.length === 1) throw new TemplateSyntaxError(`Schliessendes {{/${name}}} ohne oeffnenden Block`);
    if (open.type !== name) {
      throw new TemplateSyntaxError(`{{/${name}}} schliesst nicht den offenen Block {{#${open.type}}}`);
    }
    stack.pop();
    return;
  }

  if (raw.startsWith('#')) {
    const body = raw.slice(1).trim();
    const [keywordRaw, ...restParts] = body.split(/\s+/);
    const keyword = keywordRaw.toLowerCase();
    const rest = restParts.join(' ').trim();

    if (keyword === 'if') {
      if (!rest) throw new TemplateSyntaxError('{{#if}} ohne Bedingung');
      const node = { type: 'if', branches: [{ condition: rest, children: [] }], children: null };
      currentChildren().push(node);
      stack.push(makeBranchFrame(node));
      return;
    }

    if (keyword === 'elseif' || keyword === 'elsif') {
      const frame = stack[stack.length - 1];
      if (!frame.owner || frame.owner.type !== 'if') throw new TemplateSyntaxError('{{#elseif}} ausserhalb von {{#if}}');
      if (!rest) throw new TemplateSyntaxError('{{#elseif}} ohne Bedingung');
      frame.owner.branches.push({ condition: rest, children: [] });
      frame.children = frame.owner.branches[frame.owner.branches.length - 1].children;
      return;
    }

    if (keyword === 'else') {
      const frame = stack[stack.length - 1];
      if (!frame.owner || frame.owner.type !== 'if') throw new TemplateSyntaxError('{{#else}} ausserhalb von {{#if}}');
      frame.owner.branches.push({ condition: null, children: [] });
      frame.children = frame.owner.branches[frame.owner.branches.length - 1].children;
      return;
    }

    if (keyword === 'unless') {
      if (!rest) throw new TemplateSyntaxError('{{#unless}} ohne Bedingung');
      const node = { type: 'unless', condition: rest, children: [] };
      currentChildren().push(node);
      stack.push(node);
      return;
    }

    if (keyword === 'each') {
      if (!rest) throw new TemplateSyntaxError('{{#each}} ohne Liste');
      const aliasMatch = /^(.*?)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/i.exec(rest);
      const node = {
        type: 'each',
        path: (aliasMatch ? aliasMatch[1] : rest).trim(),
        alias: aliasMatch ? aliasMatch[2] : null,
        children: [],
      };
      currentChildren().push(node);
      stack.push(node);
      return;
    }

    throw new TemplateSyntaxError(`Unbekannter Block {{#${keyword}}}`);
  }

  currentChildren().push(parseVariable(raw));
}

/**
 * Das if-Element speichert seine Zweige separat; der Stack braucht trotzdem
 * ein Objekt mit `children`. Der Rahmen zeigt jeweils auf den gerade offenen
 * Zweig und wird von {{#elseif}}/{{#else}} umgehaengt.
 */
function makeBranchFrame(ifNode) {
  return { type: 'if', owner: ifNode, children: ifNode.branches[0].children };
}

function parseVariable(raw) {
  const parts = splitTopLevel(raw, '|');
  const path = parts.shift().trim();
  if (!path) throw new TemplateSyntaxError('Platzhalter ohne Feldnamen');
  if (!/^[@A-Za-z_][A-Za-z0-9_.[\]]*$/.test(path)) {
    throw new TemplateSyntaxError(`Ungueltiger Feldname "${path}"`);
  }
  const filters = parts.map((part) => {
    const trimmed = part.trim();
    const colon = trimmed.indexOf(':');
    if (colon === -1) return { name: trimmed, args: [] };
    const name = trimmed.slice(0, colon).trim();
    const args = splitTopLevel(trimmed.slice(colon + 1), ',').map((argument) => stripQuotes(argument.trim()));
    return { name, args };
  });
  return { type: 'var', path, filters };
}

/** Trennt an `separator`, ignoriert dabei Anfuehrungszeichen. */
function splitTopLevel(source, separator) {
  const parts = [];
  let current = '';
  let quote = null;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === quote) quote = null;
      current += char;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; current += char; continue; }
    if (char === separator) { parts.push(current); current = ''; continue; }
    current += char;
  }
  parts.push(current);
  return parts;
}

function stripQuotes(value) {
  if (value.length >= 2 && ((value[0] === '"' && value.endsWith('"')) || (value[0] === "'" && value.endsWith("'")))) {
    return value.slice(1, -1);
  }
  return value;
}

function rootSegment(path) {
  return String(path).split('.')[0].split('[')[0];
}

/**
 * Alle im Vorlagentext referenzierten Feldnamen (Wurzelsegment).
 * Schleifenvariablen (`this`, `@index`, `{{#each … as eintrag}}`) zaehlen
 * nicht als Feld, damit die Validierung sie nicht als unbekannt meldet.
 */
function collectTemplatePaths(nodes, collected = new Set(), scopeAliases = new Set()) {
  const isLocal = (root) => root.startsWith('@') || root === 'this' || scopeAliases.has(root);

  for (const node of nodes || []) {
    if (node.type === 'var') {
      const root = rootSegment(node.path);
      if (!isLocal(root)) collected.add(root);
    } else if (node.type === 'if') {
      // Bedingungen werden von collectConditions/collectExpressionPaths geprueft.
      for (const branch of node.branches) collectTemplatePaths(branch.children, collected, scopeAliases);
    } else if (node.type === 'each') {
      const root = rootSegment(node.path);
      if (!isLocal(root)) collected.add(root);
      const nestedAliases = new Set(scopeAliases);
      if (node.alias) nestedAliases.add(node.alias);
      collectTemplatePaths(node.children, collected, nestedAliases);
    } else if (node.children) {
      collectTemplatePaths(node.children, collected, scopeAliases);
    }
  }
  return collected;
}

/** Alle Bedingungsausdruecke eines Baums, samt der jeweils gueltigen Aliasse. */
function collectConditions(nodes, found = [], scopeAliases = new Set()) {
  for (const node of nodes || []) {
    if (node.type === 'if') {
      for (const branch of node.branches) {
        if (branch.condition) found.push({ expression: branch.condition, aliases: new Set(scopeAliases) });
        collectConditions(branch.children, found, scopeAliases);
      }
    } else if (node.type === 'unless') {
      found.push({ expression: node.condition, aliases: new Set(scopeAliases) });
      collectConditions(node.children, found, scopeAliases);
    } else if (node.type === 'each') {
      const nestedAliases = new Set(scopeAliases);
      if (node.alias) nestedAliases.add(node.alias);
      collectConditions(node.children, found, nestedAliases);
    } else if (node.children) {
      collectConditions(node.children, found, scopeAliases);
    }
  }
  return found;
}

      /* Exporte */
      __exports["parseTemplate"] = parseTemplate;
      __exports["collectTemplatePaths"] = collectTemplatePaths;
      __exports["collectConditions"] = collectConditions;
      __exports["TemplateSyntaxError"] = TemplateSyntaxError;
  };

  __definitionen["src/engine/values.js"] = function (__exports, __require) {
/* ---- src/engine/values.js ---- */
/**
 * Wertzugriff und Wahrheitswerte fuer die Template-Engine.
 *
 * Bewusst ohne jede DOM- oder Browser-Abhaengigkeit, damit die Engine
 * unveraendert unter node:test laeuft.
 */

/** Leerwert im Sinne der Engine: null, undefined, "", "   ", []. */
function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Wahrheitswert im Sinne von {{#if}}.
 * Die Zahl 0 gilt als falsch; Scores werden deshalb immer explizit
 * verglichen ({{#if cha2ds2vasc >= 2}}), nie auf Wahrheitswert geprueft.
 */
function isTruthy(value) {
  if (isEmpty(value)) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '0') return false;
    if (trimmed.toLowerCase() === 'false') return false;
    return true;
  }
  return true;
}

/** Deutsche Dezimalkommas werden fuer Vergleiche als Punkt gelesen. */
function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const normalised = trimmed.replace(/\s/g, '').replace(',', '.');
  if (!/^[+-]?\d+(\.\d+)?$/.test(normalised)) return null;
  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Pfadzugriff `a.b[0].c`. Gibt undefined zurueck, statt zu werfen –
 * ein Tippfehler im Template darf die App nicht anhalten.
 */
function getPath(scope, path) {
  const segments = String(path).split('.');
  let current = scope;
  for (const rawSegment of segments) {
    if (current === null || current === undefined) return undefined;
    const match = /^([^[\]]*)((\[\d+\])*)$/.exec(rawSegment);
    if (!match) return undefined;
    const [, name, indexPart] = match;
    if (name !== '') {
      if (typeof current !== 'object') return undefined;
      current = current[name];
    }
    if (indexPart) {
      for (const index of indexPart.match(/\d+/g) || []) {
        if (!Array.isArray(current)) return undefined;
        current = current[Number(index)];
      }
    }
  }
  return current;
}

/**
 * Vergleich zweier Werte. Sind beide numerisch interpretierbar, wird
 * numerisch verglichen, sonst als getrimmter String (case-insensitiv fuer
 * Gleichheit, damit `select`-Optionen robust bleiben).
 */
function compare(left, right, operator) {
  const leftNumber = toNumber(left);
  const rightNumber = toNumber(right);
  const numeric = leftNumber !== null && rightNumber !== null;

  if (numeric) {
    switch (operator) {
      case '==': return leftNumber === rightNumber;
      case '!=': return leftNumber !== rightNumber;
      case '>': return leftNumber > rightNumber;
      case '>=': return leftNumber >= rightNumber;
      case '<': return leftNumber < rightNumber;
      case '<=': return leftNumber <= rightNumber;
      default: return false;
    }
  }

  if (operator === '==' || operator === '!=') {
    const equal = normaliseForEquality(left) === normaliseForEquality(right);
    return operator === '==' ? equal : !equal;
  }

  const leftText = asText(left);
  const rightText = asText(right);
  const order = leftText.localeCompare(rightText, 'de');
  switch (operator) {
    case '>': return order > 0;
    case '>=': return order >= 0;
    case '<': return order < 0;
    case '<=': return order <= 0;
    default: return false;
  }
}

function normaliseForEquality(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (isEmpty(value)) return '';
  return asText(value).trim().toLowerCase();
}

/** `contains`: Array enthaelt Element, String enthaelt Teilstring. */
function contains(haystack, needle) {
  if (Array.isArray(haystack)) {
    return haystack.some((entry) => normaliseForEquality(entry) === normaliseForEquality(needle));
  }
  if (typeof haystack === 'string') {
    return haystack.toLowerCase().includes(asText(needle).toLowerCase());
  }
  return false;
}

/** Textdarstellung eines Wertes fuer die Ausgabe. */
function asText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'ja' : '';
  if (Array.isArray(value)) return value.map(asText).filter((entry) => entry !== '').join(', ');
  if (typeof value === 'object') return '';
  return String(value);
}

      /* Exporte */
      __exports["isEmpty"] = isEmpty;
      __exports["isTruthy"] = isTruthy;
      __exports["toNumber"] = toNumber;
      __exports["getPath"] = getPath;
      __exports["compare"] = compare;
      __exports["contains"] = contains;
      __exports["asText"] = asText;
  };

  __definitionen["src/engine/expression.js"] = function (__exports, __require) {
/* ---- src/engine/expression.js ---- */
/**
 * Sicherer Ausdrucksparser fuer konditionale Logik.
 *
 * WICHTIG: Es wird weder `eval` noch `new Function` verwendet. Der Ausdruck
 * wird tokenisiert, in einen Syntaxbaum geparst und anschliessend
 * interpretiert. Damit kann ein importiertes Template keinen Code ausfuehren.
 *
 * Grammatik:
 *   expression  := or
 *   or          := and       ( ("or" | "||") and )*
 *   and         := unary     ( ("and" | "&&") unary )*
 *   unary       := ("not" | "!") unary | comparison
 *   comparison  := primary ( ("==" | "!=" | ">" | ">=" | "<" | "<=" |
 *                             "contains" | "in" | "not in") primary )?
 *   primary     := "(" expression ")" | array | literal | path
 *   array       := "[" ( primary ("," primary)* )? "]"
 *   literal     := number | "'…'" | '"…"' | true | false | empty
 *   path        := ident ("." ident | "[" number "]")*
 *
 * Zusaetzlich: `feld empty` und `feld not empty` als Kurzform fuer die
 * haeufigste Pruefung ("optionaler Wert wurde nicht ausgefuellt").
 */

const { compare, contains, getPath, isEmpty, isTruthy } = __require("./values.js");

const COMPARISON_OPERATORS = ['==', '!=', '>=', '<=', '>', '<'];
const WORD_OPERATORS = new Set(['and', 'or', 'not', 'contains', 'in', 'empty', 'true', 'false']);

class ExpressionError extends Error {}

/* ------------------------------------------------------------------ */
/* Tokenizer                                                           */
/* ------------------------------------------------------------------ */

function tokenize(source) {
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (/\s/.test(char)) { index += 1; continue; }

    if (char === '(' || char === ')' || char === '[' || char === ']' || char === ',') {
      tokens.push({ type: 'punct', value: char });
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      const quote = char;
      let value = '';
      index += 1;
      while (index < source.length && source[index] !== quote) {
        if (source[index] === '\\' && index + 1 < source.length) {
          value += source[index + 1];
          index += 2;
        } else {
          value += source[index];
          index += 1;
        }
      }
      if (index >= source.length) throw new ExpressionError(`Nicht geschlossene Zeichenkette in "${source}"`);
      index += 1;
      tokens.push({ type: 'string', value });
      continue;
    }

    if (char === '&' && source[index + 1] === '&') { tokens.push({ type: 'word', value: 'and' }); index += 2; continue; }
    if (char === '|' && source[index + 1] === '|') { tokens.push({ type: 'word', value: 'or' }); index += 2; continue; }
    if (char === '!' && source[index + 1] !== '=') { tokens.push({ type: 'word', value: 'not' }); index += 1; continue; }

    const operator = COMPARISON_OPERATORS.find((candidate) => source.startsWith(candidate, index));
    if (operator) {
      tokens.push({ type: 'operator', value: operator });
      index += operator.length;
      continue;
    }

    if (/[0-9]/.test(char) || (char === '-' && /[0-9]/.test(source[index + 1] || ''))) {
      let raw = char;
      index += 1;
      while (index < source.length && /[0-9.]/.test(source[index])) { raw += source[index]; index += 1; }
      tokens.push({ type: 'number', value: Number(raw) });
      continue;
    }

    if (/[A-Za-z_@]/.test(char)) {
      let raw = '';
      while (index < source.length && /[A-Za-z0-9_@.[\]]/.test(source[index])) {
        // Klammerindex nur uebernehmen, wenn eine Ziffer folgt – sonst ist es
        // das Ende eines Array-Literals.
        if (source[index] === '[' && !/[0-9]/.test(source[index + 1] || '')) break;
        raw += source[index];
        index += 1;
      }
      const lowered = raw.toLowerCase();
      tokens.push(WORD_OPERATORS.has(lowered) ? { type: 'word', value: lowered } : { type: 'path', value: raw });
      continue;
    }

    throw new ExpressionError(`Unerwartetes Zeichen "${char}" in "${source}"`);
  }

  return tokens;
}

/* ------------------------------------------------------------------ */
/* Parser                                                              */
/* ------------------------------------------------------------------ */

function parse(tokens, source) {
  let position = 0;

  const peek = () => tokens[position];
  const next = () => tokens[position++];
  const matchWord = (word) => {
    const token = peek();
    if (token && token.type === 'word' && token.value === word) { position += 1; return true; }
    return false;
  };
  const matchPunct = (value) => {
    const token = peek();
    if (token && token.type === 'punct' && token.value === value) { position += 1; return true; }
    return false;
  };

  function parseExpression() { return parseOr(); }

  function parseOr() {
    let node = parseAnd();
    while (matchWord('or')) node = { kind: 'or', left: node, right: parseAnd() };
    return node;
  }

  function parseAnd() {
    let node = parseUnary();
    while (matchWord('and')) node = { kind: 'and', left: node, right: parseUnary() };
    return node;
  }

  function parseUnary() {
    if (matchWord('not')) return { kind: 'not', operand: parseUnary() };
    return parseComparison();
  }

  function parseComparison() {
    const left = parsePrimary();
    const token = peek();
    if (!token) return left;

    if (token.type === 'operator') {
      next();
      return { kind: 'compare', operator: token.value, left, right: parsePrimary() };
    }

    if (token.type === 'word' && token.value === 'contains') {
      next();
      return { kind: 'contains', left, right: parsePrimary() };
    }

    if (token.type === 'word' && token.value === 'in') {
      next();
      return { kind: 'contains', left: parsePrimary(), right: left };
    }

    if (token.type === 'word' && token.value === 'empty') {
      next();
      return { kind: 'empty', operand: left };
    }

    if (token.type === 'word' && token.value === 'not') {
      // "feld not empty" und "feld not in [...]"
      const lookahead = tokens[position + 1];
      if (lookahead && lookahead.type === 'word' && lookahead.value === 'empty') {
        position += 2;
        return { kind: 'not', operand: { kind: 'empty', operand: left } };
      }
      if (lookahead && lookahead.type === 'word' && lookahead.value === 'in') {
        position += 2;
        return { kind: 'not', operand: { kind: 'contains', left: parsePrimary(), right: left } };
      }
    }

    return left;
  }

  function parsePrimary() {
    if (matchPunct('(')) {
      const node = parseExpression();
      if (!matchPunct(')')) throw new ExpressionError(`Fehlende schliessende Klammer in "${source}"`);
      return node;
    }

    if (matchPunct('[')) {
      const items = [];
      if (!matchPunct(']')) {
        do { items.push(parsePrimary()); } while (matchPunct(','));
        if (!matchPunct(']')) throw new ExpressionError(`Fehlende schliessende eckige Klammer in "${source}"`);
      }
      return { kind: 'array', items };
    }

    const token = next();
    if (!token) throw new ExpressionError(`Unvollstaendiger Ausdruck "${source}"`);
    if (token.type === 'string') return { kind: 'literal', value: token.value };
    if (token.type === 'number') return { kind: 'literal', value: token.value };
    if (token.type === 'word' && token.value === 'true') return { kind: 'literal', value: true };
    if (token.type === 'word' && token.value === 'false') return { kind: 'literal', value: false };
    if (token.type === 'path') return { kind: 'path', path: token.value };

    throw new ExpressionError(`Unerwartetes Token "${token.value}" in "${source}"`);
  }

  const ast = parseExpression();
  if (position < tokens.length) {
    throw new ExpressionError(`Ueberzaehlige Zeichen ab "${tokens[position].value}" in "${source}"`);
  }
  return ast;
}

/* ------------------------------------------------------------------ */
/* Auswertung                                                          */
/* ------------------------------------------------------------------ */

function evaluateNode(node, scope) {
  switch (node.kind) {
    case 'literal': return node.value;
    case 'path': return getPath(scope, node.path);
    case 'array': return node.items.map((item) => evaluateNode(item, scope));
    case 'and': return isTruthy(evaluateNode(node.left, scope)) && isTruthy(evaluateNode(node.right, scope));
    case 'or': return isTruthy(evaluateNode(node.left, scope)) || isTruthy(evaluateNode(node.right, scope));
    case 'not': return !isTruthy(evaluateNode(node.operand, scope));
    case 'empty': return isEmpty(evaluateNode(node.operand, scope));
    // Konvention: node.left ist die Menge/der Text, node.right der gesuchte
    // Wert – sowohl fuer "liste contains wert" als auch fuer "wert in liste".
    case 'contains': return contains(evaluateNode(node.left, scope), evaluateNode(node.right, scope));
    case 'compare': return compare(evaluateNode(node.left, scope), evaluateNode(node.right, scope), node.operator);
    default: throw new ExpressionError(`Unbekannter Knotentyp "${node.kind}"`);
  }
}

const compilationCache = new Map();

/** Parst einen Ausdruck (mit Cache) und liefert den Syntaxbaum. */
function compileExpression(source) {
  const key = String(source);
  if (compilationCache.has(key)) {
    const cached = compilationCache.get(key);
    if (cached instanceof Error) throw cached;
    return cached;
  }
  try {
    const ast = parse(tokenize(key), key);
    compilationCache.set(key, ast);
    return ast;
  } catch (error) {
    const wrapped = error instanceof ExpressionError ? error : new ExpressionError(String(error.message || error));
    compilationCache.set(key, wrapped);
    throw wrapped;
  }
}

/**
 * Wertet einen Bedingungsausdruck gegen den Datenkontext aus.
 * Ein fehlerhafter Ausdruck liefert `false` und meldet sich ueber `onError`,
 * damit ein Tippfehler im Template niemals die Briefgenerierung abbricht.
 */
function evaluateCondition(source, scope, onError) {
  if (source === undefined || source === null || String(source).trim() === '') return true;
  try {
    return isTruthy(evaluateNode(compileExpression(source), scope));
  } catch (error) {
    if (typeof onError === 'function') onError(error, source);
    return false;
  }
}

/** Prueft die Syntax ohne Auswertung. Liefert `null` oder die Fehlermeldung. */
function validateExpression(source) {
  if (source === undefined || source === null || String(source).trim() === '') return null;
  try {
    compileExpression(source);
    return null;
  } catch (error) {
    return error.message;
  }
}

/** Alle in einem Ausdruck referenzierten Feldnamen (Wurzelsegment). */
function collectExpressionPaths(source) {
  const found = new Set();
  if (source === undefined || source === null || String(source).trim() === '') return found;
  let ast;
  try { ast = compileExpression(source); } catch { return found; }
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.kind === 'path') found.add(String(node.path).split('.')[0].split('[')[0]);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') walk(value);
    }
  };
  walk(ast);
  return found;
}

      /* Exporte */
      __exports["compileExpression"] = compileExpression;
      __exports["evaluateCondition"] = evaluateCondition;
      __exports["validateExpression"] = validateExpression;
      __exports["collectExpressionPaths"] = collectExpressionPaths;
      __exports["ExpressionError"] = ExpressionError;
  };

  __definitionen["src/engine/format.js"] = function (__exports, __require) {
/* ---- src/engine/format.js ---- */
/**
 * Ausgabeformatierung (Filter) fuer Platzhalter.
 *
 * Die Filter sind bewusst nachsichtig: Ein Wert, der nicht dem erwarteten
 * Format entspricht (z. B. weil der Anwender "XX.XX." eingetippt hat statt
 * ein Datum zu waehlen), wird unveraendert durchgereicht statt verworfen.
 */

const { asText, isEmpty, toNumber } = __require("./values.js");

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;
const ISO_TIME = /^(\d{1,2}):(\d{2})/;

/** "2026-05-21" -> "21.05.2026" */
function formatDate(value) {
  const text = asText(value).trim();
  const match = ISO_DATE.exec(text);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : text;
}

/** "2026-05-21" -> "21.05." (Hausstil "Wir entlassen X am XX.XX.") */
function formatDateShort(value) {
  const text = asText(value).trim();
  const match = ISO_DATE.exec(text);
  return match ? `${match[3]}.${match[2]}.` : text;
}

/** "2026-05-21" -> "21.05.26" */
function formatDateShortYear(value) {
  const text = asText(value).trim();
  const match = ISO_DATE.exec(text);
  return match ? `${match[3]}.${match[2]}.${match[1].slice(2)}` : text;
}

/** "2026-05" -> "05/26"; akzeptiert auch bereits fertige Eingaben. */
function formatMonthYear(value) {
  const text = asText(value).trim();
  const match = ISO_MONTH.exec(text);
  return match ? `${match[2]}/${match[1].slice(2)}` : text;
}

/** "14:30" -> "14.30" (Hausstil "um XX.XX Uhr") */
function formatTime(value) {
  const text = asText(value).trim();
  const match = ISO_TIME.exec(text);
  return match ? `${match[1].padStart(2, '0')}.${match[2]}` : text;
}

/** Zahl mit deutschem Dezimalkomma, optional feste Nachkommastellen. */
function formatNumber(value, digits) {
  const number = toNumber(value);
  if (number === null) return asText(value);
  const decimals = digits === undefined ? undefined : Number(digits);
  const text = Number.isFinite(decimals) ? number.toFixed(decimals) : String(number);
  return text.replace('.', ',');
}

/** Aufzaehlung im Fliesstext: "A, B und C". */
function formatEnumeration(value, conjunction = 'und') {
  const items = (Array.isArray(value) ? value : [value])
    .map((entry) => asText(entry).trim())
    .filter((entry) => entry !== '');
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;
}

/** Aufzaehlung als Liste, Standardtrenner ", ". */
function formatJoin(value, separator = ', ') {
  const items = (Array.isArray(value) ? value : [value])
    .map((entry) => asText(entry).trim())
    .filter((entry) => entry !== '');
  return items.join(separator);
}

/** Jede Zeile eines Wertes als Aufzaehlungspunkt. */
function formatBullets(value, marker = '-') {
  const items = Array.isArray(value)
    ? value.map((entry) => asText(entry))
    : asText(value).split('\n');
  return items
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '')
    .map((entry) => (entry.startsWith(marker) ? entry : `${marker} ${entry}`))
    .join('\n');
}

function capitalize(value) {
  const text = asText(value);
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

const FILTERS = {
  date: formatDate,
  datum: formatDate,
  dateShort: formatDateShort,
  datumKurz: formatDateShort,
  dateShortYear: formatDateShortYear,
  monthyear: formatMonthYear,
  monatJahr: formatMonthYear,
  time: formatTime,
  uhrzeit: formatTime,
  num: formatNumber,
  zahl: formatNumber,
  enum: formatEnumeration,
  aufzaehlung: formatEnumeration,
  join: formatJoin,
  bullets: formatBullets,
  cap: capitalize,
  upper: (value) => asText(value).toUpperCase(),
  lower: (value) => asText(value).toLowerCase(),
  trim: (value) => asText(value).trim(),
  /** Ersatzwert, wenn der Wert leer ist. */
  fallback: (value, replacement = '') => (isEmpty(value) ? replacement : asText(value)),
};

/** Wendet eine Filterkette auf einen Wert an. */
function applyFilters(value, filters, onError) {
  let current = value;
  for (const filter of filters || []) {
    const implementation = FILTERS[filter.name];
    if (!implementation) {
      if (typeof onError === 'function') onError(new Error(`Unbekannter Filter "${filter.name}"`));
      continue;
    }
    current = implementation(current, ...(filter.args || []));
  }
  return current;
}

const FILTER_NAMES = Object.keys(FILTERS);

      /* Exporte */
      __exports["FILTERS"] = FILTERS;
      __exports["applyFilters"] = applyFilters;
      __exports["FILTER_NAMES"] = FILTER_NAMES;
  };

  __definitionen["src/engine/cleanup.js"] = function (__exports, __require) {
/* ---- src/engine/cleanup.js ---- */
/**
 * Nachbereinigung des generierten Textes.
 *
 * Fehlt ein optionaler Wert, bleiben sonst leere Klammern, doppelte
 * Leerzeichen oder verwaiste Satzzeichen stehen. Die Regeln sind bewusst
 * konservativ gehalten, damit medizinische Notation unangetastet bleibt:
 *
 *   erhalten:  "<55 mg/dl"  "0,8 cm²"  "Z.n."  "8-10 Tagen"  "2.ICR"
 *              "zeigt sich…."  "1/2/3-Gefaesserkrankung"  "08031/365 3101"
 *   entfernt:  "()"  "[]"  "„"" "  " ,"  ",,"  ", ."  doppelte Leerzeichen,
 *              leere Aufzaehlungspunkte, mehr als eine Leerzeile am Stueck
 */

const EMPTY_BRACKETS = [
  /\(\s*\)/g,               // ( )
  /\[\s*\]/g,               // [ ]
  /\(\s*[,;/–-]\s*\)/g,     // (, )  (/)  (-)
  /„\s*"/g,                 // leere deutsche Anfuehrungszeichen
  /"\s*"/g,
];

/** Zeilen, die nach dem Rendern nur noch aus Listenmarkierung bestehen. */
const EMPTY_BULLET = /^[\s]*(?:[-*•·]|\d+[.)])[\s]*$/;

/** Zeilen, die nur noch aus Satzzeichen bestehen. */
const PUNCTUATION_ONLY = /^[\s]*[,;:.!?/–-]+[\s]*$/;

/**
 * Bereinigt einen gerenderten Abschnitt.
 * @param {string} source
 * @returns {string}
 */
function cleanupText(source) {
  let text = String(source ?? '').replace(/\r\n?/g, '\n');

  // Wiederholt anwenden: das Entfernen einer leeren Klammer kann eine neue
  // Doppelinterpunktion freilegen und umgekehrt.
  for (let pass = 0; pass < 4; pass += 1) {
    const before = text;
    text = applyInlineRules(text);
    if (text === before) break;
  }

  text = text
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .filter((line, index, lines) => !isDroppableLine(line, index, lines))
    .join('\n');

  // Hoechstens eine Leerzeile am Stueck.
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

function applyInlineRules(input) {
  let text = input;

  for (const pattern of EMPTY_BRACKETS) text = text.replace(pattern, '');

  // Mehrfache Leerzeichen/Tabs innerhalb einer Zeile zusammenfassen,
  // fuehrende Einrueckung aber erhalten.
  text = text.replace(/^([ \t]*)(.*)$/gm, (_match, indent, rest) => indent + rest.replace(/[ \t]{2,}/g, ' '));

  // Leerzeichen vor schliessenden Satzzeichen entfernen.
  text = text.replace(/[ \t]+([,;:.!?])/g, '$1');
  // Leerzeichen direkt nach oeffnender bzw. vor schliessender Klammer.
  text = text.replace(/\([ \t]+/g, '(').replace(/[ \t]+\)/g, ')');
  // Leerzeichen vor schliessender Klammer, das erst durch einen leeren Wert entstand.
  text = text.replace(/\(([^()\n]*?)[,;]\s*\)/g, '($1)');

  // Verwaiste Satzzeichenfolgen zusammenfassen. "…" bleibt unangetastet.
  text = text.replace(/,\s*,+/g, ',');
  text = text.replace(/;\s*;+/g, ';');
  text = text.replace(/,\s*([.;:!?])/g, '$1');
  text = text.replace(/;\s*([.!?])/g, '$1');

  // Satzzeichen unmittelbar nach oeffnender Klammer.
  text = text.replace(/\(\s*[,;]\s*/g, '(');

  // Verwaistes Satzzeichen am Zeilenanfang (z. B. ", Der weitere Aufenthalt …").
  text = text.replace(/^[ \t]*([,;])[ \t]*/gm, '');

  return text;
}

function isDroppableLine(line, index, lines) {
  if (EMPTY_BULLET.test(line)) return true;
  if (PUNCTUATION_ONLY.test(line)) return true;
  // Fuehrende Leerzeilen des Abschnitts entfernen.
  if (line.trim() === '' && lines.slice(0, index).every((entry) => entry.trim() === '')) return true;
  return false;
}

/**
 * Fuegt Abschnitte zu einem Gesamtbrief zusammen.
 * @param {Array<{title: string, text: string}>} sections
 */
function joinSections(sections, { withTitles = true } = {}) {
  return sections
    .filter((section) => String(section.text ?? '').trim() !== '')
    .map((section) => (withTitles ? `${section.title}\n${section.text}` : section.text))
    .join('\n\n');
}

      /* Exporte */
      __exports["cleanupText"] = cleanupText;
      __exports["joinSections"] = joinSections;
  };

  __definitionen["src/engine/renderer.js"] = function (__exports, __require) {
/* ---- src/engine/renderer.js ---- */
/**
 * Rendert einen Vorlagen-Syntaxbaum gegen einen Datensatz.
 *
 * Der Renderer kennt keine medizinische Semantik – er setzt ausschliesslich
 * um, was in den Vorlagen steht. Fehler (unbekannter Filter, kaputte
 * Bedingung) fuehren nie zum Abbruch, sondern werden gesammelt und an die
 * Oberflaeche gemeldet.
 */

const { parseTemplate } = __require("./tokenizer.js");
const { evaluateCondition } = __require("./expression.js");
const { applyFilters } = __require("./format.js");
const { cleanupText } = __require("./cleanup.js");
const { asText, getPath, isTruthy } = __require("./values.js");

const templateCache = new Map();

/** Parst mit Cache – dieselbe Vorlage wird bei jedem Tastendruck gerendert. */
function getParsedTemplate(source) {
  const key = String(source ?? '');
  if (!templateCache.has(key)) templateCache.set(key, parseTemplate(key));
  return templateCache.get(key);
}

function clearTemplateCache() {
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
function render(source, data, options = {}) {
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

      /* Exporte */
      __exports["getParsedTemplate"] = getParsedTemplate;
      __exports["clearTemplateCache"] = clearTemplateCache;
      __exports["render"] = render;
  };

  __definitionen["src/core/derived.js"] = function (__exports, __require) {
/* ---- src/core/derived.js ---- */
/**
 * Abgeleitete Platzhalter.
 *
 * Die Quellvorlagen kodieren geschlechtsabhaengige Formulierungen als
 * Schraegstrich-Alternativen ("in sein/ihr haeusliches Umfeld",
 * "-jaehriger Patient", "der Patient"). Statt dafuer je ein Eingabefeld zu
 * verlangen, werden diese Formen aus der Anrede abgeleitet und stehen in
 * jeder Vorlage als Platzhalter zur Verfuegung.
 *
 * Es entsteht dadurch kein neuer medizinischer Inhalt – nur die im Original
 * bereits vorhandene Alternative wird ausgewaehlt.
 */

const { asText } = __require("../engine/values.js");

/** Beschreibung fuer Editor-Hilfe und Validierung. */
const DERIVED_VARIABLES = [
  { key: 'anrede_name', description: 'Anrede + Nachname im Nominativ, z. B. "Herr Müller"' },
  { key: 'anrede_name_akk', description: 'Akkusativ, z. B. "Herrn Müller" – "Wir entlassen …"' },
  { key: 'anrede_name_dat', description: 'Dativ, z. B. "Herrn Müller" – "Mit … wurden …"' },
  { key: 'anrede_kurz', description: 'Kurzform, z. B. "Hr. Müller"' },
  { key: 'voller_name', description: 'Vorname + Nachname, sofern erfasst' },
  { key: 'patient_wort', description: '"Patient" / "Patientin"' },
  { key: 'patient_nom', description: '"der Patient" / "die Patientin"' },
  { key: 'patient_akk', description: '"den Patienten" / "die Patientin"' },
  { key: 'patient_dat', description: '"dem Patienten" / "der Patientin"' },
  { key: 'patient_gen', description: '"des Patienten" / "der Patientin"' },
  { key: 'patient_poss', description: '"sein" / "ihr" – z. B. "in sein häusliches Umfeld"' },
  { key: 'patient_poss_gen', description: '"seiner" / "ihrer"' },
  { key: 'patient_poss_akk', description: '"seinen" / "ihren"' },
  { key: 'jaehriger', description: '"jähriger" / "jährige" – z. B. "{{alter}}-{{jaehriger}} {{patient_wort}}"' },
  { key: 'ist_weiblich', description: 'Wahrheitswert für eigene Bedingungen' },
];

const DERIVED_KEYS = new Set(DERIVED_VARIABLES.map((entry) => entry.key));

const FEMALE = {
  patient_wort: 'Patientin',
  patient_nom: 'die Patientin',
  patient_akk: 'die Patientin',
  patient_dat: 'der Patientin',
  patient_gen: 'der Patientin',
  patient_poss: 'ihr',
  patient_poss_gen: 'ihrer',
  patient_poss_akk: 'ihren',
  jaehriger: 'jährige',
};

const MALE = {
  patient_wort: 'Patient',
  patient_nom: 'der Patient',
  patient_akk: 'den Patienten',
  patient_dat: 'dem Patienten',
  patient_gen: 'des Patienten',
  patient_poss: 'sein',
  patient_poss_gen: 'seiner',
  patient_poss_akk: 'seinen',
  jaehriger: 'jähriger',
};

/**
 * Erweitert die Formulardaten um die abgeleiteten Platzhalter.
 * Die Originaldaten bleiben unveraendert.
 */
function withDerivedValues(values) {
  const data = { ...(values || {}) };
  const anrede = asText(data.anrede).trim();
  const female = anrede.toLowerCase().startsWith('frau');
  const forms = female ? FEMALE : MALE;

  const nachname = asText(data.nachname).trim();
  const vorname = asText(data.vorname).trim();
  const anredeWort = anrede || (female ? 'Frau' : 'Herr');
  // "Herr" wird in Akkusativ und Dativ zu "Herrn"; "Frau" bleibt unveraendert.
  const anredeWortFlektiert = female ? anredeWort : `${anredeWort}n`;
  const join = (...parts) => parts.filter(Boolean).join(' ');

  Object.assign(data, forms, {
    ist_weiblich: female,
    anrede_name: join(anredeWort, nachname),
    anrede_name_akk: join(anredeWortFlektiert, nachname),
    anrede_name_dat: join(anredeWortFlektiert, nachname),
    anrede_kurz: join(female ? 'Fr.' : 'Hr.', nachname),
    voller_name: join(vorname, nachname) || nachname,
  });

  return data;
}

      /* Exporte */
      __exports["DERIVED_VARIABLES"] = DERIVED_VARIABLES;
      __exports["DERIVED_KEYS"] = DERIVED_KEYS;
      __exports["withDerivedValues"] = withDerivedValues;
  };

  __definitionen["src/core/schema.js"] = function (__exports, __require) {
/* ---- src/core/schema.js ---- */
/**
 * Template-Schema, Normalisierung und Validierung.
 *
 * Schema-Version 3 loest die feste Dreiteilung (Diagnosen/Epikrise/Procedere)
 * des Prototyps ab: Ein Template besteht aus beliebig vielen, sortierbaren
 * Abschnitten und beliebig vielen, klinisch gruppierten Feldern.
 */

const { collectConditions, collectTemplatePaths } = __require("../engine/tokenizer.js");
const { getParsedTemplate } = __require("../engine/renderer.js");
const { collectExpressionPaths, validateExpression } = __require("../engine/expression.js");
const { FILTER_NAMES } = __require("../engine/format.js");
const { DERIVED_KEYS, DERIVED_VARIABLES } = __require("./derived.js");

const SCHEMA_VERSION = 3;

/** Alle unterstuetzten Feldtypen. */
const FIELD_TYPES = {
  text: { label: 'Text (einzeilig)', hasOptions: false },
  multiline: { label: 'Text (mehrzeilig)', hasOptions: false },
  number: { label: 'Zahl', hasOptions: false },
  date: { label: 'Datum', hasOptions: false },
  time: { label: 'Uhrzeit', hasOptions: false },
  month: { label: 'Monat/Jahr', hasOptions: false },
  select: { label: 'Auswahl (Dropdown)', hasOptions: true },
  radio: { label: 'Auswahl (Optionsfelder)', hasOptions: true },
  multiselect: { label: 'Mehrfachauswahl', hasOptions: true },
  checkbox: { label: 'Ja/Nein', hasOptions: false },
  list: { label: 'Wiederholgruppe', hasOptions: false },
};

const FIELD_TYPE_KEYS = Object.keys(FIELD_TYPES);

const ID_PATTERN = /^[a-z][a-z0-9_-]*$/i;
const KEY_PATTERN = /^[a-z][a-z0-9_]*$/i;

/* ------------------------------------------------------------------ */
/* Normalisierung                                                      */
/* ------------------------------------------------------------------ */

/** Bringt eine Option in die Form { value, label }. */
function normaliseOption(option) {
  if (option === null || option === undefined) return null;
  if (typeof option === 'string' || typeof option === 'number') {
    const value = String(option);
    return { value, label: value };
  }
  const value = option.value !== undefined ? String(option.value) : String(option.label ?? '');
  const label = option.label !== undefined ? String(option.label) : value;
  if (value === '' && label === '') return null;
  return { value, label };
}

function normaliseField(raw) {
  const field = {
    key: String(raw?.key ?? '').trim(),
    label: String(raw?.label ?? '').trim(),
    type: FIELD_TYPES[raw?.type] ? raw.type : 'text',
    required: Boolean(raw?.required),
    help: raw?.help ? String(raw.help) : '',
    placeholder: raw?.placeholder ? String(raw.placeholder) : '',
    unit: raw?.unit ? String(raw.unit) : '',
    visibleIf: raw?.visibleIf ? String(raw.visibleIf) : '',
  };

  if (raw?.default !== undefined && raw.default !== null) field.default = raw.default;
  if (raw?.rows) field.rows = Number(raw.rows) || undefined;
  if (raw?.min !== undefined && raw.min !== '') field.min = raw.min;
  if (raw?.max !== undefined && raw.max !== '') field.max = raw.max;
  if (raw?.step !== undefined && raw.step !== '') field.step = raw.step;
  if (raw?.allowCustom) field.allowCustom = true;

  if (FIELD_TYPES[field.type]?.hasOptions) {
    field.options = (Array.isArray(raw?.options) ? raw.options : [])
      .map(normaliseOption)
      .filter(Boolean);
  }

  if (field.type === 'list') {
    field.itemFields = (Array.isArray(raw?.itemFields) ? raw.itemFields : []).map(normaliseField);
    field.itemLabel = raw?.itemLabel ? String(raw.itemLabel) : '';
    field.addLabel = raw?.addLabel ? String(raw.addLabel) : 'Eintrag hinzufügen';
  }

  return field;
}

/**
 * Sortierrang einer Feldgruppe in der Maske. Gemeinsame Gruppen bringen
 * ihren Rang mit (Stammdaten 10 … Procedere 90); vorlageneigene Gruppen
 * liegen standardmaessig dazwischen, direkt nach den Stammdaten.
 */
const DEFAULT_GROUP_ORDER = 50;

function normaliseFieldGroup(raw, index) {
  return {
    id: String(raw?.id ?? `gruppe_${index + 1}`).trim(),
    order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : DEFAULT_GROUP_ORDER,
    title: String(raw?.title ?? `Gruppe ${index + 1}`).trim(),
    description: raw?.description ? String(raw.description) : '',
    visibleIf: raw?.visibleIf ? String(raw.visibleIf) : '',
    fields: (Array.isArray(raw?.fields) ? raw.fields : []).map(normaliseField),
  };
}

function normaliseSection(raw, index) {
  return {
    id: String(raw?.id ?? `abschnitt_${index + 1}`).trim(),
    title: String(raw?.title ?? `Abschnitt ${index + 1}`).trim(),
    order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : index + 1,
    template: String(raw?.template ?? ''),
    help: raw?.help ? String(raw.help) : '',
    enabled: raw?.enabled === undefined ? true : Boolean(raw.enabled),
    visibleIf: raw?.visibleIf ? String(raw.visibleIf) : '',
  };
}

/** Vollstaendige Normalisierung eines Templates auf Schema v3. */
function normaliseTemplate(raw) {
  const template = {
    schemaVersion: SCHEMA_VERSION,
    id: String(raw?.id ?? '').trim(),
    title: String(raw?.title ?? '').trim(),
    group: String(raw?.group ?? 'Ohne Gruppe').trim(),
    source: raw?.source ? String(raw.source) : '',
    description: raw?.description ? String(raw.description) : '',
    sharedGroups: Array.isArray(raw?.sharedGroups) ? raw.sharedGroups.map(String) : [],
    fieldGroups: (Array.isArray(raw?.fieldGroups) ? raw.fieldGroups : []).map(normaliseFieldGroup),
    sections: (Array.isArray(raw?.sections) ? raw.sections : []).map(normaliseSection),
    readOnly: Boolean(raw?.readOnly),
  };
  template.sections.sort((a, b) => a.order - b.order);
  template.sections.forEach((section, index) => { section.order = index + 1; });
  return template;
}

/* ------------------------------------------------------------------ */
/* Felderaufloesung                                                    */
/* ------------------------------------------------------------------ */

/**
 * Liefert die vollstaendige, geordnete Liste der Feldgruppen eines Templates:
 * zuerst die referenzierten gemeinsamen Gruppen, dann die eigenen.
 * @param {object} template
 * @param {Map<string, object>} sharedGroupsById
 */
function resolveFieldGroups(template, sharedGroupsById) {
  const referenced = new Set(template.sharedGroups || []);
  const groups = [];

  for (const [groupId, group] of sharedGroupsById ?? []) {
    if (referenced.has(groupId)) groups.push(group);
  }
  for (const group of template.fieldGroups || []) groups.push(group);

  // Klinische Reihenfolge: Stammdaten und Aufenthalt zuerst, danach die
  // fallspezifischen Gruppen der Vorlage, zuletzt die Standardbloecke bis
  // hin zum Procedere. Bei gleichem Rang bleibt die Eingabereihenfolge.
  return groups
    .map((group, index) => ({ group, index }))
    .sort((a, b) => (a.group.order - b.group.order) || (a.index - b.index))
    .map((entry) => entry.group);
}

/** Flache Liste aller Felder eines Templates. */
function resolveFields(template, sharedGroupsById) {
  return resolveFieldGroups(template, sharedGroupsById).flatMap((group) => group.fields);
}

/** Alle Feldschluessel, die in Vorlagentexten verwendet werden duerfen. */
function knownKeys(template, sharedGroupsById) {
  const keys = new Set(DERIVED_KEYS);
  for (const field of resolveFields(template, sharedGroupsById)) {
    keys.add(field.key);
    // Unterfelder sind nur innerhalb von {{#each}} sichtbar und werden dort
    // ueber `this.` bzw. den Alias adressiert – sie gelten hier nicht als
    // eigenstaendige Wurzelschluessel.
  }
  return keys;
}

/** Standardwerte eines Templates als Datensatz. */
function defaultValues(template, sharedGroupsById) {
  const values = {};
  for (const field of resolveFields(template, sharedGroupsById)) {
    values[field.key] = defaultValueForField(field);
  }
  return values;
}

function defaultValueForField(field) {
  if (field.default !== undefined) {
    if (field.type === 'multiselect') return Array.isArray(field.default) ? [...field.default] : [String(field.default)];
    if (field.type === 'checkbox') return Boolean(field.default);
    if (field.type === 'list') return Array.isArray(field.default) ? field.default.map((entry) => ({ ...entry })) : [];
    return field.default;
  }
  switch (field.type) {
    case 'multiselect': return [];
    case 'checkbox': return false;
    case 'list': return [];
    default: return '';
  }
}

/* ------------------------------------------------------------------ */
/* Validierung                                                         */
/* ------------------------------------------------------------------ */

/**
 * Prueft ein Template auf strukturelle Gueltigkeit.
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateTemplate(template, { existingIds = [], sharedGroupsById = new Map() } = {}) {
  const errors = [];
  const warnings = [];

  if (!template.id) errors.push('Die Template-ID darf nicht leer sein.');
  else if (!ID_PATTERN.test(template.id)) {
    errors.push(`Ungültige Template-ID "${template.id}". Erlaubt: Buchstabe am Anfang, danach Buchstaben, Ziffern, "_" und "-".`);
  }
  if (existingIds.includes(template.id)) errors.push(`Die Template-ID "${template.id}" ist bereits vergeben.`);
  if (!template.title) errors.push('Der Template-Titel darf nicht leer sein.');
  if (!template.sections.length) errors.push('Ein Template braucht mindestens einen Abschnitt.');

  // Abschnitte
  const sectionIds = new Set();
  for (const section of template.sections) {
    if (!section.id) errors.push('Ein Abschnitt ohne ID ist nicht zulässig.');
    else if (!ID_PATTERN.test(section.id)) errors.push(`Ungültige Abschnitts-ID "${section.id}".`);
    else if (sectionIds.has(section.id)) errors.push(`Doppelte Abschnitts-ID "${section.id}".`);
    sectionIds.add(section.id);
    if (!section.title) warnings.push(`Abschnitt "${section.id}" hat keinen Titel.`);
  }

  // Feldschluessel
  const groups = resolveFieldGroups(template, sharedGroupsById);
  const seenKeys = new Map();
  for (const group of groups) {
    for (const field of group.fields) {
      validateFieldShape(field, group, errors, warnings);
      if (seenKeys.has(field.key)) {
        const other = seenKeys.get(field.key);
        if (other !== group.id) {
          warnings.push(`Feldschlüssel "${field.key}" kommt in "${other}" und "${group.id}" vor – es wird nur ein Wert geführt.`);
        } else {
          errors.push(`Doppelter Feldschlüssel "${field.key}" in Gruppe "${group.id}".`);
        }
      }
      seenKeys.set(field.key, group.id);
      if (DERIVED_KEYS.has(field.key)) {
        errors.push(`Der Feldschlüssel "${field.key}" ist reserviert (abgeleiteter Platzhalter).`);
      }
    }
  }

  // Vorlagentexte
  const available = knownKeys(template, sharedGroupsById);
  const listItemKeys = new Map();
  for (const group of groups) {
    for (const field of group.fields) {
      if (field.type === 'list') listItemKeys.set(field.key, new Set(field.itemFields.map((item) => item.key)));
    }
  }

  for (const section of template.sections) {
    const parsed = getParsedTemplate(section.template);
    for (const message of parsed.errors) {
      errors.push(`Abschnitt "${section.title || section.id}": ${message}`);
    }

    for (const path of collectTemplatePaths(parsed.nodes)) {
      if (!available.has(path)) {
        warnings.push(`Abschnitt "${section.title || section.id}": Platzhalter {{${path}}} hat kein zugehöriges Feld.`);
      }
    }

    for (const { expression, aliases } of collectConditions(parsed.nodes)) {
      const syntaxError = validateExpression(expression);
      if (syntaxError) {
        errors.push(`Abschnitt "${section.title || section.id}": ungültige Bedingung "${expression}" – ${syntaxError}`);
        continue;
      }
      for (const path of collectExpressionPaths(expression)) {
        if (available.has(path) || aliases.has(path) || path === 'this' || path.startsWith('@')) continue;
        warnings.push(`Abschnitt "${section.title || section.id}": Bedingung verwendet unbekanntes Feld "${path}".`);
      }
    }

    // Filternamen
    for (const filterName of collectFilterNames(parsed.nodes)) {
      if (!FILTER_NAMES.includes(filterName)) {
        errors.push(`Abschnitt "${section.title || section.id}": unbekannter Filter "${filterName}".`);
      }
    }

    if (section.visibleIf) {
      const syntaxError = validateExpression(section.visibleIf);
      if (syntaxError) errors.push(`Abschnitt "${section.title || section.id}": ungültige Sichtbarkeitsregel – ${syntaxError}`);
    }
  }

  // Ungenutzte Felder melden (Hinweis, kein Fehler)
  const usedPaths = new Set();
  for (const section of template.sections) {
    const parsed = getParsedTemplate(section.template);
    collectTemplatePaths(parsed.nodes, usedPaths);
    for (const { expression } of collectConditions(parsed.nodes)) {
      for (const path of collectExpressionPaths(expression)) usedPaths.add(path);
    }
  }
  for (const group of template.fieldGroups) {
    for (const field of group.fields) {
      if (!usedPaths.has(field.key)) {
        warnings.push(`Feld "${field.label || field.key}" (${field.key}) wird in keinem Abschnitt verwendet.`);
      }
    }
  }

  return { errors, warnings };
}

function validateFieldShape(field, group, errors, warnings) {
  const where = `Gruppe "${group.title || group.id}"`;
  if (!field.key) { errors.push(`${where}: Feld ohne Schlüssel.`); return; }
  if (!KEY_PATTERN.test(field.key)) {
    errors.push(`${where}: ungültiger Feldschlüssel "${field.key}" (erlaubt: Buchstabe, dann Buchstaben/Ziffern/Unterstrich).`);
  }
  if (!field.label) warnings.push(`${where}: Feld "${field.key}" hat keine Beschriftung.`);
  if (FIELD_TYPES[field.type]?.hasOptions && (!field.options || field.options.length === 0)) {
    errors.push(`${where}: Feld "${field.key}" ist vom Typ "${field.type}", hat aber keine Optionen.`);
  }
  if (field.type === 'list' && (!field.itemFields || field.itemFields.length === 0)) {
    errors.push(`${where}: Wiederholgruppe "${field.key}" hat keine Unterfelder.`);
  }
  if (field.visibleIf) {
    const syntaxError = validateExpression(field.visibleIf);
    if (syntaxError) errors.push(`${where}: Feld "${field.key}" hat eine ungültige Sichtbarkeitsregel – ${syntaxError}`);
  }
  for (const itemField of field.itemFields || []) {
    validateFieldShape(itemField, { id: `${group.id}.${field.key}`, title: `${group.title} → ${field.label}` }, errors, warnings);
  }
}

function collectFilterNames(nodes, found = new Set()) {
  for (const node of nodes || []) {
    if (node.type === 'var') {
      for (const filter of node.filters || []) found.add(filter.name);
    } else if (node.type === 'if') {
      for (const branch of node.branches) collectFilterNames(branch.children, found);
    } else if (node.children) {
      collectFilterNames(node.children, found);
    }
  }
  return found;
}

      /* Exporte */
      __exports["SCHEMA_VERSION"] = SCHEMA_VERSION;
      __exports["FIELD_TYPES"] = FIELD_TYPES;
      __exports["FIELD_TYPE_KEYS"] = FIELD_TYPE_KEYS;
      __exports["normaliseOption"] = normaliseOption;
      __exports["normaliseField"] = normaliseField;
      __exports["DEFAULT_GROUP_ORDER"] = DEFAULT_GROUP_ORDER;
      __exports["normaliseFieldGroup"] = normaliseFieldGroup;
      __exports["normaliseSection"] = normaliseSection;
      __exports["normaliseTemplate"] = normaliseTemplate;
      __exports["resolveFieldGroups"] = resolveFieldGroups;
      __exports["resolveFields"] = resolveFields;
      __exports["knownKeys"] = knownKeys;
      __exports["defaultValues"] = defaultValues;
      __exports["defaultValueForField"] = defaultValueForField;
      __exports["validateTemplate"] = validateTemplate;
      __exports["DERIVED_VARIABLES"] = DERIVED_VARIABLES;
  };

  __definitionen["src/core/storage.js"] = function (__exports, __require) {
/* ---- src/core/storage.js ---- */
/**
 * Persistenz im localStorage – inklusive Migration der Daten aus dem
 * Prototypen.
 *
 * Datenschutz: Standardmaessig werden ausschliesslich *Vorlagen* gespeichert,
 * niemals Patienteneingaben. Das Zwischenspeichern von Eingaben ist ein
 * ausdrueckliches Opt-in (`settings.persistValues`) und jederzeit mit einem
 * Klick loeschbar.
 */

const { SCHEMA_VERSION, normaliseTemplate } = __require("./schema.js");

const STORAGE_KEY = 'arztbrief_daten_v3';
const LEGACY_KEYS = ['arztbrief_templates_all_v2', 'arztbrief_templates_all'];

const DEFAULT_SETTINGS = {
  /** Live-Vorschau bei jeder Eingabe aktualisieren. */
  autoPreview: true,
  /** Eingaben lokal zwischenspeichern (Opt-in, standardmaessig aus). */
  persistValues: false,
  /** Abschnittsueberschriften in den Gesamtbrief uebernehmen. */
  sectionTitlesInOutput: true,
};

function emptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    templates: [],
    hiddenBuiltins: [],
    settings: { ...DEFAULT_SETTINGS },
    values: {},
    activeTemplateId: '',
  };
}

/* ------------------------------------------------------------------ */
/* Speicherzugriff                                                     */
/* ------------------------------------------------------------------ */

function safeStorage() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__arztbrief_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * Laedt den gespeicherten Zustand und migriert ihn bei Bedarf.
 * @returns {{ state: object, notices: string[] }}
 */
function loadState() {
  const notices = [];
  const storage = safeStorage();
  if (!storage) {
    notices.push('Kein Zugriff auf den lokalen Speicher – Vorlagen werden nur für diese Sitzung gehalten.');
    return { state: emptyState(), notices };
  }

  const raw = storage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return { state: sanitiseState(JSON.parse(raw)), notices };
    } catch {
      notices.push('Die gespeicherten Daten konnten nicht gelesen werden. Es wird mit den mitgelieferten Vorlagen gestartet; die defekten Daten bleiben unter einem Sicherungsschlüssel erhalten.');
      try { storage.setItem(`${STORAGE_KEY}__defekt_${Date.now()}`, raw); } catch { /* Speicher voll – Sicherung entfällt */ }
      return { state: emptyState(), notices };
    }
  }

  const migrated = migrateLegacy(storage, notices);
  if (migrated) return { state: migrated, notices };

  return { state: emptyState(), notices };
}

/** Schreibt den Zustand. Liefert `null` bei Erfolg, sonst eine Meldung. */
function saveState(state) {
  const storage = safeStorage();
  if (!storage) return 'Kein Zugriff auf den lokalen Speicher – Änderungen gelten nur für diese Sitzung.';

  const payload = {
    schemaVersion: SCHEMA_VERSION,
    templates: state.templates,
    hiddenBuiltins: state.hiddenBuiltins,
    settings: state.settings,
    activeTemplateId: state.activeTemplateId,
    values: state.settings?.persistValues ? state.values : {},
  };

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return null;
  } catch (error) {
    if (error && error.name === 'QuotaExceededError') {
      return 'Der lokale Speicher ist voll. Bitte nicht mehr benötigte Vorlagen löschen oder exportieren.';
    }
    return `Speichern fehlgeschlagen: ${error?.message ?? error}`;
  }
}

/** Entfernt alle App-Daten aus dem lokalen Speicher. */
function clearStorage() {
  const storage = safeStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
  for (const key of LEGACY_KEYS) storage.removeItem(key);
}

/* ------------------------------------------------------------------ */
/* Bereinigung / Migration                                             */
/* ------------------------------------------------------------------ */

function sanitiseState(raw) {
  const state = emptyState();
  if (!raw || typeof raw !== 'object') return state;

  state.templates = (Array.isArray(raw.templates) ? raw.templates : [])
    .map((entry) => (entry?.schemaVersion === SCHEMA_VERSION ? normaliseTemplate(entry) : migrateTemplate(entry)))
    .filter((entry) => entry && entry.id);

  state.hiddenBuiltins = (Array.isArray(raw.hiddenBuiltins) ? raw.hiddenBuiltins : []).map(String);
  state.settings = { ...DEFAULT_SETTINGS, ...(raw.settings && typeof raw.settings === 'object' ? raw.settings : {}) };
  state.values = raw.values && typeof raw.values === 'object' ? raw.values : {};
  state.activeTemplateId = raw.activeTemplateId ? String(raw.activeTemplateId) : '';
  return state;
}

function migrateLegacy(storage, notices) {
  for (const key of LEGACY_KEYS) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    let parsed;
    try { parsed = JSON.parse(raw); } catch { continue; }
    if (!parsed || !Array.isArray(parsed.templates)) continue;

    const state = emptyState();
    state.templates = parsed.templates.map(migrateTemplate).filter((entry) => entry && entry.id);
    if (state.templates.length === 0) continue;

    notices.push(`${state.templates.length} Vorlage(n) aus der Vorversion wurden übernommen (Speicherschlüssel "${key}"). Die alten Daten bleiben unverändert erhalten.`);
    saveState(state);
    return state;
  }
  return null;
}

/**
 * Wandelt ein Template des Prototypen (drei feste Ausgabefelder, flache
 * Variablenliste) in Schema v3 um. Keine inhaltliche Aenderung: Texte und
 * Platzhalter werden unveraendert uebernommen.
 */
function migrateTemplate(legacy) {
  if (!legacy || typeof legacy !== 'object') return null;
  if (legacy.schemaVersion === SCHEMA_VERSION) return normaliseTemplate(legacy);

  const output = legacy.output && typeof legacy.output === 'object' ? legacy.output : {};
  const positions = [
    { id: 'diagnosen', title: 'Diagnosen' },
    { id: 'epikrise', title: 'Epikrise' },
    { id: 'procedere', title: 'Procedere' },
  ];

  const variables = Array.isArray(legacy.variables) ? legacy.variables : [];
  const byPosition = new Map(positions.map((position) => [position.id, []]));
  const extra = [];

  for (const variable of variables) {
    const field = migrateVariable(variable);
    if (!field) continue;
    const target = byPosition.get(String(variable.position));
    (target ?? extra).push({ field, order: Number(variable.order) });
  }

  const sortByOrder = (a, b) => {
    const left = Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER;
    const right = Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER;
    return left - right;
  };

  const fieldGroups = [];
  for (const position of positions) {
    const entries = (byPosition.get(position.id) || []).sort(sortByOrder);
    if (entries.length) {
      fieldGroups.push({
        id: `felder_${position.id}`,
        title: `Angaben für ${position.title}`,
        fields: entries.map((entry) => entry.field),
      });
    }
  }
  if (extra.length) {
    fieldGroups.push({
      id: 'felder_sonstige',
      title: 'Weitere Angaben',
      fields: extra.sort(sortByOrder).map((entry) => entry.field),
    });
  }

  const sections = positions
    .filter((position) => typeof output[position.id] === 'string')
    .map((position, index) => ({
      id: position.id,
      title: position.title,
      order: index + 1,
      template: output[position.id],
    }));

  return normaliseTemplate({
    id: legacy.id,
    title: legacy.title || legacy.id,
    group: 'Aus Vorversion übernommen',
    source: 'Migration aus dem Prototyp (Schema v2)',
    description: 'Automatisch aus der Vorgängerversion übernommen. Struktur und Texte sind unverändert.',
    fieldGroups,
    sections,
  });
}

const LEGACY_TYPE_MAP = {
  text: 'text',
  number: 'number',
  select: 'select',
  date: 'date',
  boolean: 'checkbox',
  multiline: 'multiline',
};

function migrateVariable(variable) {
  if (!variable || !variable.key) return null;
  const type = LEGACY_TYPE_MAP[variable.type] || 'text';
  const field = {
    key: String(variable.key),
    label: String(variable.label || variable.key),
    type,
  };
  if (type === 'select') field.options = Array.isArray(variable.options) ? variable.options : [];
  if (variable.default !== undefined && variable.default !== '') {
    // Der Prototyp kodierte Wahrheitswerte als "ja"/"nein".
    field.default = type === 'checkbox' ? String(variable.default).toLowerCase() === 'ja' : variable.default;
  }
  return field;
}

      /* Exporte */
      __exports["STORAGE_KEY"] = STORAGE_KEY;
      __exports["LEGACY_KEYS"] = LEGACY_KEYS;
      __exports["DEFAULT_SETTINGS"] = DEFAULT_SETTINGS;
      __exports["loadState"] = loadState;
      __exports["saveState"] = saveState;
      __exports["clearStorage"] = clearStorage;
      __exports["migrateTemplate"] = migrateTemplate;
  };

  __definitionen["src/core/store.js"] = function (__exports, __require) {
/* ---- src/core/store.js ---- */
/**
 * Zentraler Anwendungszustand.
 *
 * Der Store haelt alle Daten an einer Stelle und benachrichtigt die
 * Oberflaechen-Module ueber Aenderungen. Er kennt kein DOM.
 */

const { DEFAULT_SETTINGS, loadState, saveState, clearStorage } = __require("./storage.js");
const { defaultValueForField, normaliseTemplate, resolveFields } = __require("./schema.js");

function createStore({ builtinTemplates = [], sharedGroups = [] } = {}) {
  const sharedGroupsById = new Map(sharedGroups.map((group) => [group.id, group]));
  const builtinById = new Map(builtinTemplates.map((template) => [template.id, template]));

  const { state: persisted, notices } = loadState();

  const state = {
    settings: { ...DEFAULT_SETTINGS, ...persisted.settings },
    customTemplates: persisted.templates,
    hiddenBuiltins: new Set(persisted.hiddenBuiltins),
    values: { ...persisted.values },
    activeTemplateId: persisted.activeTemplateId,
    /** Abschnitts-IDs, deren Text der Anwender manuell geaendert hat. */
    manualSections: new Map(),
    notices: [...notices],
  };

  const listeners = new Set();
  let saveError = null;

  /* ---------------------------------------------------------------- */
  /* Templates                                                         */
  /* ---------------------------------------------------------------- */

  function listTemplates() {
    const merged = new Map();
    for (const template of builtinTemplates) {
      if (!state.hiddenBuiltins.has(template.id)) merged.set(template.id, template);
    }
    for (const template of state.customTemplates) merged.set(template.id, template);
    return [...merged.values()].sort((a, b) => {
      const byGroup = String(a.group).localeCompare(String(b.group), 'de');
      return byGroup !== 0 ? byGroup : String(a.title).localeCompare(String(b.title), 'de');
    });
  }

  function getTemplate(id) {
    return listTemplates().find((template) => template.id === id) ?? null;
  }

  function getActiveTemplate() {
    const templates = listTemplates();
    if (!templates.length) return null;
    return getTemplate(state.activeTemplateId) ?? templates[0];
  }

  function isBuiltin(id) { return builtinById.has(id); }
  function isModifiedBuiltin(id) {
    return builtinById.has(id) && state.customTemplates.some((template) => template.id === id);
  }

  /* ---------------------------------------------------------------- */
  /* Aenderungen                                                       */
  /* ---------------------------------------------------------------- */

  function persist() {
    saveError = saveState({
      templates: state.customTemplates,
      hiddenBuiltins: [...state.hiddenBuiltins],
      settings: state.settings,
      values: state.values,
      activeTemplateId: state.activeTemplateId,
    });
  }

  function notify(reason) {
    for (const listener of listeners) listener(reason);
  }

  function commit(reason, { persistNow = true } = {}) {
    if (persistNow) persist();
    notify(reason);
  }

  /**
   * Ergaenzt fehlende Werte um die Standardwerte des aktiven Templates.
   * Bereits eingegebene Werte bleiben unangetastet, damit ein Vorlagenwechsel
   * die Patientenstammdaten nicht verwirft.
   */
  function applyDefaultsForMissingValues() {
    const template = getActiveTemplate();
    if (!template) return;
    for (const field of resolveFields(template, sharedGroupsById)) {
      if (state.values[field.key] === undefined) {
        state.values[field.key] = defaultValueForField(field);
      }
    }
  }

  applyDefaultsForMissingValues();

  return {
    /* Abonnements */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /* Lesezugriff */
    get settings() { return state.settings; },
    get values() { return state.values; },
    get notices() { return state.notices; },
    get saveError() { return saveError; },
    get sharedGroupsById() { return sharedGroupsById; },
    listTemplates,
    getTemplate,
    getActiveTemplate,
    isBuiltin,
    isModifiedBuiltin,
    isBuiltinHidden: (id) => state.hiddenBuiltins.has(id),
    listHiddenBuiltins: () => [...state.hiddenBuiltins],

    consumeNotices() {
      const current = [...state.notices];
      state.notices = [];
      return current;
    },

    /* Template-Auswahl */
    setActiveTemplate(id) {
      if (state.activeTemplateId === id) return;
      state.activeTemplateId = id;
      state.manualSections = new Map();
      applyDefaultsForMissingValues();
      commit('template');
    },

    /* Werte */
    setValue(key, value) {
      state.values[key] = value;
      commit('values', { persistNow: state.settings.persistValues });
    },

    setValues(patch) {
      Object.assign(state.values, patch);
      commit('values', { persistNow: state.settings.persistValues });
    },

    resetValues() {
      state.values = {};
      state.manualSections = new Map();
      applyDefaultsForMissingValues();
      // Grund "reset" statt "values": Die Maske muss neu aufgebaut werden,
      // sonst zeigen die Eingabefelder weiterhin die alten Texte an, obwohl
      // der Datensatz bereits leer ist. Bei "values" wird bewusst nicht neu
      // gerendert, damit das Tippen den Fokus behält.
      commit('reset');
    },

    /* Manuelle Nachbearbeitung der Ausgabe */
    getManualEntry(sectionId) { return state.manualSections.get(sectionId) ?? null; },
    getManualSections() { return new Map(state.manualSections); },
    hasManualEdits() { return state.manualSections.size > 0; },
    listManualSections() { return [...state.manualSections.keys()]; },
    /**
     * @param {string} sectionId
     * @param {string} text     der von Hand bearbeitete Text
     * @param {string} basedOn  der generierte Text, auf dem die Bearbeitung
     *                          beruht – daran wird erkannt, ob die Vorlage
     *                          sich seither geaendert hat
     */
    setManualText(sectionId, text, basedOn) {
      const existing = state.manualSections.get(sectionId);
      state.manualSections.set(sectionId, { text, basedOn: basedOn ?? existing?.basedOn ?? '' });
      notify('manual');
    },
    discardManualText(sectionId) {
      if (sectionId === undefined) state.manualSections = new Map();
      else state.manualSections.delete(sectionId);
      notify('manual');
    },

    /* Einstellungen */
    updateSettings(patch) {
      Object.assign(state.settings, patch);
      if (!state.settings.persistValues) state.values = { ...state.values };
      commit('settings');
    },

    /* Template-CRUD */
    saveTemplate(raw) {
      const template = normaliseTemplate(raw);
      const index = state.customTemplates.findIndex((entry) => entry.id === template.id);
      if (index === -1) state.customTemplates.push(template);
      else state.customTemplates[index] = template;
      state.activeTemplateId = template.id;
      applyDefaultsForMissingValues();
      commit('templates');
      return template;
    },

    deleteTemplate(id) {
      state.customTemplates = state.customTemplates.filter((template) => template.id !== id);
      if (builtinById.has(id)) state.hiddenBuiltins.add(id);
      if (state.activeTemplateId === id) state.activeTemplateId = '';
      commit('templates');
    },

    /** Setzt eine ueberschriebene oder ausgeblendete mitgelieferte Vorlage zurueck. */
    restoreBuiltin(id) {
      if (!builtinById.has(id)) return false;
      state.hiddenBuiltins.delete(id);
      state.customTemplates = state.customTemplates.filter((template) => template.id !== id);
      commit('templates');
      return true;
    },

    replaceAllTemplates(templates) {
      state.customTemplates = templates.map(normaliseTemplate);
      commit('templates');
    },

    addTemplates(templates) {
      for (const raw of templates) {
        const template = normaliseTemplate(raw);
        const index = state.customTemplates.findIndex((entry) => entry.id === template.id);
        if (index === -1) state.customTemplates.push(template);
        else state.customTemplates[index] = template;
      }
      commit('templates');
    },

    get customTemplates() { return state.customTemplates; },

    clearAll() {
      clearStorage();
      state.customTemplates = [];
      state.hiddenBuiltins = new Set();
      state.values = {};
      state.manualSections = new Map();
      state.settings = { ...DEFAULT_SETTINGS };
      state.activeTemplateId = '';
      // Bewusst ohne persist(): Nach "Alle lokal gespeicherten Daten löschen"
      // soll der Speicher tatsächlich leer bleiben und nicht sofort wieder
      // mit einem Standardzustand beschrieben werden.
      saveError = null;
      notify('reset');
    },
  };
}

      /* Exporte */
      __exports["createStore"] = createStore;
  };

  __definitionen["src/data/fields.js"] = function (__exports, __require) {
/* ---- src/data/fields.js ---- */
/**
 * Gemeinsame Feldgruppen.
 *
 * Diese Felder wiederholen sich in nahezu jeder Vorlage. Sie werden einmal
 * definiert und von den Templates ueber `sharedGroups: ['stammdaten', …]`
 * referenziert. Dadurch bleiben eingegebene Stammdaten beim Wechsel der
 * Vorlage erhalten.
 *
 * Alle Optionswerte sind woertlich aus den Quelldokumenten uebernommen
 * (siehe DOCS/QUELLTEXTE.md).
 */

const { normaliseFieldGroup } = __require("../core/schema.js");

/** Belegstelle: Textbausteine_Kardio.docx, Abschnitt "Kardiovaskuläre Risikofaktoren". */
const RISIKOFAKTOREN = [
  'Arterielle Hypertonie',
  'Adipositas',
  'Nikotinabusus',
  'Diabetes Mellitus',
  'Hypercholesterinämie',
  'Hyperlipoproteinämie',
  'Hyperurikämie',
  'positive Familienanamnese',
];

/** Belegstellen: "hochgradiger LAD/RCA/RCX-Stenose", "Verschluss der LAD/RCX/RCA". */
const KORONARGEFAESSE = ['LAD', 'RCX', 'RCA', 'Hauptstamm', 'Ramus diagonalis', 'Ramus marginalis', 'Ramus intermedius'];

const P2Y12 = ['Clopidogrel', 'Prasugrel', 'Ticagrelor'];

const RAW_GROUPS = [
  {
    id: 'stammdaten',
    order: 10,
    title: 'Patientenstammdaten',
    description: 'Steuert zugleich die geschlechtsabhängigen Formulierungen („sein/ihr", „der Patient/die Patientin").',
    fields: [
      {
        key: 'anrede',
        label: 'Anrede',
        type: 'select',
        required: true,
        default: 'Herr',
        options: ['Herr', 'Frau'],
        help: 'Bestimmt alle geschlechtsabhängigen Formulierungen im Brief.',
      },
      { key: 'nachname', label: 'Nachname', type: 'text', required: true, placeholder: 'z. B. Müller' },
      { key: 'vorname', label: 'Vorname', type: 'text', help: 'Nur für Vorlagen, die den vollen Namen nennen.' },
      { key: 'alter', label: 'Alter', type: 'number', unit: 'Jahre', min: 0, max: 120 },
      { key: 'groesse_cm', label: 'Größe', type: 'number', unit: 'cm', min: 0, max: 250 },
      { key: 'gewicht_kg', label: 'Gewicht', type: 'number', unit: 'kg', min: 0, max: 400 },
    ],
  },
  {
    id: 'aufenthalt',
    order: 20,
    title: 'Aufenthalt',
    fields: [
      { key: 'aufnahme_datum', label: 'Aufnahmedatum', type: 'date', required: true },
      { key: 'entlass_datum', label: 'Entlassdatum', type: 'date', required: true },
      {
        key: 'entlass_az',
        label: 'Allgemeinzustand bei Entlassung',
        type: 'select',
        required: true,
        default: 'gutem',
        options: [
          { value: 'gutem', label: 'gutem Allgemeinzustand' },
          { value: 'stabilem', label: 'stabilem Allgemeinzustand' },
          { value: 'deutlich gebessertem', label: 'deutlich gebessertem Allgemeinzustand' },
        ],
        help: 'Beleg: „in gutem/stabilem Allgemeinzustand" (Musterarztbriefe).',
      },
    ],
  },
  {
    id: 'risikofaktoren',
    order: 60,
    title: 'Kardiovaskuläre Risikofaktoren',
    description: 'Belegstelle: Textbausteine_Kardio.docx, Kopfabschnitt.',
    fields: [
      {
        key: 'kv_risikofaktoren',
        label: 'Risikofaktoren',
        type: 'multiselect',
        options: RISIKOFAKTOREN,
        help: 'Mehrfachauswahl; erscheint als Aufzählung im Abschnitt „Kardiovaskuläre Risikofaktoren".',
      },
      {
        key: 'nikotin_py',
        label: 'Nikotinabusus',
        type: 'number',
        unit: 'py',
        visibleIf: 'kv_risikofaktoren contains "Nikotinabusus"',
        help: 'Beleg: „Nikotinabusus (XX py)".',
      },
      {
        key: 'diabetes_typ',
        label: 'Diabetes-Typ',
        type: 'select',
        options: ['I', 'II'],
        visibleIf: 'kv_risikofaktoren contains "Diabetes Mellitus"',
        help: 'Beleg: „Diabetes Mellitus Typ I/II".',
      },
    ],
  },
  {
    id: 'vordiagnosen',
    order: 62,
    title: 'Relevante Vordiagnosen',
    fields: [
      {
        key: 'vordiagnosen',
        label: 'Vordiagnosen',
        type: 'list',
        addLabel: 'Vordiagnose hinzufügen',
        itemLabel: '{{this.text}}',
        itemFields: [
          { key: 'text', label: 'Diagnose', type: 'text', required: true, placeholder: 'z. B. Arterielle Hypertonie' },
        ],
      },
    ],
  },
  {
    id: 'anamnese_untersuchung',
    order: 64,
    title: 'Anamnese und Untersuchung',
    fields: [
      { key: 'anamnese', label: 'Anamnese', type: 'multiline', rows: 5, help: 'Freitext; Bausteine über die Bausteinbibliothek einfügbar.' },
      {
        key: 'ku_variante',
        label: 'Körperlicher Untersuchungsbefund',
        type: 'select',
        default: '',
        options: [
          { value: '', label: '– kein Standardbefund –' },
          { value: 'ausfuehrlich', label: 'Ausführlicher Standardbefund' },
          { value: 'kurz', label: 'Kurzform' },
        ],
        help: 'Wörtlich aus Textbausteine_Kardio.docx.',
      },
      {
        key: 'ku_rhythmus',
        label: 'Herzaktion',
        type: 'select',
        default: 'rhythmisch',
        options: ['rhythmisch', 'arrhythmisch'],
        visibleIf: 'ku_variante == "kurz"',
        help: 'Beleg: Kurzbefund „auskultatorisch rein, rhythmisch" bzw. „arrhythmisch" (EPU bei VHF).',
      },
      { key: 'ku_zusatz', label: 'Ergänzung zum Untersuchungsbefund', type: 'multiline', rows: 3 },
      {
        key: 'veg_anamnese',
        label: 'Vegetative Anamnese ergänzen',
        type: 'checkbox',
        help: 'Fügt den Standardtext aus Textbausteine_Kardio.docx ein.',
      },
    ],
  },
  {
    id: 'befunde',
    order: 66,
    title: 'Befunde',
    fields: [
      {
        key: 'befund_datum',
        label: 'Befunddatum für Bausteine',
        type: 'date',
        help: 'Wird von Bausteinen verwendet, die „vom XX.XX.XXXX" enthalten.',
      },
      { key: 'ekg_aufnahme', label: 'EKG bei Aufnahme', type: 'multiline', rows: 2, placeholder: 'SR/VHF, HF /min, XT, R/S-Umschlag in V / V, keine signifikanten ERBS' },
      { key: 'labor_auffaellig', label: 'Pathologische Laborwerte bei Aufnahme', type: 'multiline', rows: 2 },
      { key: 'echo_befund', label: 'Echokardiographie', type: 'multiline', rows: 3 },
      { key: 'weitere_befunde', label: 'Weitere technische Befunde', type: 'multiline', rows: 4, help: 'Bausteine (LZ-EKG, LZ-RR, Lungenfunktion …) über die Bausteinbibliothek einfügbar.' },
    ],
  },
  {
    id: 'therapieempfehlung',
    order: 80,
    title: 'Therapieempfehlung',
    fields: [
      {
        key: 'medikation',
        label: 'Medikation bei Entlassung',
        type: 'list',
        addLabel: 'Medikament hinzufügen',
        itemLabel: '{{this.wirkstoff}} {{this.staerke}} {{this.schema}}',
        itemFields: [
          { key: 'wirkstoff', label: 'Wirkstoff / Präparat', type: 'text', required: true },
          { key: 'staerke', label: 'Stärke', type: 'text', placeholder: 'z. B. 5 mg' },
          { key: 'schema', label: 'Einnahmeschema', type: 'text', placeholder: 'z. B. 1-0-0' },
          { key: 'hinweis', label: 'Hinweis', type: 'text' },
        ],
      },
      { key: 'therapieempfehlung_text', label: 'Ergänzende Therapieempfehlung', type: 'multiline', rows: 3 },
    ],
  },
  {
    id: 'procedere_frei',
    order: 90,
    title: 'Procedere – zusätzliche Zeilen',
    fields: [
      {
        key: 'procedere_zusatz',
        label: 'Weitere Procedere-Punkte',
        type: 'list',
        addLabel: 'Punkt hinzufügen',
        itemLabel: '{{this.text}}',
        itemFields: [
          { key: 'text', label: 'Text', type: 'text', required: true },
        ],
      },
    ],
  },
];

const SHARED_FIELD_GROUPS = RAW_GROUPS.map(normaliseFieldGroup);

const SHARED_GROUPS_BY_ID = new Map(SHARED_FIELD_GROUPS.map((group) => [group.id, group]));

      /* Exporte */
      __exports["RISIKOFAKTOREN"] = RISIKOFAKTOREN;
      __exports["KORONARGEFAESSE"] = KORONARGEFAESSE;
      __exports["P2Y12"] = P2Y12;
      __exports["SHARED_FIELD_GROUPS"] = SHARED_FIELD_GROUPS;
      __exports["SHARED_GROUPS_BY_ID"] = SHARED_GROUPS_BY_ID;
  };

  __definitionen["src/data/sectionBlocks.js"] = function (__exports, __require) {
/* ---- src/data/sectionBlocks.js ---- */
/**
 * Wiederverwendbare Abschnittstexte.
 *
 * Diese Bloecke gehoeren zu den gemeinsamen Feldgruppen aus `fields.js` und
 * werden von den ausfuehrlichen Vorlagen (Quelle: Textbausteine_Kardio.docx)
 * zusammengesetzt. Der Wortlaut stammt unveraendert aus dem Quelldokument.
 */

/** Kopfzeile "-jähriger Patient in gutem Allgemein- und normalem Ernährungszustand (Größe cm, Gewicht kg)". */
const KU_KOPF = '{{#if alter}}{{alter}}-{{jaehriger}} {{/if}}{{patient_wort}} in gutem Allgemein- und normalem Ernährungszustand'
  + '{{#if groesse_cm or gewicht_kg}} ({{#if groesse_cm}}Größe {{groesse_cm}} cm{{/if}}{{#if groesse_cm and gewicht_kg}}, {{/if}}'
  + '{{#if gewicht_kg}}Gewicht {{gewicht_kg}} kg{{/if}}){{/if}}';

const KU_AUSFUEHRLICH = `${KU_KOPF}, wach und zu allen Qualitäten orientiert. Kein Ikterus, keine Zyanose. Schleimhäute feucht. Schilddrüse schluckverschieblich.
Cor: Herztöne rein, rhythmisch, normofrequente Herzaktion, keine vitientypischen Geräusche auskultierbar, Jugularvenen nicht gestaut, kein peripheres Pulsdefizit, periphere Pulse gut tastbar, keine peripheren Ödeme.
Pulmo: vesikuläres Atemgeräusch beidseits, keine Rasselgeräusche, kein Spasmus, sonorer Klopfschall, reines Vesikuläratmen.
Abdomen: weich, regelrechte Darmgeräusche über allen vier Quadranten auskultierbar, kein Druckschmerz, keine Abwehrspannung, keine Resistenzen, kein Meteorismus, kein Aszites, Leber und Milz nicht tastbar vergrößert, kein Druck- oder Klopfschmerz über den Nierenlagern und der Wirbelsäule. Neurologisch orientierend unauffällig.`;

const KU_KURZ = `${KU_KOPF}. Cor: auskultatorisch rein, {{ku_rhythmus}}; Pulmo: vesikuläres Atemgeräusch, keine Rasselgeräusche; Fuß- und Leistenpulse gut tastbar, keine Jugularvenenstauung; keine peripheren Ödeme; keine Zyanose; Abdomen: weich, kein Druckschmerz, keine Resistenzen; neurologisch orientierend kein fokal-neurologisches Defizit.`;

const VEGETATIVE_ANAMNESE = 'Appetit, Durst und Flüssigkeitsaufnahme seien normal, es bestehe keine Übelkeit, kein Reflux und keine Dysphagie. Das Körpergewicht sei im letzten Jahr stabil gewesen. Stuhlgang und Miktion seien unauffällig, es bestehe keine Nykturie. Die Frage nach Husten oder Auswurf wurde verneint, ebenso die nach Fieber, Schüttelfrost und Nachtschweiß. Der Schlaf sei gut. Aktuell bestehen keine Infekte, die Leistung sei normal. Schwindel, Schwäche und Kopfschmerzen seien nicht vorhanden.';

/* ------------------------------------------------------------------ */
/* Abschnitte, die aus den gemeinsamen Feldgruppen gespeist werden      */
/* ------------------------------------------------------------------ */

const SECTION_RISIKOFAKTOREN = {
  id: 'risikofaktoren',
  title: 'Kardiovaskuläre Risikofaktoren',
  visibleIf: 'kv_risikofaktoren not empty',
  template: `{{#each kv_risikofaktoren}}- {{this}}{{#if this == "Nikotinabusus" and nikotin_py}} ({{nikotin_py}} py){{/if}}{{#if this == "Diabetes Mellitus" and diabetes_typ}} Typ {{diabetes_typ}}{{/if}}
{{/each}}`,
};

const SECTION_VORDIAGNOSEN = {
  id: 'vordiagnosen',
  title: 'Relevante Vordiagnosen',
  visibleIf: 'vordiagnosen not empty',
  template: `{{#each vordiagnosen}}- {{this.text}}
{{/each}}`,
};

const SECTION_ANAMNESE = {
  id: 'anamnese',
  title: 'Anamnese',
  visibleIf: 'anamnese not empty or veg_anamnese',
  template: `{{#if anamnese}}{{anamnese}}
{{/if}}{{#if veg_anamnese}}
Vegetative Anamnese: ${VEGETATIVE_ANAMNESE}{{/if}}`,
};

const SECTION_UNTERSUCHUNG = {
  id: 'untersuchung',
  title: 'Körperlicher Untersuchungsbefund',
  visibleIf: 'ku_variante not empty or ku_zusatz not empty',
  template: `{{#if ku_variante == "ausfuehrlich"}}${KU_AUSFUEHRLICH}{{/if}}{{#if ku_variante == "kurz"}}${KU_KURZ}{{/if}}{{#if ku_zusatz}}
{{ku_zusatz}}{{/if}}`,
};

const SECTION_BEFUNDE = {
  id: 'befunde',
  title: 'Befunde',
  visibleIf: 'labor_auffaellig not empty or ekg_aufnahme not empty or echo_befund not empty or weitere_befunde not empty',
  template: `{{#if labor_auffaellig}}Pathologische Laborwerte bei Aufnahme:
{{labor_auffaellig}}

{{/if}}{{#if ekg_aufnahme}}EKG bei Aufnahme:
{{ekg_aufnahme}}

{{/if}}{{#if echo_befund}}Echokardiographie:
{{echo_befund}}

{{/if}}{{#if weitere_befunde}}{{weitere_befunde}}{{/if}}`,
};

const SECTION_THERAPIEEMPFEHLUNG = {
  id: 'therapieempfehlung',
  title: 'Therapieempfehlung',
  visibleIf: 'medikation not empty or therapieempfehlung_text not empty',
  template: `{{#each medikation}}- {{this.wirkstoff}}{{#if this.staerke}} {{this.staerke}}{{/if}}{{#if this.schema}} {{this.schema}}{{/if}}{{#if this.hinweis}} ({{this.hinweis}}){{/if}}
{{/each}}{{#if therapieempfehlung_text}}{{therapieempfehlung_text}}{{/if}}`,
};

/** Anhang fuer jeden Procedere-Abschnitt: frei ergaenzte Punkte. */
const PROCEDERE_ZUSATZ = `{{#each procedere_zusatz}}- {{this.text}}
{{/each}}`;

/** Feldgruppen, die eine ausfuehrliche Vorlage (Quelle T) typischerweise braucht. */
const SHARED_GROUPS_LANGFORM = [
  'stammdaten',
  'aufenthalt',
  'risikofaktoren',
  'vordiagnosen',
  'anamnese_untersuchung',
  'befunde',
  'therapieempfehlung',
  'procedere_frei',
];

/** Feldgruppen fuer die kompakten Hausstandard-Briefe (Quelle M). */
const SHARED_GROUPS_KURZFORM = ['stammdaten', 'aufenthalt', 'procedere_frei'];

/** Die Standardabschnitte einer Langform-Vorlage, ohne die fallspezifischen. */
function langformRahmen({ diagnosen, verlauf, procedere, verlaufTitel = 'Therapie und Verlauf' }) {
  return [
    { id: 'diagnosen', title: 'Aktuelle Diagnosen', template: diagnosen },
    SECTION_RISIKOFAKTOREN,
    SECTION_VORDIAGNOSEN,
    SECTION_ANAMNESE,
    SECTION_UNTERSUCHUNG,
    SECTION_BEFUNDE,
    { id: 'verlauf', title: verlaufTitel, template: verlauf },
    SECTION_THERAPIEEMPFEHLUNG,
    { id: 'procedere', title: 'Procedere', template: `${procedere}\n${PROCEDERE_ZUSATZ}` },
  ].map((section, index) => ({ ...section, order: index + 1 }));
}

      /* Exporte */
      __exports["KU_AUSFUEHRLICH"] = KU_AUSFUEHRLICH;
      __exports["KU_KURZ"] = KU_KURZ;
      __exports["VEGETATIVE_ANAMNESE"] = VEGETATIVE_ANAMNESE;
      __exports["SECTION_RISIKOFAKTOREN"] = SECTION_RISIKOFAKTOREN;
      __exports["SECTION_VORDIAGNOSEN"] = SECTION_VORDIAGNOSEN;
      __exports["SECTION_ANAMNESE"] = SECTION_ANAMNESE;
      __exports["SECTION_UNTERSUCHUNG"] = SECTION_UNTERSUCHUNG;
      __exports["SECTION_BEFUNDE"] = SECTION_BEFUNDE;
      __exports["SECTION_THERAPIEEMPFEHLUNG"] = SECTION_THERAPIEEMPFEHLUNG;
      __exports["PROCEDERE_ZUSATZ"] = PROCEDERE_ZUSATZ;
      __exports["SHARED_GROUPS_LANGFORM"] = SHARED_GROUPS_LANGFORM;
      __exports["SHARED_GROUPS_KURZFORM"] = SHARED_GROUPS_KURZFORM;
      __exports["langformRahmen"] = langformRahmen;
  };

  __definitionen["src/data/templates/koronar.js"] = function (__exports, __require) {
/* ---- src/data/templates/koronar.js ---- */
/**
 * Vorlagen der Gruppe "Koronar".
 *
 * Quellen: Musterarztbriefe_Med._I.docx (kompakter Hausstandard) und
 * Textbausteine_Kardio.docx (Langform). Der Wortlaut ist unveraendert
 * uebernommen; variabel sind ausschliesslich die im Original als
 * "X", "XX" oder Schraegstrich-Alternative markierten Stellen.
 */

const { KORONARGEFAESSE, P2Y12 } = __require("../fields.js");
const { PROCEDERE_ZUSATZ, SHARED_GROUPS_KURZFORM, SHARED_GROUPS_LANGFORM, langformRahmen } = __require("../sectionBlocks.js");

const QUELLE_M = 'Musterarztbriefe_Med._I.docx';
const QUELLE_T = 'Textbausteine_Kardio.docx';

/**
 * Risikofaktoren als Fliesstext – nur in den kompakten M-Vorlagen.
 * Die Zeile verschwindet vollstaendig, wenn nichts ausgewaehlt ist.
 */
const RISIKOFAKTOREN_INLINE = `{{#if kv_risikofaktoren}}
Kardiovaskuläre Risikofaktoren: {{#each kv_risikofaktoren}}{{this}}{{#if this == "Nikotinabusus" and nikotin_py}} ({{nikotin_py}} py){{/if}}{{#if this == "Diabetes Mellitus" and diabetes_typ}} Typ {{diabetes_typ}}{{/if}}{{#unless @last}}, {{/unless}}{{/each}}.
{{/if}}`;

/** "Implantation X DE-Stents" mit korrektem Numerus. */
const STENT_ANZAHL = '{{#if stent_anzahl == 1}}eines DE-Stents{{#else}}{{stent_anzahl}} DE-Stents{{/if}}';

/** Diagnosenzeilen zu kardialen Vorbehandlungen (Bypass-OP, PCI …). */
const VORBEHANDLUNGEN = '{{#each vorbehandlungen}}- {{this.art}}'
  + '{{#if this.details}} ({{this.details}}){{/if}}'
  + '{{#if this.zeitpunkt}} {{this.zeitpunkt | monthyear}}{{/if}}'
  + '{{#if this.ort}} ({{this.ort}}){{/if}}\n{{/each}}';

const FELD_VORBEHANDLUNGEN = {
  key: 'vorbehandlungen',
  label: 'Kardiale Vorbehandlungen',
  type: 'list',
  addLabel: 'Vorbehandlung hinzufügen',
  itemLabel: '{{this.art}} {{this.details}}',
  help: 'Beleg: „Koronare Bypass-OP (LIMA – LAD, usw.) XX/XX (Klinikum XX)/ PCI/DES-Implantation usw."',
  itemFields: [
    {
      key: 'art',
      label: 'Art',
      type: 'select',
      required: true,
      allowCustom: true,
      options: ['Koronare Bypass-OP', 'PCI', 'DES-Implantation'],
    },
    { key: 'details', label: 'Details', type: 'text', placeholder: 'z. B. LIMA – LAD' },
    { key: 'zeitpunkt', label: 'Zeitpunkt', type: 'month' },
    { key: 'ort', label: 'Klinik', type: 'text', placeholder: 'z. B. Klinikum XX' },
  ],
};

const FELD_ZIELGEFAESS = {
  key: 'zielgefaess',
  label: 'Zielgefäß',
  type: 'select',
  required: true,
  allowCustom: true,
  options: KORONARGEFAESSE,
};

const FELD_SEGMENT = {
  key: 'zielgefaess_segment',
  label: 'Segment',
  type: 'select',
  required: true,
  options: [
    { value: 'prox.', label: 'proximal (prox.)' },
    { value: 'med.', label: 'medial (med.)' },
    { value: 'dist.', label: 'distal (dist.)' },
  ],
};

const FELD_GEFAESSERKRANKUNG = {
  key: 'gefaesserkrankung',
  label: 'Gefäßerkrankung',
  type: 'select',
  required: true,
  options: [
    { value: '1', label: '1-Gefäßerkrankung' },
    { value: '2', label: '2-Gefäßerkrankung' },
    { value: '3', label: '3-Gefäßerkrankung' },
  ],
};

const FELD_P2Y12 = { key: 'p2y12', label: 'P2Y12-Inhibitor', type: 'select', required: true, options: P2Y12 };

const FELD_PUNKTION = [
  {
    key: 'punktion_gefaess',
    label: 'Punktierte Arterie',
    type: 'select',
    required: true,
    default: 'A. rad.',
    options: [
      { value: 'A. rad.', label: 'A. radialis (A. rad.)' },
      { value: 'A. fem.', label: 'A. femoralis (A. fem.)' },
    ],
  },
  { key: 'punktion_seite', label: 'Seite', type: 'select', required: true, default: 'rechts', options: ['rechts', 'links'] },
];

const PUNKTIONSSATZ = 'Die punktierte {{punktion_gefaess}} {{punktion_seite}} präsentiert sich am Entlasstag klinisch reizlos, die periphere Durchblutung, Sensibilität und Motorik waren allzeit intakt.';

const ENTLASSSATZ_M = 'Wir entlassen {{anrede_name_akk}} am {{entlass_datum | dateShort}} in {{entlass_az}} Allgemeinzustand in {{patient_poss}} häusliches Umfeld und ihre weitere fachärztliche Betreuung.';

const ENTLASSSATZ_T = 'Am {{entlass_datum | date}} konnten wir {{patient_akk}} in stabilem und beschwerdefreiem Zustand wieder in Ihre geschätzte ambulante ärztliche Weiterbehandlung entlassen und stehen für Rückfragen gerne zur Verfügung.';

/* ================================================================== */
/* M4 – Akutes Koronarsyndrom (Hausstandard, kompakt)                  */
/* ================================================================== */

const acs = {
  id: 'acs',
  title: 'Akutes Koronarsyndrom',
  group: 'Koronar',
  source: `${QUELLE_M} – „Akutes Koronarsyndrom"`,
  description: 'Kompakter Hausstandard: STEMI/NSTEMI/instabile AP mit DE-Stent-PCI. DAPT-Dauer 12 Monate, Ziel-LDL <55 mg/dl.',
  sharedGroups: [...SHARED_GROUPS_KURZFORM, 'risikofaktoren'],
  fieldGroups: [
    {
      id: 'aufnahme',
      title: 'Aufnahmegrund und Diagnose',
      fields: [
        {
          key: 'acs_typ',
          label: 'ACS-Typ',
          type: 'select',
          required: true,
          default: 'NSTEMI',
          options: ['STEMI', 'NSTEMI', 'Instabile AP'],
        },
        FELD_GEFAESSERKRANKUNG,
        {
          key: 'laesionsart',
          label: 'Läsionsart',
          type: 'select',
          required: true,
          default: 'hochgradiger Stenose',
          options: [
            { value: 'Verschluss', label: 'Verschluss' },
            { value: 'hochgradiger Stenose', label: 'hochgradige Stenose' },
          ],
        },
        FELD_ZIELGEFAESS,
        FELD_SEGMENT,
      ],
    },
    {
      id: 'intervention',
      title: 'Intervention',
      fields: [
        { key: 'stent_anzahl', label: 'Anzahl DE-Stents', type: 'number', required: true, default: '1', min: 1, max: 10 },
        { key: 'pci_datum', label: 'Datum der PCI', type: 'date', required: true },
        {
          key: 'ck_max',
          label: 'CK max.',
          type: 'number',
          unit: 'U/l',
          visibleIf: 'acs_typ == "STEMI"',
          help: 'Beleg: „CK max.: XXXX U/l (nur bei STEMI)".',
        },
        ...FELD_PUNKTION,
        FELD_VORBEHANDLUNGEN,
      ],
    },
    {
      id: 'verlauf',
      title: 'Verlauf und Befunde',
      fields: [
        { key: 'telemetrie_tage', label: 'Telemetrische Überwachung', type: 'number', unit: 'Tage' },
        {
          key: 'telemetrie_rhythmusstoerungen',
          label: 'Rhythmusstörungen',
          type: 'text',
          placeholder: 'z. B. keine',
          help: 'Beleg: „waren X Rhythmusstörungen auffällig".',
        },
        { key: 'echo_befund', label: 'Echokardiographie', type: 'multiline', rows: 3, help: 'Beleg: „Echokardiographisch zeigt sich…."' },
      ],
    },
    {
      id: 'therapie',
      title: 'Therapie und Nachsorge',
      fields: [
        FELD_P2Y12,
        {
          key: 'ahb_beantragt',
          label: 'Kardiologische AHB beantragt',
          type: 'checkbox',
          help: 'Beleg: „Kardiologische AHB beantragt, Terminbescheid erfolgt postalisch".',
        },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnosen',
      order: 1,
      template: `{{acs_typ}} bei koronarer {{gefaesserkrankung}}-Gefäßerkrankung mit {{laesionsart}} des {{zielgefaess}}
- Aktuell: DE-Stent-PCI der {{zielgefaess_segment}} {{zielgefaess}} am {{pci_datum | date}}
{{#if acs_typ == "STEMI" and ck_max}}- CK max.: {{ck_max}} U/l
{{/if}}${VORBEHANDLUNGEN}`,
    },
    {
      id: 'epikrise',
      title: 'Epikrise',
      order: 2,
      template: `{{anrede_name}} wurde mit akutem Koronarsyndrom auf unsere Chest-Pain-Unit aufgenommen. Koronarangiographisch imponiert eine koronare {{gefaesserkrankung}}-Gefäßerkrankung mit {{laesionsart}} des {{zielgefaess}}, welche in gleicher Sitzung komplikationslos mit PCI und Implantation ${STENT_ANZAHL} rekanalisiert wird.
Eine duale Thrombozytenaggregationshemmung mit ASS und {{p2y12}} ist für 12 Monate indiziert, anschließend eine lebensbegleitende Monotherapie.
{{#if telemetrie_tage or telemetrie_rhythmusstoerungen}}
Während der telemetrischen EKG-Überwachung{{#if telemetrie_tage}} über {{telemetrie_tage}} Tage{{/if}} waren {{telemetrie_rhythmusstoerungen}} Rhythmusstörungen auffällig.
{{/if}}
{{#if echo_befund}}
Echokardiographisch zeigt sich {{echo_befund}}
{{/if}}
${RISIKOFAKTOREN_INLINE}
${PUNKTIONSSATZ}
${ENTLASSSATZ_M}`,
    },
    {
      id: 'procedere',
      title: 'Procedere',
      order: 3,
      template: `- Duale Thrombozytenaggregationshemmung mit ASS und {{p2y12}} für 12 Monate unter PPI-Schutz, anschließend lebensbegleitend Monotherapie
- Optimale Einstellung der kardiovaskulären Risikofaktoren, Statintherapie mit Ziel-LDL <55mg/dl
{{#if ahb_beantragt}}- Kardiologische AHB beantragt, Terminbescheid erfolgt postalisch
{{/if}}${PROCEDERE_ZUSATZ}`,
    },
  ],
};

/* ================================================================== */
/* M5 – Perkutane Koronarintervention (chronisches Koronarsyndrom)     */
/* ================================================================== */

const pciElektiv = {
  id: 'pci_elektiv',
  title: 'Perkutane Koronarintervention',
  group: 'Koronar',
  source: `${QUELLE_M} – „Perkutane Koronarintervention"`,
  description: 'Kompakter Hausstandard bei Progress einer bekannten KHK. DAPT-Dauer frei wählbar, Ziel-LDL <55 mg/dl.',
  sharedGroups: [...SHARED_GROUPS_KURZFORM, 'risikofaktoren'],
  fieldGroups: [
    {
      id: 'diagnose',
      title: 'Diagnose und Intervention',
      fields: [
        FELD_GEFAESSERKRANKUNG,
        {
          key: 'laesionsart',
          label: 'Läsionsart',
          type: 'select',
          required: true,
          default: 'hochgradiger Stenose',
          options: [
            { value: 'Verschluss', label: 'Verschluss' },
            { value: 'hochgradiger Stenose', label: 'hochgradige Stenose' },
          ],
        },
        FELD_ZIELGEFAESS,
        FELD_SEGMENT,
        { key: 'stent_anzahl', label: 'Anzahl DE-Stents', type: 'number', required: true, default: '1', min: 1, max: 10 },
        { key: 'pci_datum', label: 'Datum der PCI', type: 'date', required: true },
        ...FELD_PUNKTION,
        FELD_VORBEHANDLUNGEN,
      ],
    },
    {
      id: 'therapie',
      title: 'Therapie',
      fields: [
        FELD_P2Y12,
        {
          key: 'dapt_monate',
          label: 'DAPT-Dauer',
          type: 'number',
          unit: 'Monate',
          required: true,
          default: '6',
          help: 'Beleg: „ist für X Monate indiziert" – anders als beim ACS variabel.',
        },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnosen',
      order: 1,
      template: `Chronisches Koronarsyndrom bei {{gefaesserkrankung}}-Gefäßerkrankung
- Aktuell: DE-Stent-PCI der {{zielgefaess_segment}} {{zielgefaess}} am {{pci_datum | date}}
${VORBEHANDLUNGEN}`,
    },
    {
      id: 'epikrise',
      title: 'Epikrise',
      order: 2,
      template: `{{anrede_name}} wurde mit Verdacht auf Progress einer bekannten KHK stationär aufgenommen. Koronarangiographisch imponiert eine koronare {{gefaesserkrankung}}-Gefäßerkrankung mit {{laesionsart}} des {{zielgefaess}}, welche in gleicher Sitzung komplikationslos mit PCI und Implantation ${STENT_ANZAHL} rekanalisiert wird.
Eine duale Thrombozytenaggregationshemmung mit ASS und {{p2y12}} ist für {{dapt_monate}} Monate indiziert, anschließend eine lebensbegleitende Monotherapie.
${RISIKOFAKTOREN_INLINE}
${PUNKTIONSSATZ}
${ENTLASSSATZ_M}`,
    },
    {
      id: 'procedere',
      title: 'Procedere',
      order: 3,
      template: `- Duale Thrombozytenaggregationshemmung mit ASS und {{p2y12}} für {{dapt_monate}} Monate unter PPI-Schutz, anschließend lebensbegleitend Monotherapie
- Optimale Einstellung der kardiovaskulären Risikofaktoren, Statintherapie mit Ziel-LDL <55mg/dl
${PROCEDERE_ZUSATZ}`,
    },
  ],
};

/* ================================================================== */
/* T1 – Koronarangiographie (elektiv, Langform)                        */
/* ================================================================== */

const koronarangiographieElektiv = {
  id: 'koronarangiographie_elektiv',
  title: 'Koronarangiographie (elektiv)',
  group: 'Koronar',
  source: `${QUELLE_T} – „Koronarangiographie"`,
  description: 'Ausführliche Gliederung mit neun Abschnitten. Achtung: In dieser Quelle lautet der Zielwert LDL < 70 mg/dl und der Wirkstoff wird „Aspirin" genannt.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'diagnose',
      title: 'Diagnose',
      fields: [
        FELD_GEFAESSERKRANKUNG,
        { key: 'acvb_situation', label: 'Mit ACVB-Situation', type: 'checkbox' },
        { key: 'acvb_jahr', label: 'ACVB Jahr', type: 'text', visibleIf: 'acvb_situation' },
        { key: 'acvb_ort', label: 'ACVB Ort', type: 'text', visibleIf: 'acvb_situation' },
        FELD_ZIELGEFAESS,
        {
          key: 'intervention',
          label: 'Intervention',
          type: 'select',
          required: true,
          default: 'DES-Implantation',
          options: ['PTCA', 'DES-Implantation', 'PTCA/DES-Implantation'],
        },
      ],
    },
    {
      id: 'verlauf_felder',
      title: 'Verlauf',
      fields: [
        {
          key: 'aufnahmegrund_freitext',
          label: 'Aufnahmegrund',
          type: 'text',
          help: 'Beleg: „zur elektiv geplanten Koronarangiographie bei … / bekannter koronarer … Erkrankung".',
        },
        { key: 'koro_befund', label: 'Koronarangiographischer Befund', type: 'multiline', rows: 3, required: true, help: 'Beleg: „Koronarangiographisch zeigte sich , welche in gleicher Sitzung mittels … versorgt wurde."' },
        FELD_P2Y12,
        {
          key: 'dapt_monate',
          label: 'DAPT-Dauer',
          type: 'select',
          required: true,
          default: '6',
          options: [
            { value: '6', label: '6 Monate' },
            { value: '12', label: '12 Monate' },
          ],
        },
        { key: 'echo_verlaufskontrollen', label: 'Echokardiographische Verlaufskontrollen empfehlen', type: 'checkbox', default: true },
        {
          key: 'punktion_seite',
          label: 'Punktionsseite',
          type: 'select',
          required: true,
          default: 'rechte',
          options: [{ value: 'linke', label: 'linke' }, { value: 'rechte', label: 'rechte' }],
        },
        {
          key: 'punktion_region',
          label: 'Punktionsregion',
          type: 'select',
          required: true,
          default: 'Radialis',
          options: [{ value: 'Leisten', label: 'Leistenregion' }, { value: 'Radialis', label: 'Radialisregion' }],
        },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: `- Koronare {{gefaesserkrankung}}-Gefäßerkrankung{{#if acvb_situation}} (mit ACVB Situation{{#if acvb_jahr}}, {{acvb_jahr}}{{/if}}{{#if acvb_ort}}, {{acvb_ort}}{{/if}}){{/if}} mit hochgradiger {{zielgefaess}}-Stenose
  - {{intervention}}`,
    verlaufTitel: 'Therapie & Verlauf',
    verlauf: `Die stationäre Aufnahme {{patient_gen}} erfolgte am {{aufnahme_datum | date}} zur elektiv geplanten Koronarangiographie{{#if aufnahmegrund_freitext}} bei {{aufnahmegrund_freitext}}{{/if}}.
Koronarangiographisch zeigte sich {{koro_befund}}, welche in gleicher Sitzung mittels {{intervention}} versorgt wurde.
Der postinterventionelle Verlauf gestaltete sich komplikationslos.
Aufgrund der Stentimplantation empfehlen wir eine duale Plättchenhemmung mit Aspirin und {{p2y12}} für {{dapt_monate}} Monate, anschließend eine lebenslange Gabe von Aspirin.
{{#if echo_verlaufskontrollen}}
Außerdem sollten regelmäßige echokardiographische Verlaufskontrollen erfolgen.
{{/if}}
Wir empfehlen die konsequente Therapie kardiovaskulärer Risikofaktoren mit Ziel LDL-Cholesterin < 70 mg/dl.
Die {{punktion_seite}} {{punktion_region}}region war nach Punktion im Rahmen der Koronarangiographie zuletzt palpatorisch und auskultatorisch unauffällig und reizlos bei geringem lokalem Hämatom.

${ENTLASSSATZ_T}`,
    procedere: `- Duale Plättchenhemmung mit ASS und {{p2y12}} für {{dapt_monate}} Monate, anschließend eine lebenslange Gabe von ASS
- Optimale Einstellung der kardiovaskulären Risikofaktoren, u.a. mit einem Ziel LDL < 70 mg/dl`,
  }),
};

/* ================================================================== */
/* T2 – Akutes Koronarsyndrom (Langform)                               */
/* ================================================================== */

const acsLangform = {
  id: 'acs_langform',
  title: 'Akutes Koronarsyndrom (Langform)',
  group: 'Koronar',
  source: `${QUELLE_T} – „Akutes Koronarsyndrom"`,
  description: 'Ausführliche Gliederung mit Intensivverlauf, Telemetrie, LZ-EKG und LZ-RR. Zielwert dieser Quelle: LDL < 70 mg/dl.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'infarkt',
      title: 'Infarkt',
      fields: [
        { key: 'acs_typ', label: 'Infarkttyp', type: 'select', required: true, default: 'NSTEMI', options: ['STEMI', 'NSTEMI'] },
        {
          key: 'wand',
          label: 'Wandbezug',
          type: 'select',
          required: true,
          default: 'Vorderwand',
          options: [{ value: 'Vorderwand', label: 'Vorderwand' }, { value: 'Hinterwand', label: 'Hinterwand' }],
        },
        FELD_ZIELGEFAESS,
        { key: 'infarkt_datum', label: 'Datum', type: 'date', required: true },
        {
          key: 'intervention',
          label: 'Intervention',
          type: 'select',
          required: true,
          default: 'DES-Implantation',
          options: ['PTCA', 'DES-Implantation', 'PTCA/DES-Implantation'],
        },
        { key: 'ck_max', label: 'Maximale CK-Auslenkung', type: 'number', unit: 'U/l' },
        { key: 'sofortige_uebernahme', label: 'Sofortige Übernahme ins Herzkatheterlabor', type: 'checkbox', visibleIf: 'acs_typ == "STEMI"' },
        { key: 'intensiv_verlegung', label: 'Verlegung auf Intensivstation', type: 'checkbox' },
      ],
    },
    {
      id: 'verlauf_felder',
      title: 'Verlauf',
      fields: [
        {
          key: 'medikation_erweitert',
          label: 'Medikation erweitert um',
          type: 'multiselect',
          options: ['Ramipril', 'Bisoprolol', 'Atorvastatin'],
          help: 'Beleg: „Wir erweiterten die Medikation um Ramipril, Bisoprolol und Atorvastatin."',
        },
        { key: 'reperfusionsarrhythmien', label: 'Reperfusionsarrhythmien in der Telemetrie', type: 'checkbox' },
        { key: 'lz_ekg_befund', label: 'Langzeit-EKG', type: 'text', placeholder: 'durchgehender Sinusrhythmus ohne höhergradige Rhythmusstörungen' },
        {
          key: 'lz_rr_dipper',
          label: 'Langzeit-RR',
          type: 'select',
          options: [{ value: 'Dipper', label: 'Dipper' }, { value: 'Non-Dipper', label: 'Non-Dipper' }],
        },
        FELD_P2Y12,
        { key: 'dapt_monate', label: 'DAPT-Dauer', type: 'number', unit: 'Monate', required: true, default: '12' },
        { key: 'ahb_beantragt', label: 'Kardiologische AHB über Sozialdienst beantragt', type: 'checkbox' },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: `- {{acs_typ}} der {{wand}} bei Verschluss der {{zielgefaess}} am {{infarkt_datum | date}}
  - {{intervention}}`,
    verlauf: `{{#if sofortige_uebernahme}}Bei einem STEMI erfolgte die sofortige Übernahme ins Herzkatheterlabor. {{/if}}Koronarangiographisch zeigte sich ein {{zielgefaess}}-Verschluss als Korrelat des {{wand}}infarktes. Es erfolgte eine komplikationslose Rekanalisation und DES-Implantation des verschlossenen Gefäßes.{{#if ck_max}} Die maximale CK-Auslenkung lag bei {{ck_max}} U/l{{/if}}
{{#if intensiv_verlegung or medikation_erweitert}}
{{#if intensiv_verlegung}}{{patient_nom | cap}} wurde anschließend auf die Intensivstation verlegt. {{/if}}{{#if medikation_erweitert}}Wir erweiterten die Medikation um {{medikation_erweitert | enum}}.{{/if}}
{{/if}}
{{#if reperfusionsarrhythmien or lz_ekg_befund}}
{{#if reperfusionsarrhythmien}}In der weiteren telemetrischen Überwachung waren Reperfusionsarrhythmien erkennbar, welche im Verlauf rückläufig waren. {{/if}}{{#if lz_ekg_befund}}In einem LZ-EKG stellte sich ein {{lz_ekg_befund}} dar.{{/if}}
{{/if}}
{{#if echo_befund}}
Echokardiographisch zeigte sich {{echo_befund}}
{{/if}}
{{#if lz_rr_dipper}}
In einem LZ-RR fanden sich normotensive Werte mit adäquater Nachtabsenkung (im Sinne eines {{lz_rr_dipper}}).
{{/if}}
Aufgrund der Stentimplantation empfehlen wir eine duale Plättchenhemmung mit ASS und {{p2y12}} für {{dapt_monate}} Monate, anschließend eine lebenslange Gabe von ASS.
Wir empfehlen eine kardiologische Anbindung mit regelmäßigen echokardiographischen Verlaufsbeurteilungen. Weiters bitten wir um eine optimale Einstellung der kardiovaskulären Risikofaktoren, u.a. mit einem Ziel-LDL < 70 mg/dl.
{{#if ahb_beantragt}}
Auf Wunsch {{patient_gen}} beantragten wir über unseren Sozialdienst eine kardiologische AHB. Über Zeit und Ort wird {{patient_nom}} postalisch informiert.
{{/if}}

${ENTLASSSATZ_T}`,
    procedere: `{{#if ahb_beantragt}}
- Eine AHB wurde beantragt. Über Zeit und Ort wird {{patient_nom}} postalisch informiert.
{{/if}}
- duale Plättchenhemmung mit ASS und {{p2y12}} für {{dapt_monate}} Monate, anschließend eine lebenslange Gabe von ASS
- optimale Einstellung der kardiovaskulären Risikofaktoren, u.a. mit einem Ziel-LDL < 70 mg/dl
- kardiologische Anbindung mit regelmäßigen echokardiographischen Verlaufsbeurteilungen
- Ausreizen der Herzinsuffizienzmedikation nach Patientenverträglichkeit`,
  }),
};

/* ================================================================== */
/* T10 – Bypass-OP (Verlegung)                                         */
/* ================================================================== */

const bypassOp = {
  id: 'bypass_op',
  title: 'Bypass-OP (Verlegung)',
  group: 'Koronar',
  source: `${QUELLE_T} – „Bypass-OP"`,
  description: 'Elektive Koronarangiographie mit Indikation zur operativen Bypass-Versorgung und Verlegung.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'diagnose',
      title: 'Diagnose',
      fields: [
        FELD_GEFAESSERKRANKUNG,
        { key: 'acvb_situation', label: 'Mit ACVB-Situation', type: 'checkbox' },
        { key: 'acvb_jahr', label: 'ACVB Jahr', type: 'text', visibleIf: 'acvb_situation' },
        { key: 'acvb_ort', label: 'ACVB Ort', type: 'text', visibleIf: 'acvb_situation' },
        FELD_ZIELGEFAESS,
      ],
    },
    {
      id: 'verlauf_felder',
      title: 'Verlauf und Verlegung',
      fields: [
        {
          key: 'lvef_grad',
          label: 'Einschränkung der LVEF',
          type: 'select',
          options: [
            { value: 'leicht', label: 'leichtgradig' },
            { value: 'mittel', label: 'mittelgradig' },
            { value: 'hoch', label: 'hochgradig' },
          ],
          help: 'Beleg: „XXgradig eingeschränkte LVEF".',
        },
        { key: 'lvef_zusatz', label: 'Ergänzung zum Echobefund', type: 'text' },
        { key: 'aufnahme_extern_datum', label: 'Aufnahmetermin Schön Klinik Vogtareuth', type: 'date', required: true },
        { key: 'op_datum', label: 'Datum der Bypass-OP', type: 'date', required: true },
        { key: 'praeop_rx_thorax', label: 'Röntgen-Thorax ohne pulmonalvenöse Stauung', type: 'checkbox', default: true },
        { key: 'praeop_abdomen', label: 'Abdomensonographie unauffällig', type: 'checkbox', default: true },
        { key: 'praeop_lufu', label: 'Lungenfunktionsdiagnostik unauffällig', type: 'checkbox', default: true },
        {
          key: 'punktion_seite',
          label: 'Punktionsseite',
          type: 'select',
          default: 'rechte',
          options: [{ value: 'linke', label: 'linke' }, { value: 'rechte', label: 'rechte' }],
        },
        {
          key: 'punktion_region',
          label: 'Punktionsregion',
          type: 'select',
          default: 'Radialis',
          options: [{ value: 'Leisten', label: 'Leistenregion' }, { value: 'Radialis', label: 'Radialisregion' }],
        },
        { key: 'verlegung_datum', label: 'Verlegungsdatum', type: 'date', required: true },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: `- Schwere koronare {{gefaesserkrankung}}-Gefäßerkrankung{{#if acvb_situation}} (mit ACVB Situation{{#if acvb_jahr}}, {{acvb_jahr}}{{/if}}{{#if acvb_ort}}, {{acvb_ort}}{{/if}}){{/if}} mit hochgradiger {{zielgefaess}}-Stenose mit Bypass-Indikation`,
    verlaufTitel: 'Therapie & Verlauf',
    verlauf: `Die stationäre Aufnahme {{patient_gen}} erfolgte am {{aufnahme_datum | date}} zur elektiv geplanten Koronarangiographie. Hierbei zeigte sich eine schwere koronare {{gefaesserkrankung}}-Gefäßerkrankung mit oben genanntem Befund und Indikation zur operativen Bypass-Versorgung.
{{#if lvef_grad}}
Echokardiographisch fand sich eine {{lvef_grad}}gradig eingeschränkte LVEF{{#if lvef_zusatz}} bei {{lvef_zusatz}}{{/if}}
{{/if}}

Die aktuelle Situation, das Krankheitsbild und das weitere Procedere wurden mit {{patient_dat}} ausführlich besprochen. Wir vereinbarten einen Aufnahmetermin in der Schön Klinik Vogtareuth am {{aufnahme_extern_datum | date}} zur Bypass-OP am {{op_datum | date}}.
In den präoperativen Vorbereitungsuntersuchungen ergaben sich keine Kontraindikationen für den bevorstehenden Eingriff.
{{#if praeop_rx_thorax or praeop_abdomen or praeop_lufu}}
{{#if praeop_rx_thorax}}Im Röntgen-Thorax zeigten sich keine Hinweise auf pulmonalvenöse Stauung. {{/if}}{{#if praeop_abdomen}}Die Abdomensonographie war unauffällig. {{/if}}{{#if praeop_lufu}}In der Lungenfunktionsdiagnostik zeigten sich keine Auffälligkeiten.{{/if}}
{{/if}}

{{#if punktion_seite}}
Die {{punktion_seite}} {{punktion_region}}region war nach Punktion im Rahmen der Koronarangiographie zuletzt palpatorisch und auskultatorisch unauffällig und reizlos bei geringem lokalem Hämatom.

{{/if}}
Wir konnten {{patient_akk}} am {{verlegung_datum | date}} in stabilem Allgemeinzustand in die Schön Klinik Vogtareuth verlegen.`,
    procedere: '- Aufnahmetermin in der Schön Klinik Vogtareuth am {{aufnahme_extern_datum | date}} zur Bypassoperation am {{op_datum | date}}',
  }),
};

__exports.default = [acs, pciElektiv, koronarangiographieElektiv, acsLangform, bypassOp];
  };

  __definitionen["src/data/templates/rhythmologie.js"] = function (__exports, __require) {
/* ---- src/data/templates/rhythmologie.js ---- */
/**
 * Vorlagen der Gruppe "Rhythmologie".
 *
 * Quellen: Musterarztbriefe_Med._I.docx (PVI, sonstige EPU, elektrische
 * Cardioversion) und Textbausteine_Kardio.docx (TAA bei Vorhofflimmern,
 * ambulante Cardioversion, EPU bei VHF).
 */

const { PROCEDERE_ZUSATZ, SHARED_GROUPS_KURZFORM, SHARED_GROUPS_LANGFORM, langformRahmen } = __require("../sectionBlocks.js");

const QUELLE_M = 'Musterarztbriefe_Med._I.docx';
const QUELLE_T = 'Textbausteine_Kardio.docx';

const ENTLASSSATZ_M = 'Wir entlassen {{anrede_name_akk}} am {{entlass_datum | dateShort}} in {{entlass_az}} Allgemeinzustand in {{patient_poss}} häusliches Umfeld und ihre weitere fachärztliche Betreuung.';

const PUNKTIONSSATZ_FEMORAL = 'Die beidseits punktierten Vv. Femorales sind am Entlasstag inspektorisch und palpatorisch reizlos, die periphere Durchblutung, Sensibilität und Motorik waren allzeit intakt.';

const FELD_CHA2DS2VASC = {
  key: 'cha2ds2vasc',
  label: 'CHA₂DS₂-VASc-Score',
  type: 'number',
  required: true,
  min: 0,
  max: 9,
  help: 'Ab 2 wird die orale Antikoagulation dauerhaft empfohlen, sonst zeitlich befristet (Beleg: „dauerhaft (X ≥ 2)/ … (X = 0-1)").',
};

const FELD_HASBLED = { key: 'hasbled', label: 'HAS-BLED-Score', type: 'number', required: true, min: 0, max: 9 };

const FELD_EHRA = {
  key: 'ehra',
  label: 'EHRA-Klasse',
  type: 'select',
  required: true,
  default: 'II',
  options: ['I', 'II', 'III', 'IV'],
};

/* ================================================================== */
/* M1 – Pulmonalvenenisolation                                         */
/* ================================================================== */

const pvi = {
  id: 'pvi',
  title: 'Pulmonalvenenisolation',
  group: 'Rhythmologie',
  source: `${QUELLE_M} – „Pulmonalvenenisolation"`,
  description: 'Elektive PVI nach TEE-gesteuertem Thrombusausschluss. Die PPI-Empfehlung entfällt automatisch bei Pulsed Field Ablation.',
  sharedGroups: SHARED_GROUPS_KURZFORM,
  fieldGroups: [
    {
      id: 'vhf',
      title: 'Vorhofflimmern',
      fields: [
        {
          key: 'vhf_typ',
          label: 'Typ des Vorhofflimmerns',
          type: 'select',
          required: true,
          default: 'Paroxysmal',
          options: [
            { value: 'Paroxysmal', label: 'Paroxysmales Vorhofflimmern' },
            { value: 'Kurz-Persistierend', label: 'Kurz-Persistierendes Vorhofflimmern' },
            { value: 'Persistierend', label: 'Persistierendes Vorhofflimmern' },
          ],
          help: 'Wird im Brief automatisch gebeugt („Paroxysmales" bzw. „mit symptomatischem Paroxysmalen").',
        },
        { key: 'vhf_erstdiagnose', label: 'Erstdiagnose', type: 'month', required: true },
        FELD_EHRA,
        FELD_CHA2DS2VASC,
        FELD_HASBLED,
      ],
    },
    {
      id: 'intervention',
      title: 'Intervention',
      fields: [
        {
          key: 'pvi_verfahren',
          label: 'Ablationsverfahren',
          type: 'select',
          required: true,
          default: 'Kryo-Ballon',
          options: ['Kryo-Ballon', 'Radiofrequenzablation', 'Pulsed Field Ablation'],
          help: 'Bei Pulsed Field Ablation entfällt die PPI-Empfehlung (Beleg: „nicht bei PFA").',
        },
        { key: 'pvi_datum', label: 'Datum der PVI', type: 'date', required: true },
      ],
    },
    {
      id: 'vorbehandlung',
      title: 'Vorbehandlung',
      fields: [
        { key: 'vorherige_ekv', label: 'Vorausgegangene elektrische Cardioversion', type: 'checkbox' },
        { key: 'vorherige_ekv_primaer_erfolgreich', label: 'Primär erfolgreich', type: 'checkbox', visibleIf: 'vorherige_ekv' },
        { key: 'vorherige_ekv_zeitpunkt', label: 'Zeitpunkt der Cardioversion', type: 'month', visibleIf: 'vorherige_ekv' },
        { key: 'aa_substanz', label: 'Antiarrhythmikum', type: 'text', visibleIf: 'vorherige_ekv', placeholder: 'z. B. Amiodaron' },
        { key: 'aa_von', label: 'Therapie von', type: 'month', visibleIf: 'aa_substanz not empty' },
        { key: 'aa_bis', label: 'Therapie bis', type: 'month', visibleIf: 'aa_substanz not empty' },
      ],
    },
    {
      id: 'nachsorge',
      title: 'Nachsorge',
      fields: [
        { key: 'wv_datum', label: 'Wiedervorstellung rhythmologische Sprechstunde', type: 'date' },
        { key: 'wv_uhrzeit', label: 'Uhrzeit', type: 'time', visibleIf: 'wv_datum not empty' },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnosen',
      order: 1,
      template: `{{vhf_typ}}es Vorhofflimmern, Erstdiagnose {{vhf_erstdiagnose | monthyear}}, EHRA {{ehra}}, CHA2DS2-VASc: {{cha2ds2vasc}}, HAS-BLED: {{hasbled}}
- Aktuell: erfolgreiche Pulmonalvenenisolation mittels {{pvi_verfahren}} am {{pvi_datum | date}}
{{#if vorherige_ekv}}
- {{#if vorherige_ekv_primaer_erfolgreich}}(Primär) erfolgreiche{{#else}}Erfolgreiche{{/if}} elektrische Cardioversion {{vorherige_ekv_zeitpunkt | monthyear}}{{#if aa_substanz}}, medikamentöse antiarrhythmische Therapie mit {{aa_substanz}} {{aa_von | monthyear}} – {{aa_bis | monthyear}}{{/if}}
{{/if}}`,
    },
    {
      id: 'epikrise',
      title: 'Epikrise',
      order: 2,
      template: `{{anrede_name}} stellte sich mit symptomatischem {{vhf_typ}}en Vorhofflimmern stationär vor. Nach dem Ausschluss intracavitärer Thromben in einer transösophagealen Echokardiographie erfolgte komplikationslos die Elektrophysiologische Untersuchung mit erfolgreicher Isolation aller Pulmonalvenen mittels {{pvi_verfahren}}. Der weitere Aufenthalt gestaltete sich unauffällig, in seriellen echokardiographischen Kontrollen konnte postinterventionell ein Perikarderguss ausgeschlossen werden. Bei einem CHA2DS2-VASc-Score von {{cha2ds2vasc}} ist eine orale Antikoagulation {{#if cha2ds2vasc >= 2}}dauerhaft{{#else}}für drei Monate{{/if}} indiziert{{#unless pvi_verfahren == "Pulsed Field Ablation"}}, ergänzend ist eine PPI-Therapie in doppelter Standarddosis für vier Wochen nach PVI zu empfehlen{{/unless}}.
${PUNKTIONSSATZ_FEMORAL}
${ENTLASSSATZ_M}`,
    },
    {
      id: 'procedere',
      title: 'Procedere',
      order: 3,
      template: `- Fortführung der oralen Antikoagulation {{#if cha2ds2vasc >= 2}}dauerhaft{{#else}}für drei Monate{{/if}}
{{#unless pvi_verfahren == "Pulsed Field Ablation"}}
- PPI in doppelter Standarddosis für vier Wochen
{{/unless}}
{{#if wv_datum}}
- Wiedervorstellung in unserer rhythmologischen Sprechstunde am {{wv_datum | date}}{{#if wv_uhrzeit}} um {{wv_uhrzeit | time}} Uhr{{/if}}, bitte Einweisungsschein ausstellen
{{/if}}
${PROCEDERE_ZUSATZ}`,
    },
  ],
};

/* ================================================================== */
/* M2 – Sonstige elektrophysiologische Untersuchung                    */
/* ================================================================== */

const epuSonstige = {
  id: 'epu_sonstige',
  title: 'Sonstige elektrophysiologische Untersuchung',
  group: 'Rhythmologie',
  source: `${QUELLE_M} – „Sonstige Elektrophysiologische Untersuchung"`,
  description: 'AVNRT, AVRT/WPW oder typisches Vorhofflattern. Die Antikoagulations-Passagen erscheinen nur beim Vorhofflattern (Beleg: „Nur Vorhofflattern:").',
  sharedGroups: SHARED_GROUPS_KURZFORM,
  fieldGroups: [
    {
      id: 'prozedur',
      title: 'Prozedur',
      fields: [
        {
          key: 'epu_typ',
          label: 'Prozedur',
          type: 'radio',
          required: true,
          default: 'avnrt',
          options: [
            { value: 'avnrt', label: 'AV-Knoten-Reentrytachykardie (Slow-Pathway-Modulation)' },
            { value: 'avrt', label: 'AV-Reentry-Tachykardie / WPW-Syndrom (Bahnablation)' },
            { value: 'flattern', label: 'Typisches Vorhofflattern (CTI-Ablation)' },
          ],
        },
        { key: 'epu_datum', label: 'Datum der EPU', type: 'date', required: true },
        {
          key: 'bahn_lokalisation',
          label: 'Lokalisation der akzessorischen Bahn',
          type: 'select',
          allowCustom: true,
          default: 'posterioren',
          options: [
            { value: 'posterioren', label: 'posterior' },
            { value: 'anterioren', label: 'anterior' },
          ],
          visibleIf: 'epu_typ == "avrt"',
        },
        {
          key: 'flattern_richtung',
          label: 'Flatterrichtung',
          type: 'select',
          default: 'counter-clockwise',
          options: ['clockwise', 'counter-clockwise'],
          visibleIf: 'epu_typ == "flattern"',
        },
        {
          key: 'tee_erfolgt',
          label: 'TEE-Thrombusausschluss erfolgt',
          type: 'checkbox',
          default: true,
          help: 'Beleg: „Nach dem Ausschluss intracavitärer Thromben … / Es erfolgte komplikationslos …"',
        },
      ],
    },
    {
      id: 'antikoagulation',
      title: 'Antikoagulation (nur bei Vorhofflattern)',
      visibleIf: 'epu_typ == "flattern"',
      fields: [FELD_CHA2DS2VASC, FELD_HASBLED],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnosen',
      order: 1,
      template: `{{#if epu_typ == "avnrt"}}
AV-Knoten-Reentrytachykardie
- Aktuell: Modulation des slow-pathway am {{epu_datum | date}}
{{#elseif epu_typ == "avrt"}}
AV-Reentry-Tachykardie/ WPW-Syndrom
- Aktuell: Ablation einer {{bahn_lokalisation}} akzessorischen Leitungsbahn am {{epu_datum | date}}
{{#else}}
Typisches „{{flattern_richtung}}" Vorhofflattern, CHA2DS2-VASc: {{cha2ds2vasc}}, HAS-BLED: {{hasbled}}
- Aktuell: Ablation des Cavotriksupidalen Isthmus am {{epu_datum | date}}
{{/if}}`,
    },
    {
      id: 'epikrise',
      title: 'Epikrise',
      order: 2,
      template: `{{anrede_name}} stellte sich mit {{#if epu_typ == "flattern"}}symptomatischem Vorhofflattern{{#else}}symptomatischen paroxysmalen Tachykardien{{/if}} stationär vor.
{{#if tee_erfolgt}}Nach dem Ausschluss intracavitärer Thromben in einer transösophagealen Echokardiographie erfolgte{{#else}}Es erfolgte{{/if}} komplikationslos die Elektrophysiologische Untersuchung mit erfolgreicher {{#if epu_typ == "avnrt"}}Modulation des slow-pathway bei AVNRT{{#elseif epu_typ == "avrt"}}Ablation einer {{bahn_lokalisation}} akzessorischen Leitungsbahn{{#else}}Ablation des Cavotrikuspidalen Isthmus{{/if}}.
Der weitere Aufenthalt gestaltete sich unauffällig, in echokardiographischen Kontrollen konnte postinterventionell ein Perikarderguss ausgeschlossen werden.
{{#if epu_typ == "flattern"}}
Bei einem CHA2DS2-VASc-Score von {{cha2ds2vasc}} ist eine orale Antikoagulation {{#if cha2ds2vasc >= 2}}dauerhaft{{#else}}für vier Wochen{{/if}} indiziert, bei erneuten Beschwerden bitten wir um Wiedervorstellung über unsere rhythmologische Ambulanz.
{{/if}}
${PUNKTIONSSATZ_FEMORAL}
${ENTLASSSATZ_M}`,
    },
    {
      id: 'procedere',
      title: 'Procedere',
      order: 3,
      template: `{{#if epu_typ == "flattern"}}
- Orale Antikoagulation {{#if cha2ds2vasc >= 2}}dauerhaft{{#else}}für vier Wochen{{/if}}
{{/if}}
- Wiedervorstellung bei erneuten Beschwerden über unsere rhythmologische Ambulanz
${PROCEDERE_ZUSATZ}`,
    },
  ],
};

/* ================================================================== */
/* M3 – Elektrische Cardioversion (stationär)                          */
/* ================================================================== */

const RHYTHMUSSTOERUNGEN = [
  { value: 'Paroxysmalen Vorhofflimmern', label: 'Paroxysmales Vorhofflimmern' },
  { value: 'Kurz-Persistierenden Vorhofflimmern', label: 'Kurz-Persistierendes Vorhofflimmern' },
  { value: 'Persistierenden Vorhofflimmern', label: 'Persistierendes Vorhofflimmern' },
  { value: 'Typischen Vorhofflattern', label: 'Typisches Vorhofflattern' },
  { value: 'Atypischen Vorhofflattern', label: 'Atypisches Vorhofflattern' },
  { value: 'Fokal-Atrialen Tachykardie', label: 'Fokal-Atriale Tachykardie' },
];

/** "(Rezidiv eines/r)" – Artikel richtet sich nach der gewählten Störung. */
const REZIDIV_PRAEFIX = '{{#if rezidiv}}(Rezidiv {{#if rhythmusstoerung contains "Tachykardie"}}einer{{#else}}eines{{/if}}) {{/if}}';

const kardioversionStationaer = {
  id: 'kardioversion_stationaer',
  title: 'Elektrische Cardioversion (stationär)',
  group: 'Rhythmologie',
  source: `${QUELLE_M} – „Elektrische Cardioversion"`,
  description: 'Stationäre elektrische Cardioversion in Kurznarkose nach TEE.',
  sharedGroups: SHARED_GROUPS_KURZFORM,
  fieldGroups: [
    {
      id: 'rhythmus',
      title: 'Rhythmusstörung',
      fields: [
        {
          key: 'rhythmusstoerung',
          label: 'Rhythmusstörung',
          type: 'select',
          required: true,
          default: 'Persistierenden Vorhofflimmern',
          options: RHYTHMUSSTOERUNGEN,
        },
        { key: 'rezidiv', label: 'Rezidiv', type: 'checkbox' },
        {
          key: 'vhf_erstdiagnose',
          label: 'Erstdiagnose',
          type: 'month',
          visibleIf: 'rhythmusstoerung contains "Vorhofflimmern"',
        },
        { ...FELD_EHRA, required: false, visibleIf: 'rhythmusstoerung contains "Vorhofflimmern"' },
        FELD_CHA2DS2VASC,
        FELD_HASBLED,
      ],
    },
    {
      id: 'kardioversion',
      title: 'Cardioversion',
      fields: [
        { key: 'ekv_energie', label: 'Energie', type: 'number', unit: 'J', required: true, help: 'Beleg: „mit XXXJ biphasisch".' },
        { key: 'ekv_datum', label: 'Datum der Cardioversion', type: 'date', required: true },
      ],
    },
    {
      id: 'vorbehandlung',
      title: 'Vorbehandlung',
      fields: [
        { key: 'vorherige_ablation', label: 'Vorausgegangene Ablation / PVI', type: 'checkbox' },
        {
          key: 'vorherige_ablation_verfahren',
          label: 'Verfahren',
          type: 'select',
          options: ['Kryo-Ballon', 'RF'],
          visibleIf: 'vorherige_ablation',
        },
        { key: 'vorherige_ablation_datum', label: 'Datum', type: 'date', visibleIf: 'vorherige_ablation' },
        { key: 'vorherige_ekv', label: 'Vorausgegangene elektrische Cardioversion', type: 'checkbox' },
        { key: 'vorherige_ekv_primaer_erfolgreich', label: 'Primär erfolgreich', type: 'checkbox', visibleIf: 'vorherige_ekv' },
        { key: 'vorherige_ekv_zeitpunkt', label: 'Zeitpunkt', type: 'month', visibleIf: 'vorherige_ekv' },
        { key: 'aa_substanz', label: 'Antiarrhythmikum', type: 'text', visibleIf: 'vorherige_ekv' },
        { key: 'aa_von', label: 'Therapie von', type: 'month', visibleIf: 'aa_substanz not empty' },
        { key: 'aa_bis', label: 'Therapie bis', type: 'month', visibleIf: 'aa_substanz not empty' },
      ],
    },
    {
      id: 'nachsorge',
      title: 'Nachsorge',
      fields: [
        {
          key: 'wv_ort',
          label: 'Wiedervorstellung',
          type: 'select',
          default: 'unserer rhythmologischen Sprechstunde',
          options: [
            { value: 'unserer rhythmologischen Sprechstunde', label: 'Rhythmologische Sprechstunde' },
            { value: 'Station', label: 'Station' },
          ],
        },
        { key: 'wv_station', label: 'Station', type: 'text', visibleIf: 'wv_ort == "Station"' },
        { key: 'wv_datum', label: 'Datum', type: 'date' },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnosen',
      order: 1,
      template: `${REZIDIV_PRAEFIX}{{rhythmusstoerung}}{{#if vhf_erstdiagnose}}, Erstdiagnose {{vhf_erstdiagnose | monthyear}}{{/if}}{{#if ehra}}, EHRA {{ehra}}{{/if}}, CHA2DS2-VASc: {{cha2ds2vasc}}, HAS-BLED: {{hasbled}}
- Aktuell: erfolgreiche elektrische Cardioversion mit {{ekv_energie}}J biphasisch am {{ekv_datum | date}}
{{#if vorherige_ablation}}
- Ablation/ Pulmonalvenenisolation mittels {{vorherige_ablation_verfahren}} am {{vorherige_ablation_datum | date}}
{{/if}}
{{#if vorherige_ekv}}
- {{#if vorherige_ekv_primaer_erfolgreich}}(Primär) erfolgreiche{{#else}}Erfolgreiche{{/if}} elektrische Cardioversion {{vorherige_ekv_zeitpunkt | monthyear}}{{#if aa_substanz}}, medikamentöse antiarrhythmische Therapie mit {{aa_substanz}} {{aa_von | monthyear}} – {{aa_bis | monthyear}}{{/if}}
{{/if}}`,
    },
    {
      id: 'epikrise',
      title: 'Epikrise',
      order: 2,
      template: `{{anrede_name}} stellte sich mit symptomatischem ${REZIDIV_PRAEFIX}{{rhythmusstoerung}} stationär vor. Nach dem Ausschluss intracavitärer Thromben in einer transösophagealen Echokardiographie erfolgte komplikationslos die elektrische Cardioversion mit {{ekv_energie}}J in Kurznarkose. Im weiteren Aufenthalt zeigte sich anhaltend ein normfrequenter Sinusrhythmus. Bei einem CHA2DS2-VASc-Score von {{cha2ds2vasc}} ist eine orale Antikoagulation {{#if cha2ds2vasc >= 2}}dauerhaft{{#else}}für vier Wochen{{/if}} indiziert.
Mit {{anrede_name_dat}} wurden die weiteren Therapieoptionen eines dauerhaften Rhythmuserhaltes (medikamentös vs. Interventionell) besprochen und ein Termin zur Wiedervorstellung wie untenstehend vereinbart.
${ENTLASSSATZ_M}`,
    },
    {
      id: 'procedere',
      title: 'Procedere',
      order: 3,
      template: `- Fortführung der oralen Antikoagulation {{#if cha2ds2vasc >= 2}}dauerhaft{{#else}}für vier Wochen{{/if}}
{{#if wv_datum}}
- Wiedervorstellung in {{wv_ort}}{{#if wv_station}} {{wv_station}}{{/if}} am {{wv_datum | date}}
{{/if}}
${PROCEDERE_ZUSATZ}`,
    },
  ],
};

/* ================================================================== */
/* T6 – TAA bei Vorhofflimmern (Langform)                              */
/* ================================================================== */

const taaVorhofflimmern = {
  id: 'taa_vorhofflimmern',
  title: 'Tachyarrhythmia absoluta bei Vorhofflimmern',
  group: 'Rhythmologie',
  source: `${QUELLE_T} – „TAA bei Vorhofflimmern"`,
  description: 'Modularer Verlauf: acht einzeln zuschaltbare Absätze (OAK, LZ-EKG, Frequenzkontrolle, Kardioversion, Koronarangiographie/Cardio-MRT, Blutdruck, Diabetesberatung).',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'aufnahme',
      title: 'Aufnahme',
      fields: [
        {
          key: 'erstereignis',
          label: 'Erstereignis',
          type: 'select',
          required: true,
          default: 'erstmalig aufgetretenen',
          options: [
            { value: 'erstmalig aufgetretenen', label: 'erstmalig aufgetreten' },
            { value: 'erstmalig diagnostizierten', label: 'erstmalig diagnostiziert' },
          ],
        },
        { key: 'oak_begonnen', label: 'Orale Antikoagulation begonnen', type: 'checkbox' },
        { ...FELD_CHA2DS2VASC, required: false, visibleIf: 'oak_begonnen' },
        { key: 'oak_substanz', label: 'Antikoagulans', type: 'text', visibleIf: 'oak_begonnen' },
      ],
    },
    {
      id: 'diagnostik',
      title: 'Diagnostik',
      fields: [
        { key: 'lz_ekg', label: 'Langzeit-EKG durchgeführt', type: 'checkbox' },
        { key: 'vhf_mittlere_frequenz', label: 'Mittlere Frequenz', type: 'number', unit: '/min', visibleIf: 'lz_ekg' },
        { key: 'taa_max_frequenz', label: 'TAA-Episoden bis', type: 'number', unit: '/min', visibleIf: 'lz_ekg' },
      ],
    },
    {
      id: 'rhythmustherapie',
      title: 'Rhythmus- und Frequenztherapie',
      fields: [
        {
          key: 'frequenzkontrolle',
          label: 'Frequenzkontrolle statt Kardioversion',
          type: 'checkbox',
          help: 'Beleg: „… weshalb wir … von einer Elektrokardioversion absahen und uns auf eine Frequenzkontrolle … beschränkten."',
        },
        {
          key: 'frequenz_substanz',
          label: 'Substanz zur Frequenzkontrolle',
          type: 'select',
          allowCustom: true,
          options: ['Digitoxin', 'Bisoprolol', 'Amiodaron'],
          visibleIf: 'frequenzkontrolle',
        },
        { key: 'ekv_durchgefuehrt', label: 'Elektrokardioversion durchgeführt', type: 'checkbox' },
        { key: 'ekv_energie', label: 'Energie', type: 'number', unit: 'Joule', visibleIf: 'ekv_durchgefuehrt' },
        { key: 'ekv_rezidiv', label: 'Frühes Rezidiv des Vorhofflimmerns', type: 'checkbox', visibleIf: 'ekv_durchgefuehrt' },
        {
          key: 'amiodaron_aufsaettigung_g',
          label: 'Amiodaron-Aufsättigung',
          type: 'number',
          unit: 'g',
          visibleIf: 'ekv_rezidiv',
          help: 'Zieht die Monitoring-Empfehlung (QTc, Schilddrüse, Leber, Lunge, Augenarzt) nach sich.',
        },
      ],
    },
    {
      id: 'weitere_abklaerung',
      title: 'Weitere Abklärung',
      fields: [
        { key: 'koro_erfolgt', label: 'Koronarangiographie zum Ischämieausschluss', type: 'checkbox' },
        { key: 'cmrt_erfolgt', label: 'Cardio-MRT durchgeführt', type: 'checkbox', visibleIf: 'koro_erfolgt' },
        { key: 'bd_eskalation', label: 'Blutdrucktherapie eskaliert', type: 'checkbox' },
        { key: 'diabetesberatung', label: 'Diabetes- und Ernährungsberatung erfolgt', type: 'checkbox' },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: '- Tachyarrhythmia absoluta bei {{erstereignis}} Vorhofflimmern',
    verlauf: `Es erfolgte die stationäre Aufnahme bei einem {{erstereignis}} tachyarrhythmischen Vorhofflimmern.{{#if oak_begonnen}} Bei einem CHADS-VASc-Score von {{cha2ds2vasc}} begannen wir eine orale Antikoagulation mit {{oak_substanz}}.{{/if}}
{{#if lz_ekg}}
Im Langzeit-EKG konnte ein Vorhofflimmern mit mittlerer Frequenz von {{vhf_mittlere_frequenz}}/min nachgewiesen werden, zusätzlich zeigten sich mehrere Episoden einer TAA mit Frequenzen bis zu {{taa_max_frequenz}}/min.
{{/if}}
{{#if frequenzkontrolle}}
Echokardiographisch präsentierte sich ein deutlich dilatierter Vorhof, weshalb wir in Anbetracht {{patient_gen}} und der mangelnden Erfolgsaussicht von einer Elektrokardioversion absahen und uns auf eine Frequenzkontrolle mittels {{frequenz_substanz}} beschränkten.
{{/if}}
{{#if ekv_durchgefuehrt}}
Nach Ausschluss intracavitärer Thromben erfolgte die komplikationslose Elektrokardioversion mittels {{ekv_energie}} Joule in den Sinusrhythmus{{#if ekv_rezidiv}}, es kam allerdings zu einem frühen Rezidiv des Vorhofflimmerns{{/if}}.
{{/if}}
{{#if ekv_rezidiv}}
Wir begannen zur Rhythmuskontrolle eine Dauertherapie mit Amiodaron nach initialer Aufsättigung auf {{amiodaron_aufsaettigung_g}} g. Hierunter stellte sich ein stabiler Sinusrhythmus ein. Wir empfehlen in diesem Zusammenhang die Kontrolle des EKGs (QTc < 500 ms), der Schilddrüsen-, Leber- und Lungenfunktion sowie eine Vorstellung beim Augenarzt im Verlauf. Außerdem empfehlen wir eine regelmäßige kardiologische Anbindung mit echokardiographischen Verlaufskontrollen der Pumpfunktionen.
{{/if}}
{{#if koro_erfolgt}}
In der Echokardiographie zeigte sich eine verminderte linksventrikuläre Pumpfunktion unklarer Genese. Daher erfolgte zum Ausschluss einer Myokardischämie eine Koronarangiographie. Hier zeigte sich kein Anhalt für eine relevante koronare Herzkrankheit bei beginnender Koronarsklerose.{{#if cmrt_erfolgt}} Zur besseren Beurteilung der reduzierten Pumpfunktion erfolgte eine Cardio-MRT-Untersuchung. Hier zeigte sich eine Kardiomyopathie, am ehesten tachysystolischer Genese ohne Anhalt für eine Myokarditis oder infiltrative Erkrankung.{{/if}}
{{/if}}
{{#if bd_eskalation}}
Aufgrund von erhöhten Werten in der Langzeit-Blutdruckuntersuchung eskalierten wir die medikamentöse Blutdrucktherapie.
{{/if}}
{{#if diabetesberatung}}
Bei initial erhöhten Blutzuckerwerten erfolgte eine Diabetes- und Ernährungsberatung.
{{/if}}

Wir entlassen {{patient_akk}} am {{entlass_datum | date}} in gutem Allgemeinzustand in Ihre geschätzte haus-und fachärztliche Weiterbetreuung und stehen bei Rückfragen jederzeit gerne zur Verfügung.`,
    procedere: '',
  }),
};

/* ================================================================== */
/* T11 – Cardioversion (Tagesklinik, ambulant)                         */
/* ================================================================== */

const kardioversionAmbulant = {
  id: 'kardioversion_ambulant',
  title: 'Cardioversion (Tagesklinik, ambulant)',
  group: 'Rhythmologie',
  source: `${QUELLE_T} – „Cardioversion (Tagesklinik ambulant)"`,
  description: 'Ambulante Kardioversion mit taggleicher Entlassung – abweichende Entlassformel („Am selben Tag …").',
  sharedGroups: ['stammdaten', 'risikofaktoren', 'vordiagnosen', 'anamnese_untersuchung', 'befunde', 'therapieempfehlung', 'procedere_frei'],
  fieldGroups: [
    {
      id: 'kardioversion',
      title: 'Cardioversion',
      fields: [
        {
          key: 'ekv_erfolg',
          label: 'Ergebnis',
          type: 'select',
          required: true,
          default: 'Erfolgreiche',
          options: [
            { value: 'Erfolgreiche', label: 'Erfolgreich' },
            { value: 'Frustrane', label: 'Frustran' },
          ],
        },
        { key: 'ekv_anzahl', label: 'Anzahl Schocks', type: 'number', required: true, default: '1', min: 1 },
        { key: 'ekv_energie', label: 'Energie', type: 'number', unit: 'J', required: true },
        {
          key: 'vhf_typ',
          label: 'Rhythmusstörung',
          type: 'select',
          required: true,
          default: 'persistierendem Vorhofflimmern',
          options: [
            { value: 'persistierendem Vorhofflimmern', label: 'Persistierendes Vorhofflimmern' },
            { value: 'paroxysmalem Vorhofflimmern', label: 'Paroxysmales Vorhofflimmern' },
          ],
        },
        { ...FELD_CHA2DS2VASC, help: 'Beleg: „CHADS-VASc-Score XX".' },
        { key: 'oak_substanz', label: 'Orale Antikoagulation mit', type: 'text', required: true },
        { key: 'tee_erfolgt', label: 'TEE-Thrombusausschluss erfolgt', type: 'checkbox', default: true },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnose',
      order: 1,
      template: '- {{ekv_erfolg}} elektrische Kardioversion mit {{ekv_anzahl}}x {{ekv_energie}} J bei {{vhf_typ}}, CHADS-VASc-Score {{cha2ds2vasc}}, OAK mit {{oak_substanz}}',
    },
    { id: 'risikofaktoren', title: 'Kardiovaskuläre Risikofaktoren', order: 2, visibleIf: 'kv_risikofaktoren not empty', template: '{{#each kv_risikofaktoren}}- {{this}}\n{{/each}}' },
    { id: 'vordiagnosen', title: 'Relevante Vordiagnosen', order: 3, visibleIf: 'vordiagnosen not empty', template: '{{#each vordiagnosen}}- {{this.text}}\n{{/each}}' },
    { id: 'untersuchung', title: 'Körperlicher Untersuchungsbefund', order: 4, visibleIf: 'ku_variante not empty', template: '{{#if ku_variante == "kurz"}}{{alter}}-{{jaehriger}} {{patient_wort}} in gutem Allgemein- und normalem Ernährungszustand (Größe {{groesse_cm}} cm, Gewicht {{gewicht_kg}} kg). Cor: auskultatorisch rein, {{ku_rhythmus}}; Pulmo: vesikuläres Atemgeräusch, keine Rasselgeräusche; Fuß- und Leistenpulse gut tastbar, keine Jugularvenenstauung; keine peripheren Ödeme; keine Zyanose; Abdomen: weich, kein Druckschmerz, keine Resistenzen; neurologisch orientierend kein fokal-neurologisches Defizit.{{/if}}' },
    {
      id: 'befunde',
      title: 'Befunde',
      order: 5,
      visibleIf: 'ekg_aufnahme not empty or weitere_befunde not empty',
      template: `{{#if ekg_aufnahme}}
EKG bei Aufnahme:
{{ekg_aufnahme}}
{{/if}}
{{#if weitere_befunde}}
{{weitere_befunde}}
{{/if}}`,
    },
    {
      id: 'verlauf',
      title: 'Therapie und Verlauf',
      order: 6,
      template: `{{#if tee_erfolgt}}Nach Ausschluss intracavitärer Thromben mittels TEE konnte eine {{#if ekv_erfolg == "Erfolgreiche"}}erfolgreiche{{#else}}frustrane{{/if}} elektrische Kardioversion mit {{ekv_anzahl}}x {{ekv_energie}} J in einen Sinusrhythmus durchgeführt werden.{{#else}}Es konnte eine {{#if ekv_erfolg == "Erfolgreiche"}}erfolgreiche{{#else}}frustrane{{/if}} elektrische Kardioversion mit {{ekv_anzahl}}x {{ekv_energie}} J in einen Sinusrhythmus durchgeführt werden.{{/if}}
Die orale Antikoagulation mit {{oak_substanz}} ist fortzuführen.

Am selben Tag konnten wir {{patient_akk}} in stabilem und beschwerdefreiem Zustand wieder in Ihre geschätzte ambulante ärztliche Weiterbehandlung entlassen und stehen für Rückfragen gerne zur Verfügung.`,
    },
    { id: 'therapieempfehlung', title: 'Therapieempfehlung', order: 7, visibleIf: 'medikation not empty or therapieempfehlung_text not empty', template: '{{#each medikation}}- {{this.wirkstoff}}{{#if this.staerke}} {{this.staerke}}{{/if}}{{#if this.schema}} {{this.schema}}{{/if}}\n{{/each}}{{#if therapieempfehlung_text}}{{therapieempfehlung_text}}{{/if}}' },
    { id: 'procedere', title: 'Procedere', order: 8, visibleIf: 'procedere_zusatz not empty', template: PROCEDERE_ZUSATZ },
  ],
};

/* ================================================================== */
/* T12 – EPU bei Vorhofflimmern                                        */
/* ================================================================== */

const epuBeiVhf = {
  id: 'epu_bei_vhf',
  title: 'EPU bei Vorhofflimmern',
  group: 'Rhythmologie',
  source: `${QUELLE_T} – „EPU bei VHF"`,
  description: 'Einzige Vorlage mit vorformuliertem Anamnese-Absatz. Der Kurzbefund lautet hier „arrhythmisch".',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'vhf',
      title: 'Vorhofflimmern',
      fields: [
        {
          key: 'vhf_typ',
          label: 'Typ',
          type: 'select',
          required: true,
          default: 'Persistierendes',
          options: [
            { value: 'Paroxysmales', label: 'Paroxysmales Vorhofflimmern' },
            { value: 'Persistierendes', label: 'Persistierendes Vorhofflimmern' },
          ],
        },
        FELD_EHRA,
        FELD_CHA2DS2VASC,
        {
          key: 'aktueller_rhythmus',
          label: 'Aktueller Rhythmus',
          type: 'select',
          required: true,
          default: 'Vorhofflimmern',
          options: ['Vorhofflimmern', 'Sinusrhythmus'],
        },
      ],
    },
    {
      id: 'prozedur',
      title: 'Prozedur',
      fields: [
        { key: 'epu_datum', label: 'Datum der EPU', type: 'date', required: true },
        {
          key: 'ablation_art',
          label: 'Ablationsverfahren',
          type: 'select',
          required: true,
          default: 'Kryoablation',
          options: ['Kryoablation', 'Radiofrequenzablation', 'Pulsed Field Ablation'],
        },
        { key: 'tee_datum', label: 'Datum der TEE', type: 'date' },
        {
          key: 'punktion_seite',
          label: 'Punktionsstelle',
          type: 'select',
          required: true,
          default: 'rechten',
          options: [{ value: 'rechten', label: 'rechte Leiste' }, { value: 'linken', label: 'linke Leiste' }],
        },
        {
          key: 'anamnese_vorlage',
          label: 'Vorformulierten Anamnese-Absatz verwenden',
          type: 'checkbox',
          default: true,
          help: 'Beleg: „Die Aufnahme erfolgte zur Pulmonalvenenisolation (Kryoablation). … Bereits im letzten Aufenthalt war die PVI geplant …"',
        },
        { key: 'pvi_verschoben', label: 'PVI war zuvor verschoben worden', type: 'checkbox', visibleIf: 'anamnese_vorlage' },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnosen',
      order: 1,
      template: `- {{vhf_typ}} Vorhofflimmern, EHRA {{ehra}}, CHA2DS2-Vasc-Score {{cha2ds2vasc}}, aktuell {{aktueller_rhythmus}}
  - EPU vom {{epu_datum | date}} erfolgreiche {{ablation_art}}, aktuell {{aktueller_rhythmus}}`,
    },
    { id: 'risikofaktoren', title: 'Kardiovaskuläre Risikofaktoren', order: 2, visibleIf: 'kv_risikofaktoren not empty', template: '{{#each kv_risikofaktoren}}- {{this}}\n{{/each}}' },
    { id: 'vordiagnosen', title: 'Relevante Vordiagnosen', order: 3, visibleIf: 'vordiagnosen not empty', template: '{{#each vordiagnosen}}- {{this.text}}\n{{/each}}' },
    {
      id: 'anamnese',
      title: 'Anamnese',
      order: 4,
      visibleIf: 'anamnese_vorlage or anamnese not empty',
      template: `{{#if anamnese_vorlage}}
Die Aufnahme erfolgte zur Pulmonalvenenisolation ({{ablation_art}}). {{anrede_name}} klagt über eine einschränkende Belastbarkeit und Belastungsdyspnoe durch das bekannte Vorhofflimmern beziehungsweise im Rahmen {{patient_poss_gen}} hypertensiven Herzerkrankung.
{{#if pvi_verschoben}}
Bereits im letzten Aufenthalt war die PVI geplant, wurde nach der Koronarangiografie mit DES Implantation auf einen späteren Termin verschoben.
{{/if}}
{{/if}}
{{#if anamnese}}
{{anamnese}}
{{/if}}`,
    },
    {
      id: 'untersuchung',
      title: 'Körperlicher Untersuchungsbefund',
      order: 5,
      visibleIf: 'ku_variante not empty',
      template: '{{alter}}-{{jaehriger}} {{patient_wort}} in gutem Allgemein- und normalem Ernährungszustand (Größe {{groesse_cm}} cm, Gewicht {{gewicht_kg}} kg). Cor: auskultatorisch rein, {{ku_rhythmus}}; Pulmo: vesikuläres Atemgeräusch, keine Rasselgeräusche; Fuß- und Leistenpulse gut tastbar, keine Jugularvenenstauung; keine peripheren Ödeme; keine Zyanose; Abdomen: weich, kein Druckschmerz, keine Resistenzen; neurologisch orientierend kein fokal-neurologisches Defizit.',
    },
    {
      id: 'befunde',
      title: 'Befunde',
      order: 6,
      visibleIf: 'ekg_aufnahme not empty or echo_befund not empty or weitere_befunde not empty or tee_datum not empty',
      template: `{{#if ekg_aufnahme}}
12 Kanal EKG:
{{ekg_aufnahme}}
{{/if}}
{{#if tee_datum}}
Transösophageale Echokardiografie vom {{tee_datum | date}}
{{/if}}
{{#if echo_befund}}
TTE:
{{echo_befund}}
{{/if}}
{{#if weitere_befunde}}
{{weitere_befunde}}
{{/if}}`,
    },
    {
      id: 'verlauf',
      title: 'Therapie und Verlauf',
      order: 7,
      template: `Nach Ausschluss intrakavitärere Thromben mittel TEE erfolgte die komplikationslose EPU am {{epu_datum | date}}.
Postinterventionell konnte ein Perikarderguss ausgeschlossen werden. Die Punktionsstelle in der {{punktion_seite}} Leiste zeigte sich blande bei geringem lokalem Hämatom.
Wir entlassen {{patient_akk}} am {{entlass_datum | date}} in Ihre geschätzte Haus- und fachärztliche Weiterbehandlung.`,
    },
    { id: 'therapieempfehlung', title: 'Therapieempfehlung', order: 8, visibleIf: 'medikation not empty or therapieempfehlung_text not empty', template: '{{#each medikation}}- {{this.wirkstoff}}{{#if this.staerke}} {{this.staerke}}{{/if}}{{#if this.schema}} {{this.schema}}{{/if}}\n{{/each}}{{#if therapieempfehlung_text}}{{therapieempfehlung_text}}{{/if}}' },
    { id: 'procedere', title: 'Procedere', order: 9, visibleIf: 'procedere_zusatz not empty', template: PROCEDERE_ZUSATZ },
  ],
};

__exports.default = [pvi, epuSonstige, kardioversionStationaer, taaVorhofflimmern, kardioversionAmbulant, epuBeiVhf];
  };

  __definitionen["src/data/templates/devices.js"] = function (__exports, __require) {
/* ---- src/data/templates/devices.js ---- */
/**
 * Vorlagen der Gruppe "Devices" (Schrittmacher, CRT-D).
 *
 * Quellen: Musterarztbriefe_Med._I.docx („Schrittmacherimplantation") und
 * Textbausteine_Kardio.docx („Schrittmacher", „CRT-D").
 */

const { PROCEDERE_ZUSATZ, SHARED_GROUPS_KURZFORM, SHARED_GROUPS_LANGFORM, langformRahmen } = __require("../sectionBlocks.js");

const QUELLE_M = 'Musterarztbriefe_Med._I.docx';
const QUELLE_T = 'Textbausteine_Kardio.docx';

const ENTLASSSATZ_M = 'Wir entlassen {{anrede_name_akk}} am {{entlass_datum | dateShort}} in {{entlass_az}} Allgemeinzustand in {{patient_poss}} häusliches Umfeld und ihre weitere fachärztliche Betreuung.';

/**
 * Kontaktangabe der Ambulanz – woertlich aus dem Quelldokument.
 * Die abweichende Schreibweise "Chefarztsekreteriat" (Schrittmacher) bzw.
 * "Chefarztsekretariat" (CRT-D) ist im Original so vorhanden und bleibt je
 * Vorlage unveraendert.
 */
const AMBULANZ_SM = 'RoMed Klinikum Rosenheim, Medizinische Klinik I, Kardiologie, Tel. Chefarztsekreteriat 08031/365 3101';
const AMBULANZ_ICD = 'RoMed Klinikum Rosenheim, Medizinische Klinik I, Kardiologie, Tel. Chefarztsekretariat 08031/365 3101';

const FELD_KAMMERN = {
  key: 'kammer_anzahl',
  label: 'Kammern',
  type: 'select',
  required: true,
  default: 'Zwei',
  options: [
    { value: 'Ein', label: 'Einkammersystem' },
    { value: 'Zwei', label: 'Zweikammersystem' },
    { value: 'Drei', label: 'Dreikammersystem' },
  ],
};

/* ================================================================== */
/* M7 – Schrittmacherimplantation (Hausstandard)                       */
/* ================================================================== */

const schrittmacher = {
  id: 'schrittmacher',
  title: 'Schrittmacherimplantation',
  group: 'Devices',
  source: `${QUELLE_M} – „Schrittmacherimplantation"`,
  description: 'Kompakter Hausstandard zur Schrittmacherimplantation mit Erstkontrolltermin.',
  sharedGroups: SHARED_GROUPS_KURZFORM,
  fieldGroups: [
    {
      id: 'indikation',
      title: 'Indikation',
      fields: [
        {
          key: 'indikation',
          label: 'Rhythmusstörung',
          type: 'select',
          required: true,
          default: 'AV-Block',
          options: [
            { value: 'SA-Block', label: 'SA-Block' },
            { value: 'AV-Block', label: 'AV-Block' },
            { value: 'Bradykardie-Tachykardie-Syndrom', label: 'Bradykardie-Tachykardie-Syndrom' },
          ],
        },
        {
          key: 'block_grad',
          label: 'Grad',
          type: 'select',
          options: ['I°', 'II°', 'III°'],
          visibleIf: 'indikation == "SA-Block" or indikation == "AV-Block"',
        },
      ],
    },
    {
      id: 'implantation',
      title: 'Implantation',
      fields: [
        FELD_KAMMERN,
        { key: 'sm_modus', label: 'Modus', type: 'text', required: true, placeholder: 'z. B. DDD' },
        { key: 'sm_firma', label: 'Firma / Aggregat', type: 'text', required: true },
        { key: 'sm_sn', label: 'Seriennummer (SN)', type: 'text', required: true },
        { key: 'implantation_datum', label: 'Implantationsdatum', type: 'date', required: true },
      ],
    },
    {
      id: 'nachsorge',
      title: 'Nachsorge',
      fields: [
        { key: 'kontrolle_datum', label: 'Erstkontrolle Schrittmacherambulanz', type: 'date', required: true },
        { key: 'kontrolle_uhrzeit', label: 'Uhrzeit', type: 'time', required: true },
        { key: 'oak_pause_tage', label: 'OAK pausieren für', type: 'number', unit: 'Tage' },
        { key: 'oak_wiederbeginn', label: 'Wiederbeginn OAK ab', type: 'date', visibleIf: 'oak_pause_tage not empty' },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnosen',
      order: 1,
      template: `Symptomatischer {{indikation}}{{#if block_grad}} {{block_grad}}{{/if}}
- Aktuell: Implantation eines {{kammer_anzahl}}-Kammer-Schrittmachers ({{sm_modus}}, {{sm_firma}}, SN: {{sm_sn}}) am {{implantation_datum | dateShort}}`,
    },
    {
      id: 'epikrise',
      title: 'Epikrise',
      order: 2,
      template: `{{anrede_name}} wurde mit symptomatischer Rhythmusstörung ({{indikation}}{{#if block_grad}} {{block_grad}}{{/if}}) stationär aufgenommen.
Es erfolgte die komplikationslose Implantation eines {{kammer_anzahl}}-Kammerschrittmacher ({{sm_modus}}, {{sm_firma}}, SN: {{sm_sn}}) am {{implantation_datum | dateShort}}. Postinterventionell lässt sich radiomorphologisch eine korrekte Aggregats- und Sondenlage ohne Anhalt für Pneumothorax abgrenzen. Eine abschließende Device-Kontrolle zeigt eine korrekte Funktion bei unauffälligen Sondenmesswerten. Wir bitten um ambulante Wundkontrolle und Fadenzug in 8-10 Tagen.
Ein Termin zur Erstkontrolle in unserer Schrittmacherambulanz wurde wie untenstehend vereinbart.
{{#if oak_pause_tage}}
Die orale Antikoagulation sollte für {{oak_pause_tage}} Tage nach Implantation pausiert werden.
{{/if}}
${ENTLASSSATZ_M}`,
    },
    {
      id: 'procedere',
      title: 'Procedere',
      order: 3,
      template: `- Wiedervorstellung zur Erstkontrolle in unserer Schrittmacherambulanz am {{kontrolle_datum | dateShortYear}}, {{kontrolle_uhrzeit | time}} Uhr; bitte Überweisungsschein ausstellen
{{#if oak_wiederbeginn}}
- Wiederbeginn OAK ab {{oak_wiederbeginn | dateShort}}
{{/if}}
${PROCEDERE_ZUSATZ}`,
    },
  ],
};

/* ================================================================== */
/* T3 – Schrittmacher (Langform)                                       */
/* ================================================================== */

const schrittmacherLangform = {
  id: 'schrittmacher_langform',
  title: 'Schrittmacherimplantation (Langform)',
  group: 'Devices',
  source: `${QUELLE_T} – „Schrittmacher"`,
  description: 'Ausführliche Fassung mit Fahrverbot, Aggregat-Ausweis und Kontaktangabe der Schrittmacherambulanz.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'indikation',
      title: 'Indikation',
      fields: [
        {
          key: 'indikationen',
          label: 'Indikationen',
          type: 'multiselect',
          required: true,
          options: [
            'symptomatischem AV-Block III° mit Kammerersatzrhythmus',
            'Sick-Sinus-Syndrom',
            'teils kurzen Tachyarrhythmien i.S. von paroxysmalem Vorhofflimmern',
          ],
          help: 'Belegstelle: Diagnose- und Verlaufssatz der Vorlage „Schrittmacher".',
        },
        {
          key: 'sss_frequenz',
          label: 'Frequenzen bis',
          type: 'number',
          unit: '/min',
          visibleIf: 'indikationen contains "Sick-Sinus-Syndrom"',
          help: 'Beleg: „mit Frequenzen bis xx/min und präsynkopalen Zuständen".',
        },
      ],
    },
    {
      id: 'implantation',
      title: 'Implantation',
      fields: [
        FELD_KAMMERN,
        {
          key: 'sm_firma',
          label: 'Firma / Aggregat',
          type: 'select',
          required: true,
          allowCustom: true,
          default: 'St. Jude Medical',
          options: ['St. Jude Medical', 'Medtronic'],
        },
        { key: 'sm_modus', label: 'Modus', type: 'text', required: true },
        { key: 'sm_sn', label: 'Seriennummer (SN)', type: 'text', required: true },
        { key: 'implantation_datum', label: 'Implantationsdatum', type: 'date', required: true },
        { key: 'kontrolle_device_datum', label: 'Datum der Schrittmacherkontrolle', type: 'date' },
      ],
    },
    {
      id: 'nachsorge',
      title: 'Nachsorge',
      fields: [
        { key: 'kontrolle_datum', label: 'Ambulanztermin', type: 'date', required: true },
        { key: 'kontrolle_uhrzeit', label: 'Uhrzeit', type: 'time', required: true },
        {
          key: 'fahrverbot',
          label: 'Fahrverbot',
          type: 'select',
          required: true,
          default: '3 Monate',
          options: ['3 Monate', '6 Monate', '12 Monate', 'lebenslang'],
        },
        { key: 'oak_pause_tage', label: 'Antikoagulantien pausieren für', type: 'number', unit: 'Tage', default: '5' },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: 'Implantation eines {{kammer_anzahl}}-Kammer-Schrittmachers (Firma/Aggregat: {{sm_firma}}, Modus: {{sm_modus}}, SN: {{sm_sn}}) am {{implantation_datum | date}} bei {{indikationen | enum:"sowie"}}{{#if sss_frequenz}} mit Frequenzen bis {{sss_frequenz}}/min und präsynkopalen Zuständen{{/if}}.',
    verlauf: `Die stationäre Aufnahme {{patient_gen}} erfolgte zur Implantation eines Schrittmachers bei Nachweis eines {{indikationen | enum:"sowie"}}{{#if sss_frequenz}} mit Frequenzen bis {{sss_frequenz}}/min und präsynkopalen Zuständen{{/if}}.
Am {{implantation_datum | date}} erfolgte die komplikationslose Implantation eines {{kammer_anzahl}}kammerschrittmachers (Firma/Aggregat: {{sm_firma}}, Modus: {{sm_modus}}, SN: {{sm_sn}})
Radiomorphologisch ergab sich im Röntgen-Thorax bei regelrechter Aggregat- und Sondenpositionierung kein Anhalt für einen Pneumothorax.
{{#if kontrolle_device_datum}}
In der Schrittmacherkontrolle vom {{kontrolle_device_datum | date}} zeigte sich eine regelrechte Funktion des Aggregats.
{{/if}}
{{anrede_name}} hat am {{kontrolle_datum | date}} um {{kontrolle_uhrzeit | time}} Uhr einen Termin zur ambulanten Vorstellung zur Schrittmacher-Kontrolle mit hausärztlicher Überweisung in unserer Schrittmacherambulanz (${AMBULANZ_SM}).
Ein Fahrverbot über {{fahrverbot}} ist aus medizinischer Sicht zwingend erforderlich. Ein Aggregat-Ausweis und eine Infobroschüre wurden {{patient_dat}} ausgehändigt.
Das Nahtmaterial sollte bei regelmäßiger Wundkontrolle und Verbandswechsel in ca. 8-10 Tagen entfernt werden.
{{#if oak_pause_tage}}
Für {{oak_pause_tage}} Tage nach Schrittmacherimplantation ist eine Behandlung mit Antikoagulantien zu pausieren.
{{/if}}

Am {{entlass_datum | date}} entließen wir {{patient_akk}} in kardiopulmonal stabilem und beschwerdefreiem Zustand wieder in Ihre geschätzte ambulante ärztliche Weiterbehandlung und stehen für Rückfragen gerne zur Verfügung.`,
    procedere: `- Nach regelmäßigen Wundkontrollen und Verbandswechsel, Entfernung des Nahtmaterials 8-10 Tage postoperativ.
{{#if oak_pause_tage}}
- Für {{oak_pause_tage}} Tage nach Schrittmacherimplantation Antikoagulantien pausieren.
{{/if}}
- Schrittmacherkontrolle am {{kontrolle_datum | date}} in unserer Schrittmacherambulanz mit hausärztlicher Überweisung.`,
  }),
};

/* ================================================================== */
/* T4 – CRT-D-Implantation                                             */
/* ================================================================== */

const crtD = {
  id: 'crt_d',
  title: 'CRT-D-Implantation',
  group: 'Devices',
  source: `${QUELLE_T} – „CRT-D"`,
  description: 'Elektive CRT-D-Implantation bei hochgradig eingeschränkter LV-Funktion und breitem Linksschenkelblock.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'device',
      title: 'Device',
      fields: [
        { key: 'aggregat', label: 'Firma / Aggregat', type: 'text', required: true, placeholder: 'z. B. Quadra Assura/Jude Medical' },
        { key: 'sn', label: 'Seriennummer (SN)', type: 'text', required: true },
        { key: 'implantation_datum', label: 'Implantationsdatum', type: 'date', required: true },
        { key: 'kontrolle_device_datum', label: 'Datum der Defibrillatorkontrolle', type: 'date' },
      ],
    },
    {
      id: 'grunderkrankung',
      title: 'Grunderkrankung',
      fields: [
        {
          key: 'kardiomyopathie_dd',
          label: 'Kardiomyopathie DD',
          type: 'multiselect',
          required: true,
          default: ['dilatativ', 'ischämisch'],
          options: ['dilatativ', 'ischämisch'],
        },
      ],
    },
    {
      id: 'nachsorge',
      title: 'Nachsorge',
      fields: [
        { key: 'kontrolle_datum', label: 'Ambulanztermin', type: 'date', required: true },
        { key: 'kontrolle_uhrzeit', label: 'Uhrzeit', type: 'time', required: true },
        { key: 'remarcumarisierung_datum', label: 'Beginn der Remarcumarisierung', type: 'date' },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: `- Implantation eines CRT-D-Systems (Firma/Aggregat: {{aggregat}}, SN: {{sn}}) bei
  - Kardiomyopathie DD {{kardiomyopathie_dd | join:" DD "}}`,
    verlauf: `Die stationäre Aufnahme {{patient_gen}} erfolgte am {{aufnahme_datum | date}} zur elektiven CRT-D-Implantation bei hochgradig eingeschränkter linksventrikulärer Pumpfunktion und Asynchronie bei einem breiten Linksschenkelblock.
Am {{implantation_datum | date}} erfolgte die komplikationslose Implantation des CRT-D-Systems.
Radiomorphologisch ergab sich im Röntgen-Thorax kein Anhalt für einen Pneumothorax sowie eine korrekte Sondenlage.
{{#if kontrolle_device_datum}}
In der Schrittmacher-/Defibrillatorkontrolle vom {{kontrolle_device_datum | date}} zeige sich eine regelrechte Funktion des Aggregats.
{{/if}}
{{anrede_name}} hat am {{kontrolle_datum | date}} um {{kontrolle_uhrzeit | time}} Uhr einen Termin zur ambulanten Vorstellung zur Defibrillator-Kontrolle mit hausärztlicher Überweisung in unserer Defibrillatorambulanz (${AMBULANZ_ICD}).
Das Nahtmaterial sollte bei regelmäßiger Wundkontrolle und Verbandswechsel in ca. 8-10 Tagen entfernt werden.

Am {{entlass_datum | date}} entlassen wir {{patient_akk}} in stabilem und beschwerdefreiem Zustand wieder in Ihre geschätzte ambulante ärztliche Weiterbehandlung und stehen für Rückfragen gerne zur Verfügung.`,
    procedere: `- Nach regelmäßigen Wundkontrollen Entfernung des Nahtmaterials in 8-10 Tagen.
{{#if remarcumarisierung_datum}}
- Beginn der Remarcumarisierung ab dem {{remarcumarisierung_datum | date}}
{{/if}}
- Schrittmacher-/Defibrillatorkontrolle am {{kontrolle_datum | date}} in unserer Schrittmacherambulanz mit hausärztlicher Überweisung (${AMBULANZ_ICD})`,
  }),
};

__exports.default = [schrittmacher, schrittmacherLangform, crtD];
  };

  __definitionen["src/data/templates/klappen.js"] = function (__exports, __require) {
/* ---- src/data/templates/klappen.js ---- */
/**
 * Vorlagen der Gruppe "Klappenvitien".
 *
 * Quellen: Musterarztbriefe_Med._I.docx („Aortenklappenstenose/TAVI") und
 * Textbausteine_Kardio.docx („Klappenoperation").
 *
 * Die genannten Kooperationspartner (Radiologisches Zentrum Rosenheim,
 * Deutsches Herzzentrum München, Schön Klinik Vogtareuth) stehen so in den
 * Quelldokumenten und sind daher fest hinterlegt.
 */

const { PROCEDERE_ZUSATZ, SHARED_GROUPS_KURZFORM, SHARED_GROUPS_LANGFORM, langformRahmen } = __require("../sectionBlocks.js");

const QUELLE_M = 'Musterarztbriefe_Med._I.docx';
const QUELLE_T = 'Textbausteine_Kardio.docx';

/* ================================================================== */
/* M6 – Aortenklappenstenose / TAVI                                    */
/* ================================================================== */

const aortenklappenstenoseTavi = {
  id: 'aortenklappenstenose_tavi',
  title: 'Aortenklappenstenose / TAVI',
  group: 'Klappenvitien',
  source: `${QUELLE_M} – „Aortenklappenstenose/TAVI"`,
  description: 'Hochgradige Aortenklappenstenose mit Indikation zur TAVI, ambulantem TAVI-CT und Heart-Team-Vorstellung.',
  sharedGroups: SHARED_GROUPS_KURZFORM,
  fieldGroups: [
    {
      id: 'klappe',
      title: 'Klappenbefund',
      fields: [
        { key: 'koef', label: 'KÖF', type: 'number', unit: 'cm²', step: '0.1', required: true, help: 'Beleg: „KÖF: 0,X cm²". Dezimalpunkt eingeben – die Ausgabe erfolgt mit Komma.' },
        { key: 'pmean', label: 'pmean', type: 'number', unit: 'mmHg', required: true },
        {
          key: 'aufnahmegrund',
          label: 'Aufnahmegrund',
          type: 'select',
          required: true,
          default: 'Belastungsdyspnoe',
          options: ['Belastungsdyspnoe', 'dekompensierter Herzinsuffizienz'],
        },
        {
          key: 'indikationsgrund',
          label: 'Indikationsgrund',
          type: 'select',
          required: true,
          default: 'der Symptome',
          options: [
            { value: 'der Symptome', label: 'Symptome' },
            { value: 'der eingeschränkten Linksventrikulären Funktion', label: 'Eingeschränkte linksventrikuläre Funktion' },
          ],
        },
        {
          key: 'tavi_grund',
          label: 'Begründung für das interventionelle Verfahren',
          type: 'select',
          required: true,
          default: 'des fortgeschrittenen Patientenalters',
          options: [
            { value: 'des fortgeschrittenen Patientenalters', label: 'Fortgeschrittenes Patientenalter' },
            { value: 'der ausgeprägten Komorbiditäten (Frailty-Syndrom)', label: 'Ausgeprägte Komorbiditäten (Frailty-Syndrom)' },
          ],
        },
      ],
    },
    {
      id: 'khk',
      title: 'Begleitende KHK',
      fields: [
        { key: 'khk_vorhanden', label: 'Chronisches Koronarsyndrom vorhanden', type: 'checkbox' },
        {
          key: 'gefaesserkrankung',
          label: 'Gefäßerkrankung',
          type: 'select',
          options: [
            { value: '1', label: '1-Gefäßerkrankung' },
            { value: '2', label: '2-Gefäßerkrankung' },
            { value: '3', label: '3-Gefäßerkrankung' },
          ],
          visibleIf: 'khk_vorhanden',
        },
        { key: 'koro_befund', label: 'Koronarangiographischer Befund', type: 'multiline', rows: 2, visibleIf: 'khk_vorhanden' },
      ],
    },
    {
      id: 'termine',
      title: 'Termine',
      fields: [
        { key: 'tavi_ct_datum', label: 'Ambulantes TAVI-CT (Radiologisches Zentrum Rosenheim)', type: 'date', required: true },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnosen',
      order: 1,
      template: `Hochgradige Aortenklappenstenose mit Indikation zur TAVI
- KÖF: {{koef | num}} cm², pmean {{pmean}}mmHg
{{#if khk_vorhanden}}
Chronisches Koronarsyndrom bei {{gefaesserkrankung}}-Gefäßerkrankung
{{/if}}`,
    },
    {
      id: 'epikrise',
      title: 'Epikrise',
      order: 2,
      template: `{{anrede_name}} stellte sich mit {{aufnahmegrund}} stationär vor. Echokardiographisch imponiert eine hochgradige Aortenklappenstenose (KÖF {{koef | num}}cm²), angesichts {{indikationsgrund}} stellt sich die Indikation zum Aortenklappenersatz. Die weiteren OP-Vorbereitungen wurden wie obenstehend durchgeführt, angesichts {{tavi_grund}} wurde die Indikation zum interventionellen Klappenersatz gestellt.{{#if khk_vorhanden}} Koronarangiographisch zeigt sich eine {{gefaesserkrankung}}-Gefäßerkrankung{{#if koro_befund}} mit {{koro_befund}}{{/if}}{{/if}}
Eine ambulante TAVI-CT wurde im Radiologischen Zentrum Rosenheim wie untenstehend vereinbart. Ein Termin im Deutschen Herzzentrum München zur Heart-Team-Vorstellung und ggf. TAVI wird durch uns vereinbart und {{anrede_name_dat}} telefonisch mitgeteilt.
Wir entlassen {{anrede_name_akk}} am {{entlass_datum | dateShort}} in {{entlass_az}} Allgemeinzustand in {{patient_poss}} häusliches Umfeld und ihre weitere fachärztliche Betreuung.`,
    },
    {
      id: 'procedere',
      title: 'Procedere',
      order: 3,
      template: `- Ambulantes TAVI-CT am radiologischen Zentrum Rosenheim am {{tavi_ct_datum | date}}
- Terminmitteilung am Deutschen Herzzentrum München erfolgt durch unser Sekretariat
${PROCEDERE_ZUSATZ}`,
    },
  ],
};

/* ================================================================== */
/* T9 – Klappenoperation (operativer Ersatz, Verlegung)                */
/* ================================================================== */

const klappenoperation = {
  id: 'klappenoperation',
  title: 'Klappenoperation (operativer Ersatz)',
  group: 'Klappenvitien',
  source: `${QUELLE_T} – „Klappenoperation"`,
  description: 'Symptomatisch hochgradige Aortenklappenstenose mit Indikation zur operativen Versorgung und Verlegung.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'klappe',
      title: 'Klappenbefund',
      fields: [
        {
          key: 'klappe',
          label: 'Vitium',
          type: 'select',
          required: true,
          allowCustom: true,
          default: 'Aortenklappenstenose',
          options: ['Aortenklappenstenose'],
          help: 'Belegwert der Vorlage. Andere Vitien können als Freitext ergänzt werden.',
        },
        { key: 'koef', label: 'KÖF', type: 'number', unit: 'cm²', step: '0.1', required: true },
        { key: 'ef_prozent', label: 'EF', type: 'number', unit: '%', required: true },
        { key: 'lv_funktion', label: 'LV-Funktion', type: 'text', placeholder: 'z. B. normale' },
        { key: 'diast_funktion', label: 'Diastolische Funktion', type: 'text', placeholder: 'z. B. gestörte' },
      ],
    },
    {
      id: 'verlauf_felder',
      title: 'Verlauf',
      fields: [
        { key: 'aufnahmegrund', label: 'Aufnahmegrund', type: 'text', required: true, default: 'Schwindel und präsynkopalen Ereignissen' },
        {
          key: 'auskultation',
          label: 'Systolikum auskultiert',
          type: 'checkbox',
          default: true,
          help: 'Beleg: „Systolikum mit Punktum maximum im 2.ICR parasternal rechts ohne eindeutige Fortleitung".',
        },
        { key: 'echo_klappe', label: 'Echokardiographischer Befund', type: 'multiline', rows: 2 },
        { key: 'koro_befund', label: 'Koronarangiographischer Befund', type: 'multiline', rows: 2 },
      ],
    },
    {
      id: 'op',
      title: 'Operation und Vorbereitung',
      fields: [
        { key: 'aufnahme_extern_datum', label: 'Aufnahmetermin Schön Klinik Vogtareuth', type: 'date', required: true },
        { key: 'op_datum', label: 'Datum der Klappenoperation', type: 'date', required: true },
        { key: 'verlegung_datum', label: 'Verlegungsdatum', type: 'date', required: true },
        { key: 'praeop_rx_thorax', label: 'Röntgen-Thorax ohne pulmonalvenöse Stauung', type: 'checkbox', default: true },
        { key: 'praeop_nnh', label: 'Nasennebenhöhlen ohne floride Sinusitis', type: 'checkbox', default: true },
        { key: 'praeop_abdomen', label: 'Abdomensonographie unauffällig', type: 'checkbox', default: true },
        { key: 'praeop_lufu', label: 'Lungenfunktionsdiagnostik unauffällig', type: 'checkbox', default: true },
        { key: 'praeop_zahnarzt', label: 'Zahnärztliche Untersuchung unauffällig', type: 'checkbox', default: true },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: `- Symptomatisch hochgradige {{klappe}} mit Indikation zur operativen Klappenversorgung
  - Echokardiographisch KÖF {{koef | num}} cm2, EF {{ef_prozent}}%{{#if lv_funktion}}, {{lv_funktion}} LV-Funktion{{/if}}{{#if diast_funktion}}, {{diast_funktion}} diastolische Funktion{{/if}}`,
    verlauf: `Die stationäre Aufnahme {{patient_gen}} erfolgte aufgrund von {{aufnahmegrund}}.{{#if auskultation}} Auskultatorisch zeigte sich ein Systolikum mit Punktum maximum im 2.ICR parasternal rechts ohne eindeutige Fortleitung.{{/if}}
{{#if echo_klappe}}
Echokardiographisch fand sich eine {{echo_klappe}}
{{/if}}
Es besteht die Indikation zum operativen Klappenersatz, sodass wir eine Koronarangiographie durchführten.{{#if koro_befund}} Hierbei zeigte sich {{koro_befund}}{{/if}}
Die aktuelle Situation, Krankheitsbild und das Procedere wurden mit {{patient_dat}} ausführlich besprochen. Wir vereinbarten einen Aufnahmetermin in der Schön Klinik Vogtareuth am {{aufnahme_extern_datum | date}} zur Klappenoperation am {{op_datum | date}}.
In den präoperativen Vorbereitungsuntersuchungen ergaben sich keine Kontraindikationen für den bevorstehenden Eingriff.
{{#if praeop_rx_thorax or praeop_nnh or praeop_abdomen or praeop_lufu or praeop_zahnarzt}}
{{#if praeop_rx_thorax}}Im Röntgen-Thorax zeigten sich keine Hinweise auf pulmonalvenöse Stauung. {{/if}}{{#if praeop_nnh}}In der Aufnahme der Nasennebenhöhlen ergaben sich keine Hinweise auf eine floride Sinusitis. {{/if}}{{#if praeop_abdomen}}Die Abdomensonographie war unauffällig. {{/if}}{{#if praeop_lufu}}In der Lungenfunktionsdiagnostik zeigten sich keine Auffälligkeiten. {{/if}}{{#if praeop_zahnarzt}}Die zahnärztliche Untersuchung war soweit unauffällig.{{/if}}
{{/if}}

Wir konnten {{patient_akk}} am {{verlegung_datum | date}} in stabilem Allgemeinzustand in die Schön Klinik Vogtareuth verlegen.`,
    procedere: '- Aufnahmetermin in der Schön Klinik Vogtareuth am {{aufnahme_extern_datum | date}} zur Klappenoperation am {{op_datum | date}}',
  }),
};

__exports.default = [aortenklappenstenoseTavi, klappenoperation];
  };

  __definitionen["src/data/templates/herzkreislauf.js"] = function (__exports, __require) {
/* ---- src/data/templates/herzkreislauf.js ---- */
/**
 * Vorlagen der Gruppen "Herzinsuffizienz", "Gefäße" und "Hypertonie".
 *
 * Quelle: Textbausteine_Kardio.docx („Kardiale Dekompensation",
 * „Lungenarterienembolie", „Hypertensive Krise").
 */

const { langformRahmen, SHARED_GROUPS_LANGFORM } = __require("../sectionBlocks.js");

const QUELLE_T = 'Textbausteine_Kardio.docx';

const ENTLASSSATZ_T_HAUS = 'Wir entlassen {{patient_akk}} am {{entlass_datum | date}} in gutem Allgemeinzustand in Ihre geschätzte haus-und fachärztliche Weiterbetreuung und stehen bei Rückfragen jederzeit gerne zur Verfügung.';

/* ================================================================== */
/* T5 – Kardiale Dekompensation                                        */
/* ================================================================== */

const kardialeDekompensation = {
  id: 'kardiale_dekompensation',
  title: 'Kardiale Dekompensation',
  group: 'Herzinsuffizienz',
  source: `${QUELLE_T} – „Kardiale Dekompensation"`,
  description: 'Dekompensierte Herzinsuffizienz. Der Verlaufsabsatz wechselt je nach Ansprechen auf die diuretische Therapie.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'diagnose',
      title: 'Diagnose',
      fields: [
        {
          key: 'grunderkrankung',
          label: 'Dekompensierte Herzinsuffizienz bei',
          type: 'text',
          required: true,
          placeholder: 'z. B. ischämischer Kardiomyopathie',
        },
      ],
    },
    {
      id: 'verlauf_felder',
      title: 'Verlauf',
      fields: [
        { key: 'ntprobnp', label: 'NT-pro-BNP', type: 'number', unit: 'pg/ml' },
        {
          key: 'diurese_verlauf',
          label: 'Ansprechen auf die diuretische Therapie',
          type: 'radio',
          required: true,
          default: 'forciert',
          options: [
            { value: 'forciert', label: 'Gutes Ansprechen unter forcierter diuretischer Therapie' },
            { value: 'perfusor', label: 'Ungenügendes Ansprechen auf Furosemid i.v. → Perfusor' },
          ],
        },
        { key: 'entlassgewicht', label: 'Entlassgewicht', type: 'number', unit: 'kg', required: true },
        {
          key: 'mobilisiert_kg',
          label: 'Insgesamt mobilisiert',
          type: 'number',
          unit: 'kg',
          visibleIf: 'diurese_verlauf == "perfusor"',
        },
        {
          key: 'umstellung_torasemid',
          label: 'Umstellung auf Torasemid',
          type: 'checkbox',
          visibleIf: 'diurese_verlauf == "perfusor"',
        },
        {
          key: 'lvef_grad',
          label: 'Einschränkung der LVEF',
          type: 'select',
          options: [
            { value: 'leicht', label: 'leichtgradig' },
            { value: 'mittel', label: 'mittelgradig' },
            { value: 'hoch', label: 'hochgradig' },
          ],
          help: 'Beleg: „XXgradig eingeschränkte LVEF bei…."',
        },
        { key: 'lvef_zusatz', label: 'Ergänzung zum Echobefund', type: 'text', visibleIf: 'lvef_grad not empty' },
        { key: 'lz_ekg_unauffaellig', label: 'LZ-EKG: durchgehender Sinusrhythmus', type: 'checkbox' },
        { key: 'lz_rr_normoton', label: 'LZ-RR: normotensive Werte', type: 'checkbox' },
        {
          key: 'troponin_auslenkung',
          label: 'Dezente Troponin-T-Auslenkung',
          type: 'checkbox',
          help: 'Beleg: „… ist im Rahmen der Dekompensation zu werten."',
        },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: '- Dekompensierte Herzinsuffizienz bei {{grunderkrankung}}',
    verlaufTitel: 'Therapie & Verlauf',
    verlauf: `Die stationäre Aufnahme {{patient_gen}} erfolgte bei kardialer Dekompensation verbunden mit Dyspnoe. Radiologisch imponierte eine pulmonalvenöse Stauung und in der körperlichen Untersuchung waren deutliche Beinödeme nachweisbar.
{{#if ntprobnp}}
Das NT-pro-BNP lag bei {{ntprobnp}}.
{{/if}}
{{#if diurese_verlauf == "forciert"}}
Unter einer forcierten diuretischen Therapie konnten eine deutliche Beschwerdebesserung und eine gute Negativbilanz (Entlassgewicht: {{entlassgewicht}} kg) erzielt werden.
{{#else}}
Eine gesteigerte diuretische Therapie mit Furosemid i.v. bewirkte ein ungenügendes Ansprechen, sodass eine Furosemid-Gabe mittels Perfusore eingeleitet wurde. Hierunter konnten eine deutliche Beschwerdebesserung und eine gute Negativbilanz (Entlassgewicht: {{entlassgewicht}} kg) erzielt werden.{{#if mobilisiert_kg}} Insgesamt konnte {{mobilisiert_kg}} kg mobilisiert werden.{{/if}}{{#if umstellung_torasemid}} Wir stellten im Verlauf auf Torasemid um.{{/if}}
{{/if}}
{{#if lvef_grad}}
Echokardiographisch zeigte sich eine {{lvef_grad}}gradig eingeschränkte LVEF{{#if lvef_zusatz}} bei {{lvef_zusatz}}{{/if}}
{{/if}}
{{#if lz_ekg_unauffaellig or lz_rr_normoton}}

{{#if lz_ekg_unauffaellig}}Im LZ-EKG stellte sich ein durchgehender Sinusrhythmus ohne höhergradige Rhythmusstörungen dar. {{/if}}{{#if lz_rr_normoton}}Ein LZ-RR zeigte normotensive Werte.{{/if}}
{{/if}}
{{#if troponin_auslenkung}}
Die dezente Troponin-T-Auslenkung ist im Rahmen der Dekompensation zu werten.
{{/if}}
Wir empfehlen tägliche Gewichtskontrollen und eine maximale tägliche Flüssigkeitszufuhr von 1,5 l.

Am {{entlass_datum | date}} konnten wir {{patient_akk}} in stabilem und beschwerdefreiem Zustand wieder in Ihre geschätzte ambulante ärztliche Weiterbehandlung entlassen und stehen für Rückfragen gerne zur Verfügung.`,
    procedere: `- Regelmäßige Nierenretentionsparameter- und Elektrolytkontrollen unter diuretischer Therapie
- Tägliche Gewichtskontrollen
- Tägliche Flüssigkeitszufuhr von max. 1,5 L
- Ausreizen der Herzinsuffizienztherapie`,
  }),
};

/* ================================================================== */
/* T7 – Lungenarterienembolie                                          */
/* ================================================================== */

const lungenarterienembolie = {
  id: 'lungenarterienembolie',
  title: 'Lungenarterienembolie',
  group: 'Gefäße',
  source: `${QUELLE_T} – „Lungenarterienembolie"`,
  description: 'Lungenarterienembolie mit CT-Nachweis, stufenweiser Antikoagulation und Dauerempfehlung nach Provokationsstatus.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'diagnose',
      title: 'Diagnose',
      fields: [
        {
          key: 'lae_lokalisation',
          label: 'Lokalisation',
          type: 'select',
          required: true,
          allowCustom: true,
          default: 'Beidseitige',
          options: [
            { value: 'Beidseitige', label: 'Beidseitig' },
            { value: 'Rechtsseitige', label: 'Rechtsseitig' },
            { value: 'Linksseitige', label: 'Linksseitig' },
          ],
        },
        { key: 'erstdiagnose', label: 'Erstdiagnose (ED)', type: 'checkbox', default: true },
        {
          key: 'reitender_thrombus_seite',
          label: 'Reitender Thrombus in der A. pulmonalis',
          type: 'select',
          options: [
            { value: '', label: '– kein reitender Thrombus –' },
            { value: 'rechten', label: 'rechts' },
            { value: 'linken', label: 'links' },
          ],
        },
        { key: 'partialinsuffizienz', label: 'Respiratorische Partialinsuffizienz', type: 'checkbox', default: true },
      ],
    },
    {
      id: 'verlauf_felder',
      title: 'Verlauf',
      fields: [
        {
          key: 'ueberwachung_ort',
          label: 'Überwachung',
          type: 'select',
          options: [
            { value: '', label: '– keine Verlegung –' },
            { value: 'internistische Intensivstation', label: 'Internistische Intensivstation' },
            { value: 'CPU', label: 'CPU' },
          ],
        },
        { key: 'echo_lae', label: 'Echokardiographischer Befund', type: 'multiline', rows: 2 },
        { key: 'tvt_ausgeschlossen', label: 'Tiefe Beinvenenthrombose sonographisch ausgeschlossen', type: 'checkbox' },
        { key: 'oak_substanz', label: 'Orale Antikoagulation', type: 'select', required: true, allowCustom: true, default: 'Apixaban', options: ['Apixaban'] },
        {
          key: 'ereignis_typ',
          label: 'Ereignis',
          type: 'select',
          required: true,
          default: 'unprovozierten',
          options: [
            { value: 'unprovozierten', label: 'unprovoziert' },
            { value: 'provozierten', label: 'provoziert' },
          ],
        },
        {
          key: 'oak_monate',
          label: 'Antikoagulation für',
          type: 'select',
          required: true,
          default: '3',
          options: [{ value: '3', label: '3 Monate' }, { value: '6', label: '6 Monate' }],
        },
        { key: 'kompressionsstruempfe', label: 'Antithrombosestrümpfe Klasse II verordnet', type: 'checkbox', default: true },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: `- {{lae_lokalisation}} Lungenarterienembolie{{#if erstdiagnose}} (ED){{/if}}{{#if reitender_thrombus_seite}} mit reitendem Thrombus in der {{reitender_thrombus_seite}} A. pulmonalis{{/if}}
{{#if partialinsuffizienz}}
  - Respiratorische Partialinsuffizienz
{{/if}}`,
    verlauf: `Die stationäre Aufnahme {{patient_gen}} erfolgte bei zunehmender Dyspnoe. Laborchemisch zeigten sich ein erhöhtes D-Dimer und eine respiratorische Partialinsuffizienz. Bei klinischem Verdacht auf eine Lungenarterienembolie führten wir ein Thorax-CT durch. Hierbei konnte eine {{lae_lokalisation | lower}} Lungenarterienembolie{{#if reitender_thrombus_seite}} mit reitendem Thrombus in der {{reitender_thrombus_seite}} A. pulmonalis{{/if}} nachgewiesen werden.
{{#if ueberwachung_ort}}
Zur weiteren Überwachung erfolgte die Verlegung auf die {{ueberwachung_ort}}. Bei kardiopulmonal stabiler Situation konnte {{patient_nom}} schließlich auf Normalstation verlegt werden.
{{/if}}
{{#if echo_lae}}
Echokardiographisch fand sich eine {{echo_lae}}
{{/if}}
{{#if tvt_ausgeschlossen}}
Eine tiefe Beinvenenthrombose konnte sonographisch ausgeschlossen werden.
{{/if}}
Nach einer initialen Heparinisierung mittels Heparinperfusor stellten wir die Antikoagulation im Verlauf auf ein nierdemolekulares Heparin und schlussendlich auf {{oak_substanz}} um.
Bei einem {{ereignis_typ}} Ereignis empfehlen wir eine Antikoagulation für insgesamt {{oak_monate}} Monate.
{{#if kompressionsstruempfe}}
Antithrombosestrümpfe der Klasse II wurden verordnet.
{{/if}}

${ENTLASSSATZ_T_HAUS}`,
    procedere: `- Antikoagulation mit {{oak_substanz}} für insgesamt {{oak_monate}} Monate
{{#if kompressionsstruempfe}}
- Antithrombosestrümpfe der Klasse II
{{/if}}`,
  }),
};

/* ================================================================== */
/* T8 – Hypertensive Krise                                             */
/* ================================================================== */

const hypertensiveKrise = {
  id: 'hypertensive_krise',
  title: 'Hypertensive Krise',
  group: 'Hypertonie',
  source: `${QUELLE_T} – „Hypertensive Krise"`,
  description: 'Hypertensive Entgleisung mit stufenweiser Abklärung sekundärer Ursachen – jeder Abklärungsschritt ist einzeln zuschaltbar.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'diagnose',
      title: 'Diagnose und Akuttherapie',
      fields: [
        { key: 'rr_max', label: 'Blutdruck bis max.', type: 'number', unit: 'mmHg', required: true },
        { key: 'akuttherapie', label: 'Initiale Blutdrucksenkung mit', type: 'text', required: true, placeholder: 'z. B. Urapidil' },
        {
          key: 'therapie_verzichtet',
          label: 'Auf weitere antihypertensive Therapie vorerst verzichtet',
          type: 'checkbox',
          default: true,
        },
        {
          key: 'lz_rr_befund',
          label: 'Langzeit-RR',
          type: 'text',
          required: true,
          default: 'tagsüber leicht hypertone Durchschnittswerte',
        },
      ],
    },
    {
      id: 'abklaerung',
      title: 'Abklärung sekundärer Ursachen',
      description: 'Jeder aktivierte Punkt fügt den zugehörigen Absatz aus der Vorlage ein.',
      fields: [
        { key: 'abklaerung_cushing', label: 'Cushing-Syndrom (Cortisol, ACTH, Dexamethasonhemmtest)', type: 'checkbox' },
        { key: 'abklaerung_phaeo', label: 'Phäochromozytom (Metanephrine im Plasma)', type: 'checkbox' },
        { key: 'abklaerung_nierenarterie', label: 'Nierenarterienstenose (Duplexsonographie)', type: 'checkbox' },
        { key: 'abklaerung_hyperaldo', label: 'Hyperaldosteronismus (Aldosteron/Renin)', type: 'checkbox' },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: '- Hypertensive Krise bis max. {{rr_max}} mmHg',
    verlauf: `Die stationäre Aufnahme {{patient_gen}} erfolgte bei hypertensiver Entgleisung. Nach initialer Blutdrucksenkung mit {{akuttherapie}} zeigten sich während des Aufenthaltes in engmaschigen Kontrollen normotone Werte.{{#if therapie_verzichtet}} Auf eine weitere antihypertensive Therapie verzichteten wir deshalb vorerst.{{/if}} Ein Langzeit-RR und Langzeit-EKG-Messung wurde durchgeführt. Im Langzeit-RR ergaben sich {{lz_rr_befund}}. Wir empfehlen eine erneute LZ-RR-Messung in 4 Wochen. Abhängig davon kann ggf. eine antihypertensive Therapie erwogen werden. Ein Langzeit-EKG zeigte keine relevanten Herzrhythmusstörungen.
{{#if abklaerung_cushing or abklaerung_phaeo or abklaerung_nierenarterie or abklaerung_hyperaldo}}
Zur Abklärung möglicher sekundärer Ursachen eines Hypertonus wurden weitere Tests durchgeführt.
{{/if}}
{{#if abklaerung_cushing}}
So wurde zum Ausschluss eines Cushing-Syndroms Cortisol und ACTH bestimmt, sowie eine Dexamethasonhemmtest durchgeführt. Die Ergebnisse waren normwertig.
{{/if}}
{{#if abklaerung_phaeo}}
Zum Ausschluss eines Phächromozytoms bestimmten wir die Metanephrine im Plasma, welche nicht erhöht waren.
{{/if}}
{{#if abklaerung_nierenarterie}}
Eine Nierenarterienstenose konnte duplexsonographisch, bei eingeschränkter Beurteilbarkeit nicht sicher ausgeschlossen werden. Bei weiterem Verdacht auf sekundäre Hypertonie kann, in Abhängigkeit der Verlaufskontrolle der LZ-RR-Messung, diesbezüglich die Durchführung einer MRT-Angiographie im Verlauf erwogen werden.
{{/if}}
{{#if abklaerung_hyperaldo}}
Zur Abklärung eines möglichen Hyperaldosteronismus wurden Aldosteron und Renin bestimmt. Hierbei zeigte sich ein erhöhter Aldosteron-Renin-Quotient, weshalb der Verdacht auf einen primären Hyperaldosteronismus besteht. Wir empfehlen die Durchführung eines Kochsalzbelastungstestes. Die Durchführung eines solchen wäre auch in unserer Abteilung möglich.
{{/if}}

${ENTLASSSATZ_T_HAUS}`,
    procedere: `- Erneute LZ-RR-Messung in 4 Wochen
{{#if abklaerung_hyperaldo}}
- Durchführung eines Kochsalzbelastungstestes
{{/if}}`,
  }),
};

__exports.default = [kardialeDekompensation, lungenarterienembolie, hypertensiveKrise];
  };

  __definitionen["src/data/templates/pneumologie.js"] = function (__exports, __require) {
/* ---- src/data/templates/pneumologie.js ---- */
/**
 * Vorlagen der Gruppe "Pneumologie / Onkologie".
 *
 * Quelle: Textbausteine_Kardio.docx. Diese Briefe stehen im hinteren Teil des
 * Dokuments und gehoeren nicht zur Kardiologie, sind aber Bestandteil der
 * gelieferten Vorlagen und werden daher vollstaendig uebernommen.
 */

const { PROCEDERE_ZUSATZ, SECTION_BEFUNDE, SECTION_THERAPIEEMPFEHLUNG } = __require("../sectionBlocks.js");

const QUELLE_T = 'Textbausteine_Kardio.docx';

const BASIS_GRUPPEN = ['stammdaten', 'aufenthalt', 'vordiagnosen', 'anamnese_untersuchung', 'befunde', 'therapieempfehlung', 'procedere_frei'];

/* ================================================================== */
/* T13 – Infektexazerbierte COPD                                       */
/* ================================================================== */

const copdExazerbation = {
  id: 'copd_exazerbation',
  title: 'Infektexazerbierte COPD',
  group: 'Pneumologie',
  source: `${QUELLE_T} – „Infektexacerbierte COPD"`,
  description: 'Infektexazerbation einer bekannten COPD mit Antibiose, Inhalations- und Kortisontherapie.',
  sharedGroups: BASIS_GRUPPEN,
  fieldGroups: [
    {
      id: 'copd',
      title: 'COPD',
      fields: [
        {
          key: 'gold_stadium',
          label: 'GOLD-Stadium',
          type: 'select',
          required: true,
          allowCustom: true,
          default: 'II-III',
          options: ['I', 'II', 'III', 'IV', 'II-III', 'III-IV'],
        },
        { key: 'fev1_liter', label: 'Aktuelle FEV1', type: 'number', unit: 'L', step: '0.01', required: true },
        { key: 'fev1_prozent', label: 'FEV1', type: 'number', unit: '%', step: '0.1', required: true },
        { key: 'emphysem', label: 'Zentrilobuläres Lungenemphysem', type: 'checkbox' },
        { key: 'o2_nacht_lmin', label: 'Nächtliche O2-Substitution', type: 'number', unit: 'l O2/min' },
      ],
    },
    {
      id: 'therapie_felder',
      title: 'Therapie und Verlauf',
      fields: [
        { key: 'antibiose', label: 'Antibiotische Therapie', type: 'select', required: true, allowCustom: true, default: 'Ampicillin/Sulbactam', options: ['Ampicillin/Sulbactam'] },
        { key: 'blutkulturen_negativ', label: 'Blutkulturen ohne Keimwachstum', type: 'checkbox', default: true },
        { key: 'kortison_dosis_aktuell', label: 'Kortison-Tagesdosis bei Entlassung', type: 'number', unit: 'mg' },
        { key: 'kortison_zieldosis', label: 'Zieldosis im Verlauf', type: 'number', unit: 'mg', visibleIf: 'kortison_dosis_aktuell not empty' },
        { key: 'lufu_gebessert', label: 'Lungenfunktion gegenüber Voruntersuchung gebessert', type: 'checkbox', default: true },
        { key: 'torasemid_reduziert', label: 'Torasemiddosis reduziert', type: 'checkbox' },
        { key: 'mobilisation_hilfsmittel', label: 'Mobilisation mit', type: 'text', placeholder: 'z. B. Rollator' },
        { key: 'ahb_ort', label: 'Anschlussheilbehandlung in', type: 'text' },
        { key: 'ahb_datum', label: 'AHB vorgesehen ab', type: 'date', visibleIf: 'ahb_ort not empty' },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Diagnosen',
      order: 1,
      template: `Infektexacerbierte COPD GOLD {{gold_stadium}}, aktuelle FEV1 {{fev1_liter | num}}L ({{fev1_prozent | num}}%)
{{#if emphysem}}
- zentrilobuläres Lungenemphysem
{{/if}}
{{#if o2_nacht_lmin}}
- nächtliche O2-Substitution mit {{o2_nacht_lmin}} l O2/min, tagsüber keine Sauerstofftherapie
{{/if}}
{{#each vordiagnosen}}
- {{this.text}}
{{/each}}`,
    },
    { ...SECTION_BEFUNDE, order: 2 },
    {
      id: 'verlauf',
      title: 'Therapie und Verlauf',
      order: 3,
      template: `Die stationäre Aufnahme {{patient_gen}} erfolgte bei erneuter Infektexacerbation der bekannten COPD. Bei Fieber sowie deutlich erhöhten Infektparametern wurde umgehend eine antibiotische Therapie mit {{antibiose}} eingeleitet, zudem erfolgte eine antiobstruktive Inhalationstherapie begleitet von systemischer antinflammatorischer Therapie.
Hierunter waren die Entzündungsparameter gut rückläufig, der Zustand {{patient_gen}} besserte sich langsam.{{#if blutkulturen_negativ}} In entnommenen Blutkulturen konnte kein Keimwachstum festgestellt werden.{{/if}}{{#if kortison_dosis_aktuell}} Die Kortisontherapie wurde zuletzt auf eine Tagesdosis von {{kortison_dosis_aktuell}}mg reduziert, wir bitten um weitere Reduktion bis {{kortison_zieldosis}}mg im Verlauf.{{/if}}
{{#if lufu_gebessert}}
Lungenfunktionell zeigte sich eine im Vergleich zu den Voruntersuchungen leicht gebesserte Vitalkapazität sowie FEV1.
{{/if}}
{{#if torasemid_reduziert}}
Radiologisch zeigten sich allenfalls Zeichen einer geringen pulmonalvenösen Stauung, das Körpergewicht im Vergleich zum Voraufenthalt jedoch konstant. Die Torasemiddosis wurde im Verlauf reduziert, wir bitten hierunter um regelmäßige Gewichtskontrollen.
{{/if}}
{{#if mobilisation_hilfsmittel}}
Mittels physiotherapeutischer Beübung gelang eine zunehmend gebesserte Mobilisierung {{patient_gen}} am {{mobilisation_hilfsmittel}}.
{{/if}}
Wir konnten {{patient_akk}} am {{entlass_datum | date}} im deutlich gebesserten Allgemeinzustand nach Hause entlassen.{{#if ahb_ort}} Eine Fortsetzung der Anschlussheilbehandlung in {{ahb_ort}} ist ab {{ahb_datum | date}} vorgesehen.{{/if}}`,
    },
    { ...SECTION_THERAPIEEMPFEHLUNG, order: 4 },
    { id: 'procedere', title: 'Procedere', order: 5, visibleIf: 'procedere_zusatz not empty', template: PROCEDERE_ZUSATZ },
  ],
};

/* ================================================================== */
/* T14 – Septische Pneumonie                                           */
/* ================================================================== */

const pneumonie = {
  id: 'pneumonie',
  title: 'Septische Pneumonie',
  group: 'Pneumologie',
  source: `${QUELLE_T} – „Schwere septische Pneumonie"`,
  description: 'Schwere ambulant erworbene Pneumonie mit antibiotischer Therapie.',
  sharedGroups: BASIS_GRUPPEN,
  fieldGroups: [
    {
      id: 'pneumonie_felder',
      title: 'Pneumonie',
      fields: [
        {
          key: 'lokalisation',
          label: 'Lokalisation',
          type: 'select',
          required: true,
          allowCustom: true,
          default: 'rechten Unterlappen',
          options: ['rechten Unterlappen', 'linken Unterlappen', 'rechten Oberlappen', 'linken Oberlappen', 'rechten Mittellappen'],
        },
        {
          key: 'erworben',
          label: 'Erwerbsart',
          type: 'select',
          required: true,
          default: 'community-aquired',
          options: [
            { value: 'community-aquired', label: 'ambulant erworben (community-aquired)' },
            { value: 'nosokomial', label: 'nosokomial' },
          ],
          help: 'Die Schreibweise „community-aquired" steht so im Quelldokument.',
        },
        {
          key: 'antibiose_substanzen',
          label: 'Antibiotische Therapie',
          type: 'multiselect',
          required: true,
          default: ['Clarithromycin', 'Ceftriaxon'],
          options: ['Clarithromycin', 'Ceftriaxon'],
        },
        { key: 'antibiose_tage', label: 'Therapiedauer', type: 'number', unit: 'Tage', required: true, default: '6' },
        { key: 'ventilationsstoerung', label: 'Initial restriktive Ventilationsstörung', type: 'checkbox', default: true },
        { key: 'pleuraerguss_ausgeschlossen', label: 'Sonographisch kein Pleuraerguss', type: 'checkbox', default: true },
        { key: 'ct_vorbefund', label: 'CT Thorax im Vorjahr ambulant erfolgt', type: 'checkbox' },
        { key: 'allergien', label: 'Allergien', type: 'text', placeholder: 'z. B. Penicillin' },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Diagnosen',
      order: 1,
      template: `Schwere septische Pneumonie im {{lokalisation}}, {{erworben}}
{{#each vordiagnosen}}
- {{this.text}}
{{/each}}
{{#if allergien}}
- Allergien: {{allergien}}
{{/if}}`,
    },
    { ...SECTION_BEFUNDE, order: 2, title: 'Technische Befunde' },
    {
      id: 'verlauf',
      title: 'Therapie und Verlauf',
      order: 3,
      template: `Die Aufnahme erfolgte bei einer septischen Pneumonie des {{lokalisation}}s. Wir behandelten antibiotisch mittels {{antibiose_substanzen | enum}} für {{antibiose_tage}} Tage.
{{#if ventilationsstoerung or pleuraerguss_ausgeschlossen or ct_vorbefund}}
{{#if ventilationsstoerung}}Initial zeigte sich eine restriktive Ventilationsstörung, {{/if}}{{#if pleuraerguss_ausgeschlossen}}sonografisch fand sich kein Anhalt für einen Pleuraerguss. {{/if}}{{#if ct_vorbefund}}Bereits Herbst letzten Jahres erhielt {{patient_nom}} ein CT Thorax im ambulanten Bereich.{{/if}}
{{/if}}`,
    },
    { ...SECTION_THERAPIEEMPFEHLUNG, order: 4 },
    { id: 'procedere', title: 'Procedere', order: 5, visibleIf: 'procedere_zusatz not empty', template: PROCEDERE_ZUSATZ },
  ],
};

/* ================================================================== */
/* T15 – Lungenkarzinom, Staging-Komplettierung                        */
/* ================================================================== */

const lungenkarzinomStaging = {
  id: 'lungenkarzinom_staging',
  title: 'Lungenkarzinom – Staging-Komplettierung',
  group: 'Pneumologie',
  source: `${QUELLE_T} – „Adenokarzinom des rechten Lungenoberlappenostiums"`,
  description: 'Elektive Aufnahme zur Komplettierung des Stagings bei Erstdiagnose eines Lungenkarzinoms.',
  sharedGroups: BASIS_GRUPPEN,
  fieldGroups: [
    {
      id: 'tumor',
      title: 'Tumor',
      fields: [
        { key: 'histologie', label: 'Histologie', type: 'text', required: true, default: 'Gering differenziertes Adenokarzinom' },
        { key: 'lokalisation', label: 'Lokalisation', type: 'text', required: true, default: 'des rechten Lungenoberlappenostiums' },
        { key: 'ed_monat', label: 'Erstdiagnose', type: 'month', required: true },
        { key: 'grading', label: 'Grading', type: 'select', required: true, default: 'G3', options: ['G1', 'G2', 'G3', 'G4'] },
        { key: 'tnm', label: 'TNM', type: 'text', required: true, placeholder: 'z. B. cT4N3M1a' },
        { key: 'uicc', label: 'Stadium nach UICC8', type: 'text', required: true, placeholder: 'z. B. IV A' },
        { key: 'pdl1_prozent', label: 'PD-L1', type: 'number', unit: '%' },
        { key: 'pleuraerguss_malign', label: 'Maligner Pleuraerguss', type: 'checkbox' },
        {
          key: 'pleuraerguss_seite',
          label: 'Seite',
          type: 'select',
          options: ['rechts', 'links'],
          visibleIf: 'pleuraerguss_malign',
        },
        {
          key: 'metastasen',
          label: 'Metastasen / weitere Befunde',
          type: 'list',
          addLabel: 'Befund hinzufügen',
          itemLabel: '{{this.text}}',
          itemFields: [{ key: 'text', label: 'Befund', type: 'text', required: true, placeholder: 'z. B. V.a. hepatische Metastasierung im Lebersegment 2' }],
        },
      ],
    },
    {
      id: 'diagnostik',
      title: 'Diagnostik',
      fields: [
        {
          key: 'tumormarker',
          label: 'Tumormarker',
          type: 'list',
          addLabel: 'Tumormarker hinzufügen',
          itemLabel: '{{this.name}} {{this.wert}}',
          itemFields: [
            { key: 'name', label: 'Marker', type: 'text', required: true, placeholder: 'z. B. Cyfra 21-1' },
            { key: 'wert', label: 'Wert', type: 'text', required: true },
            { key: 'einheit', label: 'Einheit', type: 'text', default: 'ng/ml' },
            { key: 'referenz', label: 'Referenz', type: 'text', placeholder: 'z. B. < 3.30' },
          ],
        },
        { key: 'molekulardiagnostik_nachgefordert', label: 'Molekulardiagnostik nachgefordert', type: 'checkbox' },
        { key: 'molekulardiagnostik_ort', label: 'Pathologie', type: 'text', visibleIf: 'molekulardiagnostik_nachgefordert', default: 'Starnberg' },
        { key: 'atelektase', label: 'Ausgeprägte Atelektase mit Begleiterguss im Röntgen-Thorax', type: 'checkbox' },
        { key: 'punktion_datum', label: 'Datum der Pleurapunktion', type: 'date', visibleIf: 'atelektase' },
        { key: 'punktion_menge_ml', label: 'Drainierte Menge', type: 'number', unit: 'ml', visibleIf: 'atelektase' },
        { key: 'bronchoskopie_befund', label: 'Bronchoskopischer Befund', type: 'multiline', rows: 2 },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnose',
      order: 1,
      template: `{{histologie}} {{lokalisation}} (ED {{ed_monat | monthyear}}), {{grading}}, {{tnm}} Stadium {{uicc}} nach UICC8
{{#if pdl1_prozent}}
PDL1 {{pdl1_prozent}}%
{{/if}}
{{#if pleuraerguss_malign}}
Maligner PLE {{pleuraerguss_seite}}
{{/if}}
{{#each metastasen}}
{{this.text}}
{{/each}}`,
    },
    {
      id: 'befunde',
      title: 'Technische Befunde',
      order: 2,
      visibleIf: 'labor_auffaellig not empty or tumormarker not empty or weitere_befunde not empty',
      template: `{{#if labor_auffaellig}}
Pathologische Laborparameter bei Aufnahme:
{{labor_auffaellig}}
{{/if}}
{{#if tumormarker}}
Tumormarker: {{#each tumormarker}}{{this.name}} {{this.wert}} {{this.einheit}}{{#if this.referenz}} ({{this.referenz}}){{/if}}{{#unless @last}}, {{/unless}}{{/each}}.
{{/if}}
{{#if weitere_befunde}}
{{weitere_befunde}}
{{/if}}`,
    },
    {
      id: 'verlauf',
      title: 'Therapie und Verlauf',
      order: 3,
      template: `Elektive Aufnahme zur Komplettierung des Stagings bei Erstdiagnose eines {{histologie | lower}}s {{lokalisation}}.{{#if molekulardiagnostik_nachgefordert}} Bei noch nicht erfolgter Molekulardiagnostik wurde diese in der Pathologie {{molekulardiagnostik_ort}} nachgefordert.{{/if}}
{{#if atelektase}}
Im Röntgen-Thorax zeigte sich eine ausgeprägte Atelektase rechts mit Begleiterguss. Dieser wurde am {{punktion_datum | date}} komplikationslos punktiert. Es konnten insgesamt {{punktion_menge_ml}} ml Erguss drainiert werden. Die Histopathologie ergab den Nachweis von Zellen eines Adenokarzinoms.
{{/if}}
{{#if bronchoskopie_befund}}
Bronchoskopisch zeigte sich {{bronchoskopie_befund}} Histologisch zeigten sich in den Proben Zellen vereinbar mit einem Adenokarzinom. Die weitere immunhistochemische Untersuchung folgt.
{{/if}}`,
    },
    { ...SECTION_THERAPIEEMPFEHLUNG, order: 4 },
    { id: 'procedere', title: 'Procedere', order: 5, visibleIf: 'procedere_zusatz not empty', template: PROCEDERE_ZUSATZ },
  ],
};

__exports.default = [copdExazerbation, pneumonie, lungenkarzinomStaging];
  };

  __definitionen["src/data/templates/allgemein.js"] = function (__exports, __require) {
/* ---- src/data/templates/allgemein.js ---- */
/**
 * Vorlage der Gruppe "Allgemein".
 *
 * Quelle: Textbausteine_Kardio.docx, Abschlussbrief bei Versterben eines
 * Patienten. Der Wortlaut ist bewusst unveraendert uebernommen; es handelt
 * sich um eine besonders sensible Vorlage.
 */

const QUELLE_T = 'Textbausteine_Kardio.docx';

const todesfallPalliativ = {
  id: 'todesfall_palliativ',
  title: 'Todesfall / palliativer Verlauf',
  group: 'Allgemein',
  source: `${QUELLE_T} – „Zusammenfassung und Verlauf" (Todesfall)`,
  description: 'Mitteilung über das Versterben einer Patientin oder eines Patienten nach palliativem Verlauf.',
  sharedGroups: ['stammdaten', 'vordiagnosen', 'therapieempfehlung'],
  fieldGroups: [
    {
      id: 'verlauf_felder',
      title: 'Verlauf',
      fields: [
        { key: 'vorstellung_datum', label: 'Datum der Vorstellung', type: 'date', required: true },
        {
          key: 'vorstellung_grund',
          label: 'Vorstellungsgrund',
          type: 'text',
          required: true,
          placeholder: 'z. B. zunehmender kardialer Dekompensation und starken Beinschmerzen',
        },
        { key: 'befund_klinisch', label: 'Klinischer und radiologischer Aufnahmebefund', type: 'multiline', rows: 3 },
        { key: 'befund_echo', label: 'Echokardiographischer Befund', type: 'multiline', rows: 3 },
        { key: 'antibiose_initial', label: 'Initiale antibiotische Therapie', type: 'text' },
        { key: 'antibiose_eskalation', label: 'Eskalation auf', type: 'text', visibleIf: 'antibiose_initial not empty' },
        { key: 'infektfokus', label: 'Infektfokus', type: 'multiline', rows: 2 },
        {
          key: 'therapielimitation',
          label: 'Therapielimitationen mit Angehörigen festgelegt',
          type: 'checkbox',
          default: true,
        },
        { key: 'todesdatum', label: 'Todesdatum', type: 'date', required: true },
      ],
    },
  ],
  sections: [
    {
      id: 'zusammenfassung',
      title: 'Zusammenfassung und Verlauf',
      order: 1,
      template: `Mit Bedauern müssen wir Ihnen vom Tode {{patient_gen}} gemeinsamen {{patient_wort}}, {{anrede_kurz}}{{#if vorname}} ({{voller_name}}){{/if}} berichten.
{{anrede_name}} stellte sich am {{vorstellung_datum | date}} bei {{vorstellung_grund}} in der zentralen Notaufnahme vor.
{{#if befund_klinisch}}
{{befund_klinisch}}
{{/if}}
{{#if befund_echo}}
{{befund_echo}}
{{/if}}
{{#if antibiose_initial}}
Bei einem septischen Infektbild unklarer Genese begannen wir eine i.v. Therapie mit {{antibiose_initial}}.{{#if antibiose_eskalation}} Bei weiterhin steigenden Entzündungsparameter und klinischen Zeichen der Sepsis erfolgte die Eskalation auf {{antibiose_eskalation}}.{{/if}}
{{/if}}
{{#if infektfokus}}
{{infektfokus}}
{{/if}}
Der Allgemeinzustand von {{anrede_kurz}} verschlechterte sich während des stationären Aufenthaltes zunehmends.
{{#if therapielimitation}}
Die Situation wurde mit den Angehörigen ausführlich besprochen. Gemeinsam wurden Therapielimitationen festgelegt und der Beginn palliativer Maßnahmen eingeleitet.
{{/if}}
{{anrede_name}} verstarb hierunter friedlich am {{todesdatum | dateShortYear}}. Wir bedauern diesen Verlauf.`,
    },
    {
      id: 'vordiagnosen',
      title: 'Relevante Vordiagnosen',
      order: 2,
      visibleIf: 'vordiagnosen not empty',
      template: '{{#each vordiagnosen}}- {{this.text}}\n{{/each}}',
    },
  ],
};

__exports.default = [todesfallPalliativ];
  };

  __definitionen["src/data/templates/index.js"] = function (__exports, __require) {
/* ---- src/data/templates/index.js ---- */
/**
 * Sammelstelle aller mitgelieferten Vorlagen.
 *
 * Die Vorlagen werden hier normalisiert und als `readOnly` markiert: Sie
 * lassen sich im Editor duplizieren und ueberschreiben, das Original bleibt
 * jedoch jederzeit wiederherstellbar.
 */

const { normaliseTemplate } = __require("../../core/schema.js");
const koronar = __require("./koronar.js").default;
const rhythmologie = __require("./rhythmologie.js").default;
const devices = __require("./devices.js").default;
const klappen = __require("./klappen.js").default;
const herzkreislauf = __require("./herzkreislauf.js").default;
const pneumologie = __require("./pneumologie.js").default;
const allgemein = __require("./allgemein.js").default;

const RAW_TEMPLATES = [
  ...koronar,
  ...rhythmologie,
  ...devices,
  ...klappen,
  ...herzkreislauf,
  ...pneumologie,
  ...allgemein,
];

const BUILTIN_TEMPLATES = RAW_TEMPLATES.map((template) => normaliseTemplate({ ...template, readOnly: true }));

const BUILTIN_IDS = new Set(BUILTIN_TEMPLATES.map((template) => template.id));

__exports.default = BUILTIN_TEMPLATES;

      /* Exporte */
      __exports["BUILTIN_TEMPLATES"] = BUILTIN_TEMPLATES;
      __exports["BUILTIN_IDS"] = BUILTIN_IDS;
  };

  __definitionen["src/ui/dom.js"] = function (__exports, __require) {
/* ---- src/ui/dom.js ---- */
/**
 * DOM-Hilfsfunktionen.
 *
 * SICHERHEIT: In diesem Projekt wird `innerHTML` niemals mit Daten befuellt.
 * Alle Elemente entstehen ueber `document.createElement`, alle Texte ueber
 * `textContent`. Damit kann ein importiertes Template keine Skripte oder
 * Ereignis-Attribute einschleusen (siehe DOCS/ARCHITECTURE_AND_BUGS.md, 3.1).
 */

/**
 * Erzeugt ein Element.
 * @param {string} tag
 * @param {object} [props]    Eigenschaften; `class`, `dataset`, `on` und
 *                            `attrs` werden gesondert behandelt.
 * @param {Array|Node|string} [children]
 */
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props || {})) {
    if (value === undefined || value === null || value === false) continue;

    if (key === 'class') {
      node.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : String(value);
    } else if (key === 'dataset') {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        if (dataValue !== undefined && dataValue !== null) node.dataset[dataKey] = String(dataValue);
      }
    } else if (key === 'on') {
      for (const [eventName, handler] of Object.entries(value)) {
        if (typeof handler === 'function') node.addEventListener(eventName, handler);
      }
    } else if (key === 'attrs') {
      for (const [attrName, attrValue] of Object.entries(value)) {
        if (attrValue === undefined || attrValue === null || attrValue === false) continue;
        node.setAttribute(attrName, attrValue === true ? '' : String(attrValue));
      }
    } else if (key === 'text') {
      node.textContent = String(value);
    } else {
      node[key] = value;
    }
  }

  append(node, children);
  return node;
}

function append(parent, children) {
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

function replaceChildren(node, children) {
  clear(node);
  return append(node, children);
}

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

/**
 * Kopiert Text in die Zwischenablage.
 *
 * Unter `file://` ist der Kontext in einigen Browsern nicht „secure", dort
 * steht `navigator.clipboard` nicht zur Verfuegung. Deshalb gibt es einen
 * Rueckfallpfad ueber ein temporaeres Textfeld.
 *
 * @returns {Promise<boolean>} ob das Kopieren gelungen ist
 */
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Rueckfall unten
  }

  try {
    const helper = el('textarea', {
      value: text,
      attrs: { readonly: true, 'aria-hidden': 'true', tabindex: '-1' },
      style: 'position:fixed;top:-1000px;left:-1000px;opacity:0',
    });
    document.body.appendChild(helper);
    helper.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(helper);
    return ok;
  } catch {
    return false;
  }
}

/** Loest einen lokalen Download aus – ohne jeden Netzwerkzugriff. */
function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = el('a', { href: url, download: filename });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Fuegt Text an der Cursorposition eines Textfelds ein. */
function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const needsLeadingBreak = before !== '' && !before.endsWith('\n');
  const prefix = needsLeadingBreak ? '\n' : '';
  textarea.value = before + prefix + text + after;
  const caret = start + prefix.length + text.length;
  textarea.selectionStart = caret;
  textarea.selectionEnd = caret;
  textarea.focus();
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

      /* Exporte */
      __exports["el"] = el;
      __exports["append"] = append;
      __exports["clear"] = clear;
      __exports["replaceChildren"] = replaceChildren;
      __exports["$"] = $;
      __exports["$$"] = $$;
      __exports["copyToClipboard"] = copyToClipboard;
      __exports["downloadJson"] = downloadJson;
      __exports["insertAtCursor"] = insertAtCursor;
  };

  __definitionen["src/core/letter.js"] = function (__exports, __require) {
/* ---- src/core/letter.js ---- */
/**
 * Erzeugt aus Template + Eingaben den fertigen Brief.
 */

const { render } = __require("../engine/renderer.js");
const { joinSections } = __require("../engine/cleanup.js");
const { evaluateCondition } = __require("../engine/expression.js");
const { isEmpty } = __require("../engine/values.js");
const { withDerivedValues } = __require("./derived.js");
const { resolveFieldGroups } = __require("./schema.js");

/**
 * Ist ein Feld/eine Gruppe/ein Abschnitt unter den aktuellen Eingaben sichtbar?
 */
function isVisible(entry, data) {
  if (!entry?.visibleIf) return true;
  return evaluateCondition(entry.visibleIf, data, () => {});
}

/**
 * Erzeugt alle Abschnitte des Briefs.
 *
 * @param {object} template
 * @param {object} values           Rohwerte aus der Maske
 * @param {Map} sharedGroupsById
 * @param {{ manualSections?: Map<string,string> }} [options]
 */
function generateLetter(template, values, sharedGroupsById, options = {}) {
  const manualSections = options.manualSections ?? new Map();
  const data = withDerivedValues(values);
  const errors = [];
  const sections = [];

  if (!template) return { sections, errors, data };

  for (const section of template.sections) {
    if (!section.enabled) continue;
    if (!isVisible(section, data)) continue;

    const manualEntry = manualSections.get(section.id);
    const result = render(section.template, data);
    for (const message of result.errors) {
      const prefixed = `${section.title}: ${message}`;
      if (!errors.includes(prefixed)) errors.push(prefixed);
    }

    const generated = result.text;
    const isManual = Boolean(manualEntry);

    sections.push({
      id: section.id,
      title: section.title,
      text: isManual ? manualEntry.text : generated,
      generatedText: generated,
      manual: isManual,
      /**
       * Die Vorlage bzw. die Eingaben haben sich geaendert, seit der Abschnitt
       * von Hand bearbeitet wurde – die manuelle Fassung ist also nicht mehr
       * auf dem aktuellen Stand.
       */
      outdated: isManual && manualEntry.basedOn !== generated,
      empty: generated.trim() === '',
    });
  }

  return { sections, errors, data };
}

/** Gesamtbrief als Text. */
function letterToText(sections, { withTitles = true } = {}) {
  return joinSections(sections, { withTitles });
}

/**
 * Prueft Pflichtfelder. Nur sichtbare Felder in sichtbaren Gruppen zaehlen –
 * ein ausgeblendetes Feld darf die Generierung nicht blockieren.
 *
 * @returns {Array<{ key: string, label: string, group: string }>}
 */
function findMissingRequired(template, values, sharedGroupsById) {
  if (!template) return [];
  const data = withDerivedValues(values);
  const missing = [];

  for (const group of resolveFieldGroups(template, sharedGroupsById)) {
    if (!isVisible(group, data)) continue;
    for (const field of group.fields) {
      if (!field.required) continue;
      if (!isVisible(field, data)) continue;
      const value = values?.[field.key];
      if (field.type === 'checkbox') continue; // "nein" ist eine gueltige Antwort
      if (isEmpty(value)) missing.push({ key: field.key, label: field.label || field.key, group: group.title });
    }
  }

  return missing;
}

      /* Exporte */
      __exports["isVisible"] = isVisible;
      __exports["generateLetter"] = generateLetter;
      __exports["letterToText"] = letterToText;
      __exports["findMissingRequired"] = findMissingRequired;
  };

  __definitionen["src/ui/formView.js"] = function (__exports, __require) {
/* ---- src/ui/formView.js ---- */
/**
 * Dynamische Eingabemaske.
 *
 * Rendert die Feldgruppen des aktiven Templates in klinischer Reihenfolge,
 * unterstuetzt alle Feldtypen inklusive Wiederholgruppen und blendet Felder
 * nach ihren Sichtbarkeitsregeln ein und aus.
 */

const { el, replaceChildren } = __require("./dom.js");
const { isVisible } = __require("../core/letter.js");
const { withDerivedValues } = __require("../core/derived.js");
const { defaultValueForField, resolveFieldGroups } = __require("../core/schema.js");
const { collectExpressionPaths } = __require("../engine/expression.js");

const CUSTOM_OPTION = '__frei__';

function createFormView({ container, store, onChange }) {
  /** Offene/geschlossene Gruppen ueber Rerenders hinweg merken. */
  const collapsed = new Set();
  /** Felder, von denen Sichtbarkeitsregeln abhaengen. */
  let visibilityKeys = new Set();
  let visibilityTemplateId = null;

  /**
   * Die Maske wird bewusst NICHT bei jedem Tastendruck neu aufgebaut – das
   * wuerde den Fokus verlieren. Neu gerendert wird nur, wenn sich ein Feld
   * aendert, von dem eine Sichtbarkeitsregel abhaengt, oder wenn sich die
   * Struktur aendert (Wiederholgruppen, Freitext-Umschaltung).
   */
  function setValue(key, value, { rerender = false } = {}) {
    store.setValue(key, value);
    if (rerender || visibilityKeys.has(key)) renderPreservingFocus();
    if (onChange) onChange(key);
  }

  function updateVisibilityKeys(template) {
    if (visibilityTemplateId === template.id) return;
    visibilityTemplateId = template.id;
    visibilityKeys = new Set();
    const add = (expression) => {
      for (const path of collectExpressionPaths(expression)) visibilityKeys.add(path);
    };
    for (const group of resolveFieldGroups(template, store.sharedGroupsById)) {
      add(group.visibleIf);
      for (const field of group.fields) add(field.visibleIf);
    }
  }

  /** Erhaelt Fokus und Cursorposition ueber einen Neuaufbau hinweg. */
  function renderPreservingFocus() {
    const active = document.activeElement;
    const id = active && container.contains(active) ? active.id : null;
    const start = id && 'selectionStart' in active ? active.selectionStart : null;
    const end = id && 'selectionEnd' in active ? active.selectionEnd : null;

    render();

    if (!id) return;
    const restored = container.querySelector(`#${CSS.escape(id)}`);
    if (!restored) return;
    restored.focus();
    if (start !== null && 'setSelectionRange' in restored) {
      try { restored.setSelectionRange(start, end); } catch { /* Typ erlaubt keine Auswahl */ }
    }
  }

  function render() {
    const template = store.getActiveTemplate();
    if (!template) {
      replaceChildren(container, el('p', { class: 'hint', text: 'Keine Vorlage vorhanden. Bitte im Vorlagen-Editor eine Vorlage anlegen oder importieren.' }));
      return;
    }

    updateVisibilityKeys(template);
    const values = store.values;
    const data = withDerivedValues(values);
    const groups = resolveFieldGroups(template, store.sharedGroupsById)
      .filter((group) => isVisible(group, data))
      .filter((group) => group.fields.some((field) => isVisible(field, data)));

    replaceChildren(container, groups.map((group) => renderGroup(group, values, data)));
  }

  function renderGroup(group, values, data) {
    const isCollapsed = collapsed.has(group.id);
    const body = el(
      'div',
      { class: 'field-grid', hidden: isCollapsed },
      group.fields.filter((field) => isVisible(field, data)).map((field) => renderField(field, values, data)),
    );

    const toggle = el('button', {
      type: 'button',
      class: 'group-toggle',
      attrs: { 'aria-expanded': String(!isCollapsed) },
      on: {
        click: () => {
          if (collapsed.has(group.id)) collapsed.delete(group.id);
          else collapsed.add(group.id);
          renderPreservingFocus();
        },
      },
    }, [
      el('span', { class: 'group-caret', text: isCollapsed ? '▸' : '▾' }),
      el('span', { text: group.title }),
    ]);

    return el('section', { class: 'field-group' }, [
      el('h3', {}, [toggle]),
      group.description ? el('p', { class: 'group-description', text: group.description }) : null,
      body,
    ]);
  }

  function renderField(field, values, data) {
    const inputId = `feld-${field.key}`;
    const describedBy = field.help ? `${inputId}-hilfe` : undefined;

    const label = el('label', { attrs: { for: inputId } }, [
      field.label || field.key,
      field.required ? el('span', { class: 'required', text: ' *', attrs: { title: 'Pflichtfeld' } }) : null,
      field.unit ? el('span', { class: 'unit', text: ` (${field.unit})` }) : null,
    ]);

    const control = renderControl(field, values, data, inputId, describedBy);
    const help = field.help ? el('p', { class: 'help', id: describedBy, text: field.help }) : null;

    return el('div', {
      class: ['field', field.type === 'multiline' || field.type === 'list' ? 'field-wide' : ''],
    }, [label, control, help]);
  }

  function renderControl(field, values, data, inputId, describedBy) {
    const value = values[field.key];
    const common = {
      id: inputId,
      attrs: {
        'aria-describedby': describedBy,
        'aria-required': field.required ? 'true' : undefined,
        placeholder: field.placeholder || undefined,
      },
    };

    switch (field.type) {
      case 'multiline':
        return el('textarea', {
          ...common,
          rows: field.rows || 4,
          value: value ?? '',
          on: { input: (event) => setValue(field.key, event.target.value) },
        });

      case 'number':
        return el('input', {
          ...common,
          type: 'number',
          value: value ?? '',
          attrs: { ...common.attrs, min: field.min, max: field.max, step: field.step, inputmode: 'decimal' },
          on: { input: (event) => setValue(field.key, event.target.value) },
        });

      case 'date':
      case 'time':
      case 'month':
        return el('input', {
          ...common,
          type: field.type,
          value: value ?? '',
          on: { input: (event) => setValue(field.key, event.target.value) },
        });

      case 'checkbox':
        return el('div', { class: 'checkbox-row' }, [
          el('input', {
            ...common,
            type: 'checkbox',
            checked: Boolean(value),
            on: { change: (event) => setValue(field.key, event.target.checked) },
          }),
          el('label', { class: 'checkbox-label', attrs: { for: inputId }, text: 'ja' }),
        ]);

      case 'radio':
        return el('div', { class: 'radio-group', attrs: { role: 'radiogroup', 'aria-labelledby': inputId } },
          field.options.map((option, index) => {
            const optionId = `${inputId}-${index}`;
            return el('div', { class: 'radio-row' }, [
              el('input', {
                id: optionId,
                type: 'radio',
                name: inputId,
                value: option.value,
                checked: String(value ?? '') === option.value,
                on: { change: () => setValue(field.key, option.value) },
              }),
              el('label', { attrs: { for: optionId }, text: option.label }),
            ]);
          }));

      case 'multiselect':
        return el('div', { class: 'multiselect', id: inputId, attrs: { role: 'group', 'aria-describedby': describedBy } },
          field.options.map((option, index) => {
            const optionId = `${inputId}-${index}`;
            const selected = Array.isArray(value) && value.includes(option.value);
            return el('div', { class: 'checkbox-row' }, [
              el('input', {
                id: optionId,
                type: 'checkbox',
                checked: selected,
                on: {
                  change: (event) => {
                    const current = Array.isArray(values[field.key]) ? [...values[field.key]] : [];
                    if (event.target.checked) {
                      if (!current.includes(option.value)) current.push(option.value);
                    } else {
                      const at = current.indexOf(option.value);
                      if (at !== -1) current.splice(at, 1);
                    }
                    setValue(field.key, current);
                  },
                },
              }),
              el('label', { attrs: { for: optionId }, text: option.label }),
            ]);
          }));

      case 'select':
        return renderSelect(field, values, inputId, common);

      case 'list':
        return renderList(field, values, data, inputId);

      default:
        return el('input', {
          ...common,
          type: 'text',
          value: value ?? '',
          on: { input: (event) => setValue(field.key, event.target.value) },
        });
    }
  }

  /** Dropdown; bei `allowCustom` mit zusaetzlichem Freitextfeld. */
  function renderSelect(field, values, inputId, common) {
    const value = values[field.key] ?? '';
    const known = field.options.some((option) => option.value === value);
    const useCustom = field.allowCustom && value !== '' && !known;

    const select = el('select', {
      ...common,
      on: {
        change: (event) => {
          const wasCustom = useCustom;
          if (event.target.value === CUSTOM_OPTION) setValue(field.key, ' ', { rerender: true });
          else setValue(field.key, event.target.value, { rerender: wasCustom });
        },
      },
    }, [
      // Solange nichts gewaehlt ist, braucht das Dropdown einen leeren
      // Eintrag – sonst zeigt der Browser die erste Option an, obwohl im
      // Datensatz noch kein Wert steht, und der Brief bleibt an dieser
      // Stelle leer.
      ...(value === '' && !field.options.some((option) => option.value === '')
        ? [el('option', { value: '', text: '– bitte wählen –', selected: true })]
        : []),
      ...field.options.map((option) => el('option', { value: option.value, text: option.label, selected: option.value === value })),
      field.allowCustom ? el('option', { value: CUSTOM_OPTION, text: 'Freitext …', selected: useCustom }) : null,
    ]);

    if (!useCustom) return select;

    return el('div', { class: 'select-with-custom' }, [
      select,
      el('input', {
        type: 'text',
        value: value.trim() === '' ? '' : value,
        attrs: { placeholder: 'Eigener Wert', 'aria-label': `${field.label} – Freitext` },
        on: { input: (event) => setValue(field.key, event.target.value) },
      }),
    ]);
  }

  /** Wiederholgruppe mit Hinzufuegen, Entfernen und Sortieren. */
  function renderList(field, values, data, inputId) {
    const entries = Array.isArray(values[field.key]) ? values[field.key] : [];

    /** Strukturaenderungen (hinzufuegen, entfernen, sortieren) brauchen einen Neuaufbau. */
    const update = (next, structural = true) => setValue(field.key, next, { rerender: structural });

    const rows = entries.map((entry, index) => {
      const move = (delta) => {
        const next = [...entries];
        const target = index + delta;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        update(next);
      };

      return el('li', { class: 'list-entry' }, [
        el('div', { class: 'list-entry-head' }, [
          el('span', { class: 'list-entry-number', text: `${index + 1}.` }),
          el('div', { class: 'list-entry-actions' }, [
            el('button', {
              type: 'button', class: 'icon-button', attrs: { title: 'Nach oben', 'aria-label': `Eintrag ${index + 1} nach oben`, disabled: index === 0 },
              text: '↑', on: { click: () => move(-1) },
            }),
            el('button', {
              type: 'button', class: 'icon-button', attrs: { title: 'Nach unten', 'aria-label': `Eintrag ${index + 1} nach unten`, disabled: index === entries.length - 1 },
              text: '↓', on: { click: () => move(1) },
            }),
            el('button', {
              type: 'button', class: 'icon-button danger', attrs: { title: 'Entfernen', 'aria-label': `Eintrag ${index + 1} entfernen` },
              text: '✕', on: { click: () => update(entries.filter((_, at) => at !== index)) },
            }),
          ]),
        ]),
        el('div', { class: 'field-grid' }, field.itemFields.map((itemField) => {
          const itemId = `${inputId}-${index}-${itemField.key}`;
          const itemValue = entry?.[itemField.key] ?? '';
          const onInput = (newValue, structural = false) => {
            const next = entries.map((existing, at) => (at === index ? { ...existing, [itemField.key]: newValue } : existing));
            update(next, structural);
          };

          let control;
          if (itemField.type === 'select') {
            const known = itemField.options.some((option) => option.value === itemValue);
            control = el('div', { class: 'select-with-custom' }, [
              el('select', {
                id: itemId,
                on: { change: (event) => onInput(event.target.value === CUSTOM_OPTION ? ' ' : event.target.value, true) },
              }, [
                el('option', { value: '', text: '– bitte wählen –', selected: itemValue === '' }),

                ...itemField.options.map((option) => el('option', { value: option.value, text: option.label, selected: option.value === itemValue })),
                itemField.allowCustom ? el('option', { value: CUSTOM_OPTION, text: 'Freitext …', selected: itemValue !== '' && !known }) : null,
              ]),
              itemField.allowCustom && itemValue !== '' && !known
                ? el('input', {
                  type: 'text', value: itemValue.trim() === '' ? '' : itemValue,
                  attrs: { placeholder: 'Eigener Wert', 'aria-label': `${itemField.label} – Freitext` },
                  on: { input: (event) => onInput(event.target.value) },
                })
                : null,
            ]);
          } else if (itemField.type === 'multiline') {
            control = el('textarea', { id: itemId, rows: itemField.rows || 2, value: itemValue, on: { input: (event) => onInput(event.target.value) } });
          } else {
            control = el('input', {
              id: itemId,
              type: ['number', 'date', 'time', 'month'].includes(itemField.type) ? itemField.type : 'text',
              value: itemValue,
              attrs: { placeholder: itemField.placeholder || undefined },
              on: { input: (event) => onInput(event.target.value) },
            });
          }

          return el('div', { class: 'field' }, [
            el('label', { attrs: { for: itemId } }, [
              itemField.label || itemField.key,
              itemField.required ? el('span', { class: 'required', text: ' *' }) : null,
            ]),
            control,
          ]);
        })),
      ]);
    });

    return el('div', { class: 'list-field', id: inputId }, [
      entries.length ? el('ol', { class: 'list-entries' }, rows) : el('p', { class: 'hint', text: 'Noch keine Einträge.' }),
      el('button', {
        type: 'button',
        class: 'secondary',
        text: `+ ${field.addLabel || 'Eintrag hinzufügen'}`,
        on: {
          click: () => {
            const blank = {};
            for (const itemField of field.itemFields) blank[itemField.key] = defaultValueForField(itemField);
            update([...entries, blank]);
          },
        },
      }),
    ]);
  }

  return { render };
}

      /* Exporte */
      __exports["createFormView"] = createFormView;
  };

  __definitionen["src/ui/previewView.js"] = function (__exports, __require) {
/* ---- src/ui/previewView.js ---- */
/**
 * Live-Vorschau des Briefs.
 *
 * Jeder Abschnitt ist einzeln editierbar und kopierbar. Sobald ein Abschnitt
 * von Hand bearbeitet wurde, wird er nicht mehr automatisch ueberschrieben:
 * Die Maske meldet dann nur noch, dass eine neuere Fassung vorliegt, und das
 * Ueberschreiben muss ausdruecklich bestaetigt werden.
 */

const { copyToClipboard, el, insertAtCursor, replaceChildren } = __require("./dom.js");
const { findMissingRequired, generateLetter, letterToText } = __require("../core/letter.js");

function createPreviewView({ container, statusContainer, store, onStatus }) {
  /** Zuletzt gerenderte Abschnitte – fuer Kopieren und Bausteineinfuegen. */
  let currentSections = [];
  /** Textfelder je Abschnitt, damit Bausteine an der Cursorposition landen. */
  const textareas = new Map();
  let lastFocusedSectionId = null;

  function status(message, tone = 'info') {
    if (onStatus) onStatus(message, tone);
  }

  function build() {
    const template = store.getActiveTemplate();
    if (!template) {
      replaceChildren(container, el('p', { class: 'hint', text: 'Keine Vorlage ausgewählt.' }));
      currentSections = [];
      return;
    }

    // Fokus und Cursorposition ueber den Neuaufbau retten, damit das Tippen
    // in einem Abschnitt nicht unterbrochen wird.
    const active = document.activeElement;
    const activeId = active && container.contains(active) ? active.id : null;
    const caretStart = activeId ? active.selectionStart : null;
    const caretEnd = activeId ? active.selectionEnd : null;

    const letter = generateLetter(template, store.values, store.sharedGroupsById, {
      manualSections: store.getManualSections(),
    });
    currentSections = letter.sections;
    textareas.clear();

    renderStatus(template, letter);
    replaceChildren(container, letter.sections.map(renderSection));
    for (const textarea of textareas.values()) autosize(textarea);

    if (activeId) {
      const restored = container.querySelector(`#${CSS.escape(activeId)}`);
      if (restored) {
        restored.focus();
        try { restored.setSelectionRange(caretStart, caretEnd); } catch { /* nicht auswaehlbar */ }
      }
    }
  }

  function renderStatus(template, letter) {
    if (!statusContainer) return;
    const missing = findMissingRequired(template, store.values, store.sharedGroupsById);
    const parts = [];

    if (letter.errors.length) {
      parts.push(el('div', { class: 'banner banner-error' }, [
        el('strong', { text: 'Fehler in der Vorlage: ' }),
        el('ul', {}, letter.errors.map((message) => el('li', { text: message }))),
      ]));
    }

    if (missing.length) {
      parts.push(el('div', { class: 'banner banner-warn' }, [
        el('strong', { text: `${missing.length} Pflichtfeld${missing.length === 1 ? '' : 'er'} noch offen: ` }),
        el('span', { text: missing.map((entry) => entry.label).join(', ') }),
      ]));
    }

    const manualCount = store.listManualSections().length;
    if (manualCount > 0) {
      parts.push(el('div', { class: 'banner banner-info' }, [
        el('span', { text: `${manualCount} Abschnitt${manualCount === 1 ? '' : 'e'} von Hand bearbeitet – ${manualCount === 1 ? 'dieser wird' : 'diese werden'} nicht automatisch überschrieben. ` }),
        el('button', {
          type: 'button',
          class: 'link-button',
          text: 'Alle manuellen Änderungen verwerfen',
          on: {
            click: () => {
              if (!confirm('Alle manuellen Änderungen an den Abschnitten verwerfen und neu aus der Vorlage erzeugen?')) return;
              store.discardManualText();
              status('Manuelle Änderungen verworfen.', 'info');
            },
          },
        }),
      ]));
    }

    replaceChildren(statusContainer, parts);
  }

  /** Textfeld auf seinen Inhalt wachsen lassen – der Brief soll ganz sichtbar sein. */
  function autosize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight + 2}px`;
  }

  function renderSection(section) {
    const textareaId = `abschnitt-${section.id}`;
    const textarea = el('textarea', {
      id: textareaId,
      class: ['section-text', section.manual ? 'is-manual' : ''],
      rows: 2,
      value: section.text,
      attrs: { 'aria-label': `${section.title} – generierter Text` },
      on: {
        focus: () => { lastFocusedSectionId = section.id; },
        input: (event) => {
          autosize(event.target);
          const value = event.target.value;
          // Wird der Text wieder auf den generierten Stand gebracht, gilt der
          // Abschnitt nicht laenger als manuell bearbeitet.
          if (value === section.generatedText) store.discardManualText(section.id);
          else store.setManualText(section.id, value, section.generatedText);
        },
      },
    });
    textareas.set(section.id, textarea);

    const badges = [];
    if (section.manual) badges.push(el('span', { class: 'badge badge-manual', text: 'manuell bearbeitet' }));
    if (section.outdated) badges.push(el('span', { class: 'badge badge-outdated', text: 'Vorlage hat sich geändert' }));
    if (section.empty && !section.manual) badges.push(el('span', { class: 'badge', text: 'leer' }));

    const actions = [
      el('button', {
        type: 'button',
        class: 'secondary small',
        text: 'Kopieren',
        on: {
          click: async () => {
            const ok = await copyToClipboard(textarea.value);
            status(ok ? `Abschnitt „${section.title}" kopiert.` : 'Kopieren nicht möglich – bitte den Text manuell markieren.', ok ? 'success' : 'error');
          },
        },
      }),
    ];

    if (section.manual) {
      actions.push(el('button', {
        type: 'button',
        class: 'secondary small',
        text: 'Aus Vorlage neu erzeugen',
        attrs: { title: 'Verwirft die manuellen Änderungen dieses Abschnitts' },
        on: {
          click: () => {
            if (!confirm(`Die manuellen Änderungen im Abschnitt „${section.title}" verwerfen und neu aus der Vorlage erzeugen?`)) return;
            store.discardManualText(section.id);
            status(`Abschnitt „${section.title}" neu erzeugt.`, 'info');
          },
        },
      }));
    }

    return el('section', { class: 'output-section' }, [
      el('div', { class: 'output-head' }, [
        el('h3', {}, [el('label', { attrs: { for: textareaId }, text: section.title }), ...badges]),
        el('div', { class: 'output-actions' }, actions),
      ]),
      textarea,
    ]);
  }

  /** Gesamttext, so wie er aktuell in den Feldern steht (inkl. manueller Änderungen). */
  function fullText() {
    const withTitles = store.settings.sectionTitlesInOutput;
    const sections = currentSections.map((section) => ({
      title: section.title,
      text: textareas.get(section.id)?.value ?? section.text,
    }));
    return letterToText(sections, { withTitles });
  }

  async function copyAll() {
    const text = fullText();
    if (!text.trim()) {
      status('Es gibt noch keinen Text zum Kopieren.', 'warn');
      return;
    }
    const ok = await copyToClipboard(text);
    status(ok ? 'Gesamter Brief kopiert.' : 'Kopieren nicht möglich – bitte den Text manuell markieren.', ok ? 'success' : 'error');
  }

  /** Fuegt einen Baustein in den zuletzt fokussierten Abschnitt ein. */
  function insertSnippet(text, sectionId) {
    const target = sectionId || lastFocusedSectionId || currentSections[0]?.id;
    const textarea = textareas.get(target);
    if (!textarea) {
      status('Kein Zielabschnitt vorhanden.', 'warn');
      return false;
    }
    insertAtCursor(textarea, text);
    status(`Baustein in „${currentSections.find((section) => section.id === target)?.title}" eingefügt.`, 'success');
    return true;
  }

  return {
    build,
    fullText,
    copyAll,
    insertSnippet,
    listSections: () => currentSections.map((section) => ({ id: section.id, title: section.title })),
    getFocusedSectionId: () => lastFocusedSectionId,
  };
}

      /* Exporte */
      __exports["createPreviewView"] = createPreviewView;
  };

  __definitionen["src/ui/editorView.js"] = function (__exports, __require) {
/* ---- src/ui/editorView.js ---- */
/**
 * Vorlagen-Editor.
 *
 * Vorlagen anlegen, bearbeiten, duplizieren, loeschen, exportieren und
 * importieren. Gearbeitet wird auf einer Arbeitskopie; gespeichert wird erst
 * nach erfolgreicher Validierung (eindeutige IDs, gueltige Platzhalter,
 * gueltige Bedingungen).
 */

const { downloadJson, el, insertAtCursor, replaceChildren } = __require("./dom.js");
const { DERIVED_VARIABLES, FIELD_TYPES, SCHEMA_VERSION, normaliseTemplate, resolveFieldGroups, validateTemplate } = __require("../core/schema.js");
const { clearTemplateCache } = __require("../engine/renderer.js");

function createEditorView({ listContainer, formContainer, store, onStatus, onTemplatesChanged }) {
  /** Arbeitskopie der gerade bearbeiteten Vorlage. */
  let draft = null;
  /** ID der Vorlage, aus der die Arbeitskopie stammt (leer bei „Neu"). */
  let sourceId = '';
  let lastFocusedTextarea = null;

  const status = (message, tone = 'info') => onStatus && onStatus(message, tone);

  /* ---------------------------------------------------------------- */
  /* Vorlagenliste                                                     */
  /* ---------------------------------------------------------------- */

  function renderList() {
    const templates = store.listTemplates();
    const byGroup = new Map();
    for (const template of templates) {
      if (!byGroup.has(template.group)) byGroup.set(template.group, []);
      byGroup.get(template.group).push(template);
    }

    const hidden = store.listHiddenBuiltins();

    replaceChildren(listContainer, [
      el('div', { class: 'editor-list-actions' }, [
        el('button', { type: 'button', text: '+ Neue Vorlage', on: { click: startNew } }),
        el('button', { type: 'button', class: 'secondary', text: 'Alle exportieren', on: { click: exportAll } }),
        el('label', { class: 'file-label secondary' }, [
          'Importieren',
          el('input', { type: 'file', accept: 'application/json', on: { change: importFile } }),
        ]),
      ]),
      ...[...byGroup.entries()].map(([group, entries]) => el('div', { class: 'editor-group' }, [
        el('h4', { text: group }),
        el('ul', { class: 'template-list' }, entries.map((template) => el('li', {
          class: ['template-list-item', template.id === (draft?.id ?? sourceId) ? 'is-active' : ''],
        }, [
          el('button', {
            type: 'button',
            class: 'template-list-button',
            on: { click: () => startEdit(template.id) },
          }, [
            el('span', { class: 'template-list-title', text: template.title }),
            el('span', { class: 'template-list-meta', text: template.id }),
          ]),
          el('span', { class: 'template-badges' }, [
            store.isModifiedBuiltin(template.id)
              ? el('span', { class: 'badge badge-outdated', text: 'geändert' })
              : store.isBuiltin(template.id)
                ? el('span', { class: 'badge', text: 'mitgeliefert' })
                : el('span', { class: 'badge badge-manual', text: 'eigen' }),
          ]),
        ]))),
      ])),
      hidden.length
        ? el('div', { class: 'editor-group' }, [
          el('h4', { text: 'Ausgeblendete mitgelieferte Vorlagen' }),
          el('ul', { class: 'template-list' }, hidden.map((id) => el('li', { class: 'template-list-item' }, [
            el('span', { class: 'template-list-title', text: id }),
            el('button', {
              type: 'button',
              class: 'link-button',
              text: 'wiederherstellen',
              on: {
                click: () => {
                  store.restoreBuiltin(id);
                  status(`Vorlage „${id}" wiederhergestellt.`, 'success');
                  refresh();
                },
              },
            }),
          ]))),
        ])
        : null,
    ]);
  }

  /* ---------------------------------------------------------------- */
  /* Arbeitskopie                                                      */
  /* ---------------------------------------------------------------- */

  function startNew() {
    draft = normaliseTemplate({
      id: '',
      title: '',
      group: 'Eigene Vorlagen',
      description: '',
      sharedGroups: ['stammdaten', 'aufenthalt'],
      fieldGroups: [],
      sections: [{ id: 'diagnosen', title: 'Aktuelle Diagnosen', order: 1, template: '' }],
    });
    sourceId = '';
    refresh();
  }

  function startEdit(id) {
    const template = store.getTemplate(id);
    if (!template) return;
    draft = normaliseTemplate(structuredClone(template));
    sourceId = id;
    refresh();
  }

  function duplicate() {
    if (!draft) return;
    const base = draft.id || 'vorlage';
    let candidate = `${base}_kopie`;
    let counter = 2;
    const taken = new Set(store.listTemplates().map((template) => template.id));
    while (taken.has(candidate)) candidate = `${base}_kopie${counter++}`;
    draft = normaliseTemplate({ ...structuredClone(draft), id: candidate, title: `${draft.title} (Kopie)`, readOnly: false });
    sourceId = '';
    status('Kopie angelegt – bitte prüfen und speichern.', 'info');
    refresh();
  }

  function remove() {
    if (!draft || !sourceId) return;
    const isBuiltin = store.isBuiltin(sourceId);
    const question = isBuiltin
      ? `Die mitgelieferte Vorlage „${draft.title}" ausblenden? Sie lässt sich jederzeit wiederherstellen.`
      : `Die Vorlage „${draft.title}" endgültig löschen? Das lässt sich nicht rückgängig machen.`;
    if (!confirm(question)) return;
    store.deleteTemplate(sourceId);
    status(isBuiltin ? 'Vorlage ausgeblendet.' : 'Vorlage gelöscht.', 'success');
    draft = null;
    sourceId = '';
    refresh();
  }

  function save() {
    if (!draft) return;
    const report = validate();
    if (report.errors.length) {
      status(`Speichern nicht möglich – ${report.errors.length} Fehler in der Vorlage.`, 'error');
      return;
    }
    clearTemplateCache();
    store.saveTemplate(draft);
    sourceId = draft.id;
    status(`Vorlage „${draft.title}" gespeichert.`, 'success');
    if (onTemplatesChanged) onTemplatesChanged();
    refresh();
  }

  function validate() {
    if (!draft) return { errors: [], warnings: [] };
    const otherIds = store.listTemplates().map((template) => template.id).filter((id) => id !== sourceId);
    return validateTemplate(draft, { existingIds: otherIds, sharedGroupsById: store.sharedGroupsById });
  }

  /* ---------------------------------------------------------------- */
  /* Import / Export                                                   */
  /* ---------------------------------------------------------------- */

  function exportAll() {
    const templates = store.listTemplates();
    downloadJson('arztbrief_vorlagen.json', {
      format: 'arztbriefgenerator-vorlagen',
      schemaVersion: SCHEMA_VERSION,
      exportiertAm: new Date().toISOString().slice(0, 10),
      templates,
    });
    status(`${templates.length} Vorlagen exportiert.`, 'success');
  }

  function exportSingle() {
    if (!draft) return;
    downloadJson(`vorlage_${draft.id || 'ohne_id'}.json`, {
      format: 'arztbriefgenerator-vorlagen',
      schemaVersion: SCHEMA_VERSION,
      exportiertAm: new Date().toISOString().slice(0, 10),
      templates: [draft],
    });
    status('Vorlage exportiert.', 'success');
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch (error) {
      status(`Die Datei ist kein gültiges JSON: ${error.message}`, 'error');
      return;
    }

    const incoming = Array.isArray(parsed) ? parsed : parsed?.templates;
    if (!Array.isArray(incoming) || incoming.length === 0) {
      status('Die Datei enthält keine Vorlagen (erwartet wird ein Feld „templates").', 'error');
      return;
    }

    const accepted = [];
    const rejected = [];
    for (const raw of incoming) {
      const candidate = normaliseTemplate(raw);
      const report = validateTemplate(candidate, { sharedGroupsById: store.sharedGroupsById });
      if (report.errors.length) rejected.push(`${candidate.id || '(ohne ID)'}: ${report.errors[0]}`);
      else accepted.push(candidate);
    }

    if (!accepted.length) {
      status(`Keine Vorlage konnte übernommen werden. ${rejected[0] ?? ''}`, 'error');
      return;
    }

    const collisions = accepted.filter((template) => store.getTemplate(template.id));
    const question = collisions.length
      ? `${accepted.length} Vorlage(n) importieren? ${collisions.length} vorhandene Vorlage(n) werden dabei überschrieben (${collisions.map((template) => template.id).join(', ')}).`
      : `${accepted.length} Vorlage(n) importieren?`;
    if (!confirm(question)) return;

    clearTemplateCache();
    store.addTemplates(accepted);
    const skipped = rejected.length ? ` ${rejected.length} Vorlage(n) übersprungen: ${rejected.join('; ')}` : '';
    status(`${accepted.length} Vorlage(n) importiert.${skipped}`, rejected.length ? 'warn' : 'success');
    if (onTemplatesChanged) onTemplatesChanged();
    refresh();
  }

  /* ---------------------------------------------------------------- */
  /* Formular                                                          */
  /* ---------------------------------------------------------------- */

  function refresh() {
    renderList();
    renderForm();
  }

  function field(labelText, control, help) {
    return el('div', { class: 'field' }, [
      el('label', {}, [labelText]),
      control,
      help ? el('p', { class: 'help', text: help }) : null,
    ]);
  }

  function textInput(value, onInput, attrs = {}) {
    return el('input', { type: 'text', value: value ?? '', attrs, on: { input: (event) => onInput(event.target.value) } });
  }

  function renderForm() {
    if (!draft) {
      replaceChildren(formContainer, el('p', { class: 'hint', text: 'Links eine Vorlage auswählen oder „+ Neue Vorlage" anlegen.' }));
      return;
    }

    const report = validate();

    replaceChildren(formContainer, [
      el('div', { class: 'editor-toolbar' }, [
        el('button', { type: 'button', text: 'Speichern', attrs: { disabled: report.errors.length > 0 }, on: { click: save } }),
        el('button', { type: 'button', class: 'secondary', text: 'Duplizieren', on: { click: duplicate } }),
        el('button', { type: 'button', class: 'secondary', text: 'Exportieren', on: { click: exportSingle } }),
        sourceId ? el('button', { type: 'button', class: 'secondary danger', text: store.isBuiltin(sourceId) ? 'Ausblenden' : 'Löschen', on: { click: remove } }) : null,
        sourceId && store.isModifiedBuiltin(sourceId)
          ? el('button', {
            type: 'button',
            class: 'secondary',
            text: 'Auf Originalfassung zurücksetzen',
            on: {
              click: () => {
                if (!confirm('Die eigenen Änderungen verwerfen und die mitgelieferte Fassung wiederherstellen?')) return;
                store.restoreBuiltin(sourceId);
                startEdit(sourceId);
                status('Originalfassung wiederhergestellt.', 'success');
              },
            },
          })
          : null,
      ]),

      el('div', { class: 'editor-validation' }, [renderValidation(report)]),

      el('section', { class: 'editor-block' }, [
        el('h3', { text: 'Stammdaten der Vorlage' }),
        el('div', { class: 'field-grid' }, [
          field('Template-ID *', textInput(draft.id, (value) => { draft.id = value.trim(); renderForm(); }, { placeholder: 'z. B. acs_hausstandard' }), 'Buchstabe am Anfang, danach Buchstaben, Ziffern, „_" und „-". Muss eindeutig sein.'),
          field('Titel *', textInput(draft.title, (value) => { draft.title = value; renderForm(); })),
          field('Gruppe', textInput(draft.group, (value) => { draft.group = value; })),
          field('Quelle', textInput(draft.source, (value) => { draft.source = value; }), 'Herkunftsnachweis, z. B. das Quelldokument.'),
        ]),
        field('Beschreibung', el('textarea', {
          rows: 2,
          value: draft.description,
          on: { input: (event) => { draft.description = event.target.value; } },
        })),
      ]),

      renderSharedGroups(),
      renderSections(),
      renderFieldGroups(),
      renderPlaceholderPalette(),
    ]);
  }

  function renderValidation(report) {
    if (!report.errors.length && !report.warnings.length) {
      return el('div', { class: 'banner banner-success', text: 'Die Vorlage ist gültig.' });
    }
    return el('div', {}, [
      report.errors.length
        ? el('div', { class: 'banner banner-error' }, [
          el('strong', { text: `${report.errors.length} Fehler – Speichern ist blockiert:` }),
          el('ul', {}, report.errors.map((message) => el('li', { text: message }))),
        ])
        : null,
      report.warnings.length
        ? el('div', { class: 'banner banner-warn' }, [
          el('strong', { text: `${report.warnings.length} Hinweis(e):` }),
          el('ul', {}, report.warnings.map((message) => el('li', { text: message }))),
        ])
        : null,
    ]);
  }

  function renderSharedGroups() {
    const shared = [...store.sharedGroupsById.values()];
    return el('section', { class: 'editor-block' }, [
      el('h3', { text: 'Gemeinsame Feldgruppen' }),
      el('p', { class: 'help', text: 'Diese Gruppen sind zentral definiert. Ihre Werte bleiben beim Wechsel der Vorlage erhalten.' }),
      el('div', { class: 'checkbox-list' }, shared.map((group, index) => {
        const id = `shared-${index}`;
        return el('div', { class: 'checkbox-row' }, [
          el('input', {
            id,
            type: 'checkbox',
            checked: draft.sharedGroups.includes(group.id),
            on: {
              change: (event) => {
                if (event.target.checked) draft.sharedGroups.push(group.id);
                else draft.sharedGroups = draft.sharedGroups.filter((entry) => entry !== group.id);
                renderForm();
              },
            },
          }),
          el('label', { attrs: { for: id }, text: `${group.title} (${group.id})` }),
        ]);
      })),
    ]);
  }

  function moveInArray(array, index, delta) {
    const target = index + delta;
    if (target < 0 || target >= array.length) return;
    [array[index], array[target]] = [array[target], array[index]];
  }

  function renderSections() {
    return el('section', { class: 'editor-block' }, [
      el('h3', { text: 'Abschnitte' }),
      el('p', { class: 'help', text: 'Reihenfolge der Abschnitte im Brief. Platzhalter: {{feld}}, Bedingungen: {{#if bedingung}} … {{/if}}, Listen: {{#each liste}} … {{/each}}.' }),
      el('ol', { class: 'editor-items' }, draft.sections.map((section, index) => el('li', { class: 'editor-item' }, [
        el('div', { class: 'editor-item-head' }, [
          el('strong', { text: section.title || section.id || `Abschnitt ${index + 1}` }),
          el('div', { class: 'list-entry-actions' }, [
            el('button', { type: 'button', class: 'icon-button', text: '↑', attrs: { title: 'Nach oben', disabled: index === 0 }, on: { click: () => { moveInArray(draft.sections, index, -1); reorderSections(); } } }),
            el('button', { type: 'button', class: 'icon-button', text: '↓', attrs: { title: 'Nach unten', disabled: index === draft.sections.length - 1 }, on: { click: () => { moveInArray(draft.sections, index, 1); reorderSections(); } } }),
            el('button', {
              type: 'button', class: 'icon-button danger', text: '✕', attrs: { title: 'Abschnitt entfernen' },
              on: {
                click: () => {
                  if (!confirm(`Abschnitt „${section.title || section.id}" entfernen?`)) return;
                  draft.sections.splice(index, 1);
                  reorderSections();
                },
              },
            }),
          ]),
        ]),
        el('div', { class: 'field-grid' }, [
          field('Abschnitts-ID *', textInput(section.id, (value) => { section.id = value.trim(); renderForm(); })),
          field('Überschrift *', textInput(section.title, (value) => { section.title = value; renderForm(); })),
          field('Nur anzeigen wenn', textInput(section.visibleIf, (value) => { section.visibleIf = value; renderForm(); }, { placeholder: 'z. B. kv_risikofaktoren not empty' })),
        ]),
        field('Text', el('textarea', {
          class: 'template-source',
          rows: Math.min(20, Math.max(4, section.template.split('\n').length + 1)),
          value: section.template,
          on: {
            focus: (event) => { lastFocusedTextarea = event.target; },
            input: (event) => { section.template = event.target.value; scheduleValidation(); },
          },
        })),
      ]))),
      el('button', {
        type: 'button',
        class: 'secondary',
        text: '+ Abschnitt hinzufügen',
        on: {
          click: () => {
            draft.sections.push({ id: `abschnitt_${draft.sections.length + 1}`, title: 'Neuer Abschnitt', order: draft.sections.length + 1, template: '', enabled: true, visibleIf: '', help: '' });
            renderForm();
          },
        },
      }),
    ]);
  }

  function reorderSections() {
    draft.sections.forEach((section, index) => { section.order = index + 1; });
    renderForm();
  }

  /** Validierung waehrend des Tippens, ohne das Textfeld neu aufzubauen. */
  let validationTimer = null;
  function scheduleValidation() {
    if (validationTimer) clearTimeout(validationTimer);
    validationTimer = setTimeout(() => {
      const report = validate();
      const banner = formContainer.querySelector('.editor-validation');
      if (banner) replaceChildren(banner, renderValidation(report));
      const saveButton = formContainer.querySelector('.editor-toolbar button');
      if (saveButton) saveButton.disabled = report.errors.length > 0;
    }, 300);
  }

  function renderFieldGroups() {
    return el('section', { class: 'editor-block' }, [
      el('h3', { text: 'Eigene Feldgruppen' }),
      el('ol', { class: 'editor-items' }, draft.fieldGroups.map((group, groupIndex) => el('li', { class: 'editor-item' }, [
        el('div', { class: 'editor-item-head' }, [
          el('strong', { text: group.title || group.id }),
          el('div', { class: 'list-entry-actions' }, [
            el('button', { type: 'button', class: 'icon-button', text: '↑', attrs: { disabled: groupIndex === 0 }, on: { click: () => { moveInArray(draft.fieldGroups, groupIndex, -1); renderForm(); } } }),
            el('button', { type: 'button', class: 'icon-button', text: '↓', attrs: { disabled: groupIndex === draft.fieldGroups.length - 1 }, on: { click: () => { moveInArray(draft.fieldGroups, groupIndex, 1); renderForm(); } } }),
            el('button', {
              type: 'button', class: 'icon-button danger', text: '✕',
              on: {
                click: () => {
                  if (!confirm(`Feldgruppe „${group.title || group.id}" mit ${group.fields.length} Feld(ern) entfernen?`)) return;
                  draft.fieldGroups.splice(groupIndex, 1);
                  renderForm();
                },
              },
            }),
          ]),
        ]),
        el('div', { class: 'field-grid' }, [
          field('Gruppen-ID *', textInput(group.id, (value) => { group.id = value.trim(); renderForm(); })),
          field('Titel *', textInput(group.title, (value) => { group.title = value; renderForm(); })),
          field('Nur anzeigen wenn', textInput(group.visibleIf, (value) => { group.visibleIf = value; renderForm(); })),
        ]),
        el('ol', { class: 'editor-fields' }, group.fields.map((entry, fieldIndex) => renderFieldEditor(group, entry, fieldIndex))),
        el('button', {
          type: 'button', class: 'secondary small', text: '+ Feld hinzufügen',
          on: {
            click: () => {
              group.fields.push({ key: `feld_${group.fields.length + 1}`, label: 'Neues Feld', type: 'text', required: false, help: '', placeholder: '', unit: '', visibleIf: '' });
              renderForm();
            },
          },
        }),
      ]))),
      el('button', {
        type: 'button', class: 'secondary', text: '+ Feldgruppe hinzufügen',
        on: {
          click: () => {
            draft.fieldGroups.push({ id: `gruppe_${draft.fieldGroups.length + 1}`, title: 'Neue Gruppe', description: '', visibleIf: '', fields: [] });
            renderForm();
          },
        },
      }),
    ]);
  }

  function renderFieldEditor(group, entry, fieldIndex) {
    const hasOptions = FIELD_TYPES[entry.type]?.hasOptions;

    return el('li', { class: 'editor-field' }, [
      el('div', { class: 'editor-item-head' }, [
        el('code', { text: entry.key }),
        el('div', { class: 'list-entry-actions' }, [
          el('button', { type: 'button', class: 'icon-button', text: '↑', attrs: { disabled: fieldIndex === 0 }, on: { click: () => { moveInArray(group.fields, fieldIndex, -1); renderForm(); } } }),
          el('button', { type: 'button', class: 'icon-button', text: '↓', attrs: { disabled: fieldIndex === group.fields.length - 1 }, on: { click: () => { moveInArray(group.fields, fieldIndex, 1); renderForm(); } } }),
          el('button', {
            type: 'button', class: 'icon-button danger', text: '✕',
            on: {
              click: () => {
                if (!confirm(`Feld „${entry.label || entry.key}" entfernen?`)) return;
                group.fields.splice(fieldIndex, 1);
                renderForm();
              },
            },
          }),
        ]),
      ]),
      el('div', { class: 'field-grid' }, [
        field('Schlüssel *', textInput(entry.key, (value) => { entry.key = value.trim(); renderForm(); })),
        field('Beschriftung *', textInput(entry.label, (value) => { entry.label = value; renderForm(); })),
        field('Typ', el('select', {
          on: { change: (event) => { entry.type = event.target.value; renderForm(); } },
        }, Object.entries(FIELD_TYPES).map(([value, meta]) => el('option', { value, text: meta.label, selected: value === entry.type })))),
        field('Pflichtfeld', el('input', {
          type: 'checkbox', checked: entry.required, on: { change: (event) => { entry.required = event.target.checked; } },
        })),
        field('Standardwert', textInput(entry.default ?? '', (value) => { entry.default = value; })),
        field('Einheit', textInput(entry.unit, (value) => { entry.unit = value; })),
        field('Platzhaltertext', textInput(entry.placeholder, (value) => { entry.placeholder = value; })),
        field('Nur anzeigen wenn', textInput(entry.visibleIf, (value) => { entry.visibleIf = value; renderForm(); })),
      ]),
      field('Hilfetext', textInput(entry.help, (value) => { entry.help = value; })),
      hasOptions
        ? field('Optionen (eine je Zeile, optional „wert|Beschriftung")', el('textarea', {
          rows: Math.max(3, (entry.options?.length ?? 0) + 1),
          value: (entry.options || []).map((option) => (option.value === option.label ? option.value : `${option.value}|${option.label}`)).join('\n'),
          on: {
            input: (event) => {
              entry.options = event.target.value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
                const at = line.indexOf('|');
                return at === -1 ? { value: line, label: line } : { value: line.slice(0, at).trim(), label: line.slice(at + 1).trim() };
              });
              scheduleValidation();
            },
          },
        }))
        : null,
      hasOptions
        ? field('Freitext zusätzlich erlauben', el('input', {
          type: 'checkbox', checked: Boolean(entry.allowCustom), on: { change: (event) => { entry.allowCustom = event.target.checked; } },
        }))
        : null,
      entry.type === 'list' ? renderItemFields(entry) : null,
    ]);
  }

  function renderItemFields(entry) {
    entry.itemFields = entry.itemFields || [];
    return el('div', { class: 'item-fields' }, [
      el('h5', { text: 'Unterfelder der Wiederholgruppe' }),
      el('p', { class: 'help', text: 'Im Abschnittstext über {{#each ' + entry.key + '}}{{this.schlüssel}}{{/each}} ansprechbar.' }),
      el('ul', {}, entry.itemFields.map((itemField, index) => el('li', { class: 'field-grid' }, [
        field('Schlüssel', textInput(itemField.key, (value) => { itemField.key = value.trim(); renderForm(); })),
        field('Beschriftung', textInput(itemField.label, (value) => { itemField.label = value; })),
        field('Typ', el('select', {
          on: { change: (event) => { itemField.type = event.target.value; renderForm(); } },
        }, Object.entries(FIELD_TYPES)
          .filter(([value]) => value !== 'list')
          .map(([value, meta]) => el('option', { value, text: meta.label, selected: value === itemField.type })))),
        el('div', { class: 'field' }, [
          el('label', { text: ' ' }),
          el('button', {
            type: 'button', class: 'secondary small', text: 'Unterfeld entfernen',
            on: { click: () => { entry.itemFields.splice(index, 1); renderForm(); } },
          }),
        ]),
      ]))),
      el('button', {
        type: 'button', class: 'secondary small', text: '+ Unterfeld',
        on: {
          click: () => {
            entry.itemFields.push({ key: `unterfeld_${entry.itemFields.length + 1}`, label: 'Neues Unterfeld', type: 'text' });
            renderForm();
          },
        },
      }),
      field('Beschriftung des Hinzufügen-Knopfs', textInput(entry.addLabel, (value) => { entry.addLabel = value; })),
    ]);
  }

  /** Uebersicht aller verfuegbaren Platzhalter mit Einfuegefunktion. */
  function renderPlaceholderPalette() {
    const groups = resolveFieldGroups(draft, store.sharedGroupsById);
    const chips = [];

    for (const group of groups) {
      for (const entry of group.fields) {
        chips.push({ token: `{{${entry.key}}}`, label: entry.label || entry.key, group: group.title });
      }
    }
    for (const derived of DERIVED_VARIABLES) {
      chips.push({ token: `{{${derived.key}}}`, label: derived.description, group: 'Automatisch abgeleitet' });
    }

    const byGroup = new Map();
    for (const chip of chips) {
      if (!byGroup.has(chip.group)) byGroup.set(chip.group, []);
      byGroup.get(chip.group).push(chip);
    }

    return el('section', { class: 'editor-block' }, [
      el('h3', { text: 'Verfügbare Platzhalter' }),
      el('p', { class: 'help', text: 'Klick fügt den Platzhalter an der Cursorposition im zuletzt bearbeiteten Abschnittstext ein.' }),
      ...[...byGroup.entries()].map(([groupTitle, entries]) => el('div', { class: 'palette-group' }, [
        el('h5', { text: groupTitle }),
        el('div', { class: 'chips' }, entries.map((chip) => el('button', {
          type: 'button',
          class: 'chip',
          attrs: { title: chip.label },
          text: chip.token,
          on: {
            click: () => {
              if (!lastFocusedTextarea) {
                status('Bitte zuerst in einen Abschnittstext klicken.', 'warn');
                return;
              }
              insertAtCursor(lastFocusedTextarea, chip.token);
            },
          },
        }))),
      ])),
    ]);
  }

  return {
    refresh,
    startEdit,
    startNew,
  };
}

      /* Exporte */
      __exports["createEditorView"] = createEditorView;
  };

  __definitionen["src/data/snippets.js"] = function (__exports, __require) {
/* ---- src/data/snippets.js ---- */
/**
 * Bausteinbibliothek.
 *
 * Quelle: Textbausteine_Kardio.docx – alle Bloecke, die dort kein
 * vollstaendiger Brief sind, sondern wiederverwendbare Absaetze
 * (Untersuchungsbefunde, technische Befunde, Prozeduren, Procedere-Zeilen).
 *
 * Bausteine werden mit denselben Platzhaltern gerendert wie Vorlagen und
 * lassen sich an der Cursorposition in jeden Abschnitt einfuegen. Wo im
 * Original nur ein Leerfeld steht ("Koronarangiographie vom XX.08.2018:"),
 * bleibt es ein Leerfeld – es wird kein Befund erfunden.
 */

const { KU_AUSFUEHRLICH, KU_KURZ, VEGETATIVE_ANAMNESE } = __require("./sectionBlocks.js");

/**
 * @typedef {object} Snippet
 * @property {string} id
 * @property {string} title
 * @property {string} category
 * @property {string} text        Vorlagentext mit denselben Platzhaltern
 * @property {string} [note]      Hinweis fuer die Bedienoberflaeche
 */

/** @type {Snippet[]} */
const SNIPPETS = [
  /* --- Anamnese und Untersuchung --------------------------------- */
  {
    id: 'veg_anamnese',
    title: 'Vegetative Anamnese',
    category: 'Anamnese & Untersuchung',
    text: VEGETATIVE_ANAMNESE,
  },
  {
    id: 'ku_ausfuehrlich',
    title: 'Körperlicher Untersuchungsbefund (ausführlich)',
    category: 'Anamnese & Untersuchung',
    text: KU_AUSFUEHRLICH,
    note: 'Nutzt Alter, Größe und Gewicht aus den Stammdaten.',
  },
  {
    id: 'ku_kurz',
    title: 'Körperlicher Untersuchungsbefund (Kurzform)',
    category: 'Anamnese & Untersuchung',
    text: KU_KURZ,
    note: 'Herzaktion („rhythmisch"/„arrhythmisch") über das Feld in der Maske.',
  },

  /* --- Technische Befunde ---------------------------------------- */
  {
    id: 'lz_rr',
    title: 'Langzeit-RR',
    category: 'Technische Befunde',
    text: `Langzeit-RR vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:
Gesamtdurchschnitt: xx/xx mmHg
Max. syst. xx mmHg, Max. diast. xx mmHg.
Tagesintervall: durchschn. xx/xx mmHg, Messungen über 135mmHg syst: x,x%, über 85mmHg diastolisch: x,x%
Nachtintervall: durchschn. xx/xx mmHg, Messungen über 125mmHg: x,x%, über 80mmHg diastolisch: x,x%
Gestörte Tag-/Nachtabsenkung (Non-dipper), CAVE: Krankenhausmessung`,
  },
  {
    id: 'lz_ekg',
    title: 'Langzeit-EKG (Variante 1)',
    category: 'Technische Befunde',
    text: `Langzeit-EKG vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:
Zugrundeliegendes Vorhofflimmern/Zugrundeliegender Sinusrhythmus, HF im Mittel xx/min, HF-Spektrum von min xx/min bis max xx/min, keine SVTs/VTs, keine Pausen > 2,5s, keine relevanten Bradykardien, wenige VES/SVES`,
  },
  {
    id: 'lz_ekg_2',
    title: 'Langzeit-EKG (Variante 2)',
    category: 'Technische Befunde',
    text: `durchgehender Sinusrhythmus, Herzfrequenz durchschnittlich 78/min (Min 59/min - Max 111/min)
Supraventrikuläre Extrasystolie, supraventrikuläre Runs, einzelne VES, keine relevanten Brady/Tachykardien, keine höhergradigen Herzrhythmusstörungen`,
  },
  {
    id: 'ekg_aufnahme',
    title: 'EKG bei Aufnahme',
    category: 'Technische Befunde',
    text: `EKG bei Aufnahme:
SR/VHF, HF /min, XT, R/S-Umschlag in V / V, keine signifikanten ERBS`,
  },
  {
    id: 'belastungs_ekg',
    title: 'Belastungs-EKG',
    category: 'Technische Befunde',
    text: `Belastungs-EKG vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:
Abbruch wegen peripherer Erschöpfung, Belastung bis XX Watt, max. HF xx/min, max. RR XX mmHg, adäquate HF-/RR-Veränderung, keine AP-Beschwerden, keine signifikanten ST-Streckenveränderungen, isolierte VES/SVES. Normaler Belastungstest/positiver Belastungstest - Ischämie möglich`,
  },
  {
    id: 'lufu',
    title: 'Lungenfunktionsdiagnostik',
    category: 'Technische Befunde',
    text: `Lungenfunktionsdiagnostik vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:
FEV1  l (%), FEV1/VC max %, MEF 50  l (%), R eff   kPa*s/l,
TLC  l (%), RV/TLC %.
Bodyplethysmographisch  Obstruktion und  Blähung.
Spirometrisch  Obstruktion.
Keine Restriktion.`,
  },
  {
    id: 'bga',
    title: 'Blutgasanalyse',
    category: 'Technische Befunde',
    text: `Blutgasanalyse (unter  l Sauerstoff):
pH , pCO2  mmHg, pO2  mmHg, BE  mmol/l, HCO3  mmol/l
Sauerstoffsättigung  %.
Beurteilung: Normoxämie?, Normokapnie?. Azidose? Metabolisch? Resp.?`,
    note: 'Im Original als Tabelle; hier als Fließtext mit denselben Parametern.',
  },
  {
    id: 'ukg',
    title: 'UKG – Normalbefund',
    category: 'Technische Befunde',
    text: `UKG
Linker Ventrikel mit normalen Diametern und normaler systolischer Funktion. Keine regionalen WBST. Normale Wanddicke. Normale diastolische Funktion.
Aortenklappe unauffällig. AoW nicht erweitert. Keine relevante Mitralinsuffizienz.
Linker Vorhof nicht vergrößert.
Rechts Herz nicht vergrößert. Keine pulmonale Hypertonie.
Keine relevante Trikuspidalinsuffizienz.
Lebervenen nicht gestaut. Kein Perikarderguß. Kein Pleuraerguß.`,
  },
  {
    id: 'abdomensono_kurz',
    title: 'Abdomensonographie (Kurzform)',
    category: 'Technische Befunde',
    text: `Abdomensonographie
Leber: normal groß und regelrecht konfiguriert, homogene echonormale Parenchymstruktur, keine fokalen Läsionen, unauffällige Gefäßarchitektur
Gallenblase: GBwand unauffällig, kein Steinnachweiß
Gallenwege: intra- und extrahep. nicht erweitert,
Pankreas: Pankreas kaum beurteilbar, soweit erkennbar unauffällig
Milz: normal groß, homogen,
Nieren: bds. normal groß, kein Aufstau, Parenchym normal
abd. Gef. Retroper.: soweit einsehbar Bauchaorta, normal weit, Aortensklerose?? / VCI und Lebervenen normalkalibrig
Blase/ Genitale: gut gefüllt, Prostata vergrößert??????
Sonstiges: Pleuraerguss .?????`,
  },
  {
    id: 'abdomensono_lang',
    title: 'Abdomensonographie (ausführlich)',
    category: 'Technische Befunde',
    text: `Leber: Gut beurteilbar, normal groß und regelrecht konfiguriert, homogene echonormale Parenchymstruktur, keine fokalen Läsionen, unauffällige Gefäßarchitektur.
Gallenblase: postbrandial nicht darstellbar
Gallenwege: Gallengänge eingeschränkt beurteilbar, soweit erkennbar unauffällig.
Pankreas: Pankreas eingeschränkt beurteilbar bei deutlicher Darmgasüberlagerung, soweit erkennbar unauffällig.
Milz: Milz eingeschränkt beurteilbar, normal groß.
Nieren: Rechte Niere, normal groß normale Parenchymdicke, orthotop gelegen, mit einer Zyste am Oberpol. Parenchymstruktur homogen, mit normaler Echogenität.
Linke Niere gut beurteilbar und orthotop gelegen, normale Organgröße, Parenchymsaum altersentsprechend, glatte Organkontur, kein Harnstau.
abd. Gef./ Retroper.: Die Aorta und Vena Cava ist eingeschränkt beurteilbar, soweit erkennbar unauffällig.
Magen/ Darm: Kein Nachweis von freier Flüssigkeit in der Bauchhöhle.
Blase/ Genitale: Harnblase gefüllt, unauffällig, Z.n. Prostatektomie.
Lymphknoten: Abdomineller Lymphknotenstatus nicht beurteilbar.
Sonstiges: Beidseits kein Pleuraerguss.`,
  },
  {
    id: 'befund_ueberschriften',
    title: 'Befundüberschriften (leer)',
    category: 'Technische Befunde',
    text: `Transthorakale Echokardiographie vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:

Transösophageale Echokardographie vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:

Koronarangiographie vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:

Röntgen-Thorax vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:

Röntgen-Nasennebenhöhlen vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:

Abdomensonographie vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:

Duplexsonographie der Carotiden vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:

Schellong-Test vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:`,
    note: 'Leere Überschriften wie im Original – zum manuellen Befüllen.',
  },

  /* --- Prozeduren ------------------------------------------------- */
  {
    id: 'aszitespunktion',
    title: 'Aszitespunktion',
    category: 'Prozeduren',
    text: `Aszitespunktion vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:
Nach ausführlicher Patientenaufklärung, unter sterilen Bedingungen und sonographischer Kontrolle, Punktion und komplikationslose Drainage von insgesamt  l bernsteinfarbenen Sekret. Substitution von  ml Humanalbumin 20%. Klinische Chemie, zytologische und mikrobiologische Untersuchung veranlasst.`,
  },
  {
    id: 'pleurapunktion',
    title: 'Sonographie Pleura mit Punktion',
    category: 'Prozeduren',
    text: `Sonographie Pleura mit Punktion vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:
Nach ausführlicher Patientenaufklärung, komplikationslose sonographiegesteuerte Pleurapunktion rechts unter sterilen Bedingungen. Ca.  ml trübe, gelbliche Flüssigkeit gewonnen. Röntgen-Thorax veranlasst.
Klinische Chemie, zytologische und mikrobiologische Untersuchung veranlasst.`,
  },
  {
    id: 'zvk_anlage',
    title: 'ZVK-Anlage',
    category: 'Prozeduren',
    text: `ZVK-Anlage
Nach ausführlicher Patientenaufklärung und subkutaner Applikation von Lokalanästhetikum sonographiegesteuerte Anlage eines dreilumigen zentralen Venenkatheters unter sterilen Kautelen in die rechte/linke V. jugularis interna.
Lagekontrolle mittels konventioneller Röntgen-Thorax-Aufnahme empfohlen.`,
  },
  {
    id: 'thoraxdrainage',
    title: 'Thoraxdrainageanlage',
    category: 'Prozeduren',
    text: `Thoraxdrainageanlage
Nach ausführlicher Patientenaufklärung und sonographischem Aufsuchen des Drainageortes, unter sterilen Kautelen Minithorakotomie, stumpfes Vorpräparieren und komplikationsloses Einbringen einer Thorax-Drainage (doppellumig 20 Cha) in der rechten/linken vorderen Axillarlinie. ca.   ml klaren Erguss im Schuss gewonnen, dann abgeklemmt.
Klinische Chemie, zytologische und mikrobiologische Untersuchung veranlasst.
Röntgen-Thorax-Kontrolle empfohlen. Festes analgetisches Regime mit z.B. 4x 30 gtt. Metamizol und 0,2 mg Buprenorphin bei Bedarf empfohlen.`,
  },

  /* --- Procedere-Zeilen ------------------------------------------- */
  {
    id: 'proc_nierenretention',
    title: 'Nierenretentions- und Elektrolytkontrollen',
    category: 'Procedere',
    text: '- Regelmäßige Nierenretentionsparameter- und Elektrolytkontrollen unter diuretischer Therapie',
  },
  {
    id: 'proc_ldl70',
    title: 'Risikofaktoren, Ziel-LDL < 70 mg/dl',
    category: 'Procedere',
    text: '- Optimale Kontrolle und Einstellung der kardiovaskulären Risikofaktoren, u.a. mit einem Ziel LDL < 70 mg/dl',
  },
  {
    id: 'proc_kontrollkoro',
    title: 'Wiedervorstellung zur Kontrollkoronarangiographie',
    category: 'Procedere',
    text: '- Bei erneuten/persistierenden Beschwerden Wiedervorstellung zur Kontrollkoronarangiographie (RoMed Klinikum Rosenheim, Medizinische Klinik I, Kardiologie, Tel. Chefarztsekreteriat 08031/365 3101).',
  },
  {
    id: 'proc_hk_termin',
    title: 'Termin Herzkatheteruntersuchung',
    category: 'Procedere',
    text: '- Termin für Herzkatheteruntersuchung am {{befund_datum | date | fallback:"XX.XX.XXXX"}} um 7.30 Uhr auf Station XX (Bitte mit Überweisungsschein und aktuellem Labor)',
  },
  {
    id: 'proc_heparin_bridging',
    title: 'Überlappende Heparin-Therapie',
    category: 'Procedere',
    text: '- Überlappende Heparin-Therapie für 2 Tage bei erreichtem Ziel-INR von 2,0 bis 3,0 unter Marcumar-Therapie',
  },
  {
    id: 'proc_amiodaron',
    title: 'Amiodaron-Monitoring',
    category: 'Procedere',
    text: '- Unter Amiodarontherapie bitte regelmäßige EKG-Kontrollen (QTc <500 ms), Laborkontrollen (Schilddrüsenhormone, Leberwerte), sowie jährliche augenärztliche Kontrollen und jährliche Lungenfunktionsprüfungen',
  },
  {
    id: 'proc_prednisolon',
    title: 'Prednisolon-Ausschleichschema',
    category: 'Procedere',
    text: '- Prednisolon 25mg z. B. Decortin H 1-0-0 bis einschließlich {{befund_datum | date | fallback:"XX.XX.XXXX"}}, dann wöchentliche Dosisreduktion zunächst auf 12,5mg, dann 7,5mg, dann in 2,5mg-Schritten ausschleichen und absetzen.',
  },
];

const SNIPPET_CATEGORIES = [...new Set(SNIPPETS.map((snippet) => snippet.category))];

/**
 * Feld, das die datumsabhaengigen Bausteine speist. Es wird beim Einfuegen
 * eines Bausteins gebraucht und deshalb allen Vorlagen zugeschlagen.
 */
const SNIPPET_DATE_FIELD = {
  key: 'befund_datum',
  label: 'Befunddatum für Bausteine',
  type: 'date',
  help: 'Wird von Bausteinen verwendet, die „vom XX.XX.XXXX" enthalten.',
};

      /* Exporte */
      __exports["SNIPPETS"] = SNIPPETS;
      __exports["SNIPPET_CATEGORIES"] = SNIPPET_CATEGORIES;
      __exports["SNIPPET_DATE_FIELD"] = SNIPPET_DATE_FIELD;
  };

  __definitionen["src/ui/snippetView.js"] = function (__exports, __require) {
/* ---- src/ui/snippetView.js ---- */
/**
 * Bausteinbibliothek.
 *
 * Zeigt die Bausteine aus Textbausteine_Kardio.docx, rendert sie mit den
 * aktuellen Eingaben und fuegt sie an der Cursorposition in einen Abschnitt
 * der Vorschau ein.
 */

const { copyToClipboard, el, replaceChildren } = __require("./dom.js");
const { SNIPPETS, SNIPPET_CATEGORIES } = __require("../data/snippets.js");
const { render } = __require("../engine/renderer.js");
const { withDerivedValues } = __require("../core/derived.js");

function createSnippetView({ dialog, container, targetSelect, store, preview, onStatus }) {
  let activeCategory = SNIPPET_CATEGORIES[0];
  let filterText = '';

  const status = (message, tone = 'info') => onStatus && onStatus(message, tone);

  function renderedText(snippet) {
    return render(snippet.text, withDerivedValues(store.values), { cleanup: false }).text;
  }

  function renderTargets() {
    const sections = preview.listSections();
    const focused = preview.getFocusedSectionId();
    replaceChildren(targetSelect, sections.map((section) => el('option', {
      value: section.id,
      text: section.title,
      selected: section.id === focused,
    })));
  }

  function renderList() {
    const needle = filterText.trim().toLowerCase();
    const matches = SNIPPETS.filter((snippet) => {
      const inCategory = needle ? true : snippet.category === activeCategory;
      const matchesText = !needle
        || snippet.title.toLowerCase().includes(needle)
        || snippet.text.toLowerCase().includes(needle);
      return inCategory && matchesText;
    });

    replaceChildren(container, [
      el('div', { class: 'snippet-tabs' }, SNIPPET_CATEGORIES.map((category) => el('button', {
        type: 'button',
        class: ['tab-small', category === activeCategory && !needle ? 'is-active' : ''],
        text: category,
        on: { click: () => { activeCategory = category; filterText = ''; renderAll(); } },
      }))),
      matches.length
        ? el('ul', { class: 'snippet-list' }, matches.map((snippet) => {
          const text = renderedText(snippet);
          return el('li', { class: 'snippet' }, [
            el('div', { class: 'snippet-head' }, [
              el('strong', { text: snippet.title }),
              el('div', { class: 'output-actions' }, [
                el('button', {
                  type: 'button', class: 'small', text: 'Einfügen',
                  on: {
                    click: () => {
                      const ok = preview.insertSnippet(text, targetSelect.value);
                      if (ok) dialog.close();
                    },
                  },
                }),
                el('button', {
                  type: 'button', class: 'secondary small', text: 'Kopieren',
                  on: {
                    click: async () => {
                      const copied = await copyToClipboard(text);
                      status(copied ? 'Baustein kopiert.' : 'Kopieren nicht möglich.', copied ? 'success' : 'error');
                    },
                  },
                }),
              ]),
            ]),
            snippet.note ? el('p', { class: 'help', text: snippet.note }) : null,
            el('pre', { class: 'snippet-preview', text }),
          ]);
        }))
        : el('p', { class: 'hint', text: 'Kein Baustein gefunden.' }),
    ]);
  }

  function renderAll() {
    renderTargets();
    renderList();
  }

  function open() {
    renderAll();
    dialog.showModal();
  }

  return { open, refresh: renderAll, setFilter: (value) => { filterText = value; renderList(); } };
}

      /* Exporte */
      __exports["createSnippetView"] = createSnippetView;
  };

  __definitionen["src/main.js"] = function (__exports, __require) {
/* ---- src/main.js ---- */
/**
 * Einstiegspunkt: verdrahtet Zustand und Oberflaeche.
 *
 * Die Anwendung laeuft vollstaendig lokal. Es gibt in diesem Projekt keinen
 * einzigen `fetch`, kein `XMLHttpRequest`, keinen `WebSocket`, keine externe
 * Ressource und keinen Schreibzugriff auf die URL.
 */

const { createStore } = __require("./core/store.js");
const { BUILTIN_TEMPLATES } = __require("./data/templates/index.js");
const { SHARED_FIELD_GROUPS } = __require("./data/fields.js");
const { $, el, replaceChildren } = __require("./ui/dom.js");
const { createFormView } = __require("./ui/formView.js");
const { createPreviewView } = __require("./ui/previewView.js");
const { createEditorView } = __require("./ui/editorView.js");
const { createSnippetView } = __require("./ui/snippetView.js");

/* ------------------------------------------------------------------ */
/* Startdiagnose                                                       */
/* ------------------------------------------------------------------ */

/**
 * Zeigt einen Startfehler im statischen Hinweisfeld an.
 *
 * Es wird ausschliesslich die technische Fehlermeldung ausgegeben. Der
 * Anwendungszustand und damit jede Patienteneingabe bleibt aussen vor.
 */
function startfehlerAnzeigen(fehler) {
  try {
    const hinweis = document.getElementById('start-hinweis');
    const titel = document.getElementById('start-hinweis-titel');
    const text = document.getElementById('start-hinweis-text');
    if (!hinweis || !titel || !text) return;

    hinweis.hidden = false;
    hinweis.classList.add('is-error');
    titel.textContent = 'Die Anwendung konnte nicht gestartet werden.';
    text.classList.remove('startup-hint');
    text.textContent = 'Technische Meldung: '
      + (fehler && fehler.message ? fehler.message : String(fehler))
      + ' – Weitere Einzelheiten stehen in der Browserkonsole (Taste F12). '
      + 'Bitte prüfen Sie, ob das heruntergeladene Archiv vollständig entpackt wurde.';
  } catch {
    // Wenn selbst das scheitert, bleibt der statische Hinweis stehen.
  }
}

// Fehler, die erst nach dem Start auftreten, sollen nicht still verpuffen.
// Protokolliert wird nur die technische Meldung, niemals Formulardaten.
window.addEventListener('error', (ereignis) => {
  console.error('Arztbriefgenerator: unerwarteter Fehler –', ereignis.message);
});
window.addEventListener('unhandledrejection', (ereignis) => {
  console.error('Arztbriefgenerator: unbehandelte Zurückweisung –', ereignis.reason?.message ?? ereignis.reason);
});

/**
 * Baut die Anwendung auf. Laeuft vollstaendig in einem try/catch, damit ein
 * Fehler beim Start sichtbar wird, statt eine funktionslose Oberflaeche zu
 * hinterlassen.
 */
function anwendungStarten() {
  const store = createStore({ builtinTemplates: BUILTIN_TEMPLATES, sharedGroups: SHARED_FIELD_GROUPS });

  /* ------------------------------------------------------------------ */
  /* Statusmeldungen                                                     */
  /* ------------------------------------------------------------------ */

  const statusBar = $('#statusleiste');
  let statusTimer = null;

  function showStatus(message, tone = 'info') {
    if (statusTimer) clearTimeout(statusTimer);
    statusBar.className = `statusbar statusbar-${tone}`;
    statusBar.textContent = message;
    statusBar.hidden = false;
    if (tone !== 'error') {
      statusTimer = setTimeout(() => { statusBar.hidden = true; }, 6000);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Ansichten                                                           */
  /* ------------------------------------------------------------------ */

  const preview = createPreviewView({
    container: $('#ausgabe'),
    statusContainer: $('#ausgabe-status'),
    store,
    onStatus: showStatus,
  });

  const form = createFormView({
    container: $('#eingabemaske'),
    store,
    onChange: () => { if (store.settings.autoPreview) preview.build(); },
  });

  const editor = createEditorView({
    listContainer: $('#vorlagenliste'),
    formContainer: $('#vorlageneditor'),
    store,
    onStatus: showStatus,
    onTemplatesChanged: () => {
      renderTemplateSelect();
      form.render();
      preview.build();
    },
  });

  const snippets = createSnippetView({
    dialog: $('#bausteine-dialog'),
    container: $('#bausteine-liste'),
    targetSelect: $('#bausteine-ziel'),
    store,
    preview,
    onStatus: showStatus,
  });

  /* ------------------------------------------------------------------ */
  /* Vorlagenauswahl                                                     */
  /* ------------------------------------------------------------------ */

  const templateSelect = $('#vorlage');
  const templateInfo = $('#vorlage-info');

  function renderTemplateSelect() {
    const templates = store.listTemplates();
    const active = store.getActiveTemplate();
    const byGroup = new Map();
    for (const template of templates) {
      if (!byGroup.has(template.group)) byGroup.set(template.group, []);
      byGroup.get(template.group).push(template);
    }

    replaceChildren(templateSelect, [...byGroup.entries()].map(([group, entries]) => el(
      'optgroup',
      { attrs: { label: group } },
      entries.map((template) => el('option', {
        value: template.id,
        text: template.title,
        selected: active && template.id === active.id,
      })),
    )));

    replaceChildren(templateInfo, active
      ? [
        active.description ? el('p', { text: active.description }) : null,
        active.source ? el('p', { class: 'source-note', text: `Quelle: ${active.source}` }) : null,
      ]
      : []);
  }

  templateSelect.addEventListener('change', (event) => {
    if (store.hasManualEdits()) {
      const proceed = confirm('In der Vorschau gibt es von Hand bearbeitete Abschnitte. Beim Wechsel der Vorlage gehen diese Änderungen verloren. Fortfahren?');
      if (!proceed) {
        renderTemplateSelect();
        return;
      }
    }
    store.setActiveTemplate(event.target.value);
  });

  /* ------------------------------------------------------------------ */
  /* Kopfleiste und Aktionen                                             */
  /* ------------------------------------------------------------------ */

  const views = {
    generator: $('#ansicht-generator'),
    editor: $('#ansicht-editor'),
  };
  const tabs = {
    generator: $('#tab-generator'),
    editor: $('#tab-editor'),
  };

  function showView(name) {
    for (const [key, node] of Object.entries(views)) {
      node.hidden = key !== name;
      tabs[key].classList.toggle('is-active', key === name);
      tabs[key].setAttribute('aria-selected', String(key === name));
    }
    if (name === 'editor') editor.refresh();
  }

  tabs.generator.addEventListener('click', () => showView('generator'));
  tabs.editor.addEventListener('click', () => showView('editor'));

  $('#aktualisieren').addEventListener('click', () => {
    preview.build();
    showStatus('Vorschau aktualisiert.', 'success');
  });

  $('#alles-kopieren').addEventListener('click', () => preview.copyAll());

  $('#bausteine-oeffnen').addEventListener('click', () => snippets.open());
  $('#bausteine-schliessen').addEventListener('click', () => $('#bausteine-dialog').close());
  $('#bausteine-suche').addEventListener('input', (event) => snippets.setFilter(event.target.value));

  $('#eingaben-zuruecksetzen').addEventListener('click', () => {
    if (!confirm('Alle Eingaben dieser Sitzung löschen? Vorlagen bleiben erhalten.')) return;
    store.resetValues();
    showStatus('Eingaben gelöscht.', 'success');
  });

  /* Einstellungen */
  const autoPreviewToggle = $('#einstellung-livevorschau');
  const persistToggle = $('#einstellung-eingaben-merken');
  const titlesToggle = $('#einstellung-ueberschriften');

  autoPreviewToggle.checked = store.settings.autoPreview;
  persistToggle.checked = store.settings.persistValues;
  titlesToggle.checked = store.settings.sectionTitlesInOutput;

  autoPreviewToggle.addEventListener('change', (event) => {
    store.updateSettings({ autoPreview: event.target.checked });
    $('#aktualisieren').hidden = event.target.checked;
    if (event.target.checked) preview.build();
  });

  persistToggle.addEventListener('change', (event) => {
    if (event.target.checked) {
      const proceed = confirm(
        'Eingaben lokal zwischenspeichern?\n\n'
        + 'Dabei werden die eingegebenen Patientendaten im Speicher dieses Browsers abgelegt und bleiben nach dem Schließen erhalten. '
        + 'Sie verlassen das Gerät nicht. Auf gemeinsam genutzten Rechnern wird davon abgeraten.',
      );
      if (!proceed) {
        event.target.checked = false;
        return;
      }
    }
    store.updateSettings({ persistValues: event.target.checked });
    showStatus(event.target.checked ? 'Eingaben werden lokal zwischengespeichert.' : 'Eingaben werden nicht mehr gespeichert.', 'info');
  });

  titlesToggle.addEventListener('change', (event) => {
    store.updateSettings({ sectionTitlesInOutput: event.target.checked });
  });

  $('#alles-loeschen').addEventListener('click', () => {
    if (!confirm('Sämtliche lokal gespeicherten Daten löschen – eigene Vorlagen, Einstellungen und zwischengespeicherte Eingaben?')) return;
    store.clearAll();
    showStatus('Alle lokal gespeicherten Daten wurden gelöscht.', 'success');
  });

  /* ------------------------------------------------------------------ */
  /* Zustandsabonnement                                                  */
  /* ------------------------------------------------------------------ */

  store.subscribe((reason) => {
    if (reason === 'template' || reason === 'templates' || reason === 'reset') {
      renderTemplateSelect();
      form.render();
    }
    if (reason === 'values' && !store.settings.autoPreview) return;
    preview.build();

    if (store.saveError) showStatus(store.saveError, 'error');
  });

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */

  renderTemplateSelect();
  form.render();
  preview.build();
  showView('generator');
  $('#aktualisieren').hidden = store.settings.autoPreview;

  for (const notice of store.consumeNotices()) showStatus(notice, 'info');
  if (store.saveError) showStatus(store.saveError, 'error');

  // Start geglueckt: Hinweisfeld ausblenden.
  const startHinweis = document.getElementById('start-hinweis');
  if (startHinweis) startHinweis.hidden = true;
  window.__arztbriefBereit = true;
}

try {
  anwendungStarten();
} catch (fehler) {
  console.error('Arztbriefgenerator: Start fehlgeschlagen –', fehler);
  startfehlerAnzeigen(fehler);
}
  };

  __laden("src/main.js");
}());
