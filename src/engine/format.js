/**
 * Ausgabeformatierung (Filter) fuer Platzhalter.
 *
 * Die Filter sind bewusst nachsichtig: Ein Wert, der nicht dem erwarteten
 * Format entspricht (z. B. weil der Anwender "XX.XX." eingetippt hat statt
 * ein Datum zu waehlen), wird unveraendert durchgereicht statt verworfen.
 */

import { asText, isEmpty, toNumber } from './values.js';

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

export const FILTERS = {
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
export function applyFilters(value, filters, onError) {
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

export const FILTER_NAMES = Object.keys(FILTERS);
