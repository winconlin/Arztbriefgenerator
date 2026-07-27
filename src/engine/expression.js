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

import { compare, contains, getPath, isEmpty, isTruthy } from './values.js';

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
export function compileExpression(source) {
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
export function evaluateCondition(source, scope, onError) {
  if (source === undefined || source === null || String(source).trim() === '') return true;
  try {
    return isTruthy(evaluateNode(compileExpression(source), scope));
  } catch (error) {
    if (typeof onError === 'function') onError(error, source);
    return false;
  }
}

/** Prueft die Syntax ohne Auswertung. Liefert `null` oder die Fehlermeldung. */
export function validateExpression(source) {
  if (source === undefined || source === null || String(source).trim() === '') return null;
  try {
    compileExpression(source);
    return null;
  } catch (error) {
    return error.message;
  }
}

/** Alle in einem Ausdruck referenzierten Feldnamen (Wurzelsegment). */
export function collectExpressionPaths(source) {
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

export { ExpressionError };
