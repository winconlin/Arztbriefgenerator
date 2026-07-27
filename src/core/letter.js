/**
 * Erzeugt aus Template + Eingaben den fertigen Brief.
 */

import { render } from '../engine/renderer.js';
import { cleanupText, joinSections } from '../engine/cleanup.js';
import { evaluateCondition } from '../engine/expression.js';
import { isEmpty } from '../engine/values.js';
import { withDerivedValues } from './derived.js';
import { resolveFieldGroups } from './schema.js';

/**
 * Ist ein Feld/eine Gruppe/ein Abschnitt unter den aktuellen Eingaben sichtbar?
 */
export function isVisible(entry, data) {
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
export function generateLetter(template, values, sharedGroupsById, options = {}) {
  const manualSections = options.manualSections ?? new Map();
  const data = withDerivedValues(values);
  const errors = [];
  const sections = [];

  if (!template) return { sections, errors, data };

  for (const section of template.sections) {
    if (!section.enabled) continue;
    if (!isVisible(section, data)) continue;

    const manualText = manualSections.get(section.id);
    const result = render(section.template, data);
    for (const message of result.errors) {
      const prefixed = `${section.title}: ${message}`;
      if (!errors.includes(prefixed)) errors.push(prefixed);
    }

    const generated = result.text;
    const isManual = manualText !== undefined && manualText !== null;

    sections.push({
      id: section.id,
      title: section.title,
      text: isManual ? manualText : generated,
      generatedText: generated,
      manual: isManual,
      /** Weicht der manuelle Text inzwischen von der Neugenerierung ab? */
      outdated: isManual && cleanupText(manualText) !== generated,
      empty: generated.trim() === '',
    });
  }

  return { sections, errors, data };
}

/** Gesamtbrief als Text. */
export function letterToText(sections, { withTitles = true } = {}) {
  return joinSections(sections, { withTitles });
}

/**
 * Prueft Pflichtfelder. Nur sichtbare Felder in sichtbaren Gruppen zaehlen –
 * ein ausgeblendetes Feld darf die Generierung nicht blockieren.
 *
 * @returns {Array<{ key: string, label: string, group: string }>}
 */
export function findMissingRequired(template, values, sharedGroupsById) {
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
