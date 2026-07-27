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
export function cleanupText(source) {
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
export function joinSections(sections, { withTitles = true } = {}) {
  return sections
    .filter((section) => String(section.text ?? '').trim() !== '')
    .map((section) => (withTitles ? `${section.title}\n${section.text}` : section.text))
    .join('\n\n');
}
