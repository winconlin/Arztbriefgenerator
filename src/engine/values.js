/**
 * Wertzugriff und Wahrheitswerte fuer die Template-Engine.
 *
 * Bewusst ohne jede DOM- oder Browser-Abhaengigkeit, damit die Engine
 * unveraendert unter node:test laeuft.
 */

/** Leerwert im Sinne der Engine: null, undefined, "", "   ", []. */
export function isEmpty(value) {
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
export function isTruthy(value) {
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
export function toNumber(value) {
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
export function getPath(scope, path) {
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
export function compare(left, right, operator) {
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
export function contains(haystack, needle) {
  if (Array.isArray(haystack)) {
    return haystack.some((entry) => normaliseForEquality(entry) === normaliseForEquality(needle));
  }
  if (typeof haystack === 'string') {
    return haystack.toLowerCase().includes(asText(needle).toLowerCase());
  }
  return false;
}

/** Textdarstellung eines Wertes fuer die Ausgabe. */
export function asText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'ja' : '';
  if (Array.isArray(value)) return value.map(asText).filter((entry) => entry !== '').join(', ');
  if (typeof value === 'object') return '';
  return String(value);
}
