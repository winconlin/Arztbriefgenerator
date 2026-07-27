/**
 * Template-Schema, Normalisierung und Validierung.
 *
 * Schema-Version 3 loest die feste Dreiteilung (Diagnosen/Epikrise/Procedere)
 * des Prototyps ab: Ein Template besteht aus beliebig vielen, sortierbaren
 * Abschnitten und beliebig vielen, klinisch gruppierten Feldern.
 */

import { collectConditions, collectTemplatePaths } from '../engine/tokenizer.js';
import { getParsedTemplate } from '../engine/renderer.js';
import { collectExpressionPaths, validateExpression } from '../engine/expression.js';
import { FILTER_NAMES } from '../engine/format.js';
import { DERIVED_KEYS, DERIVED_VARIABLES } from './derived.js';

export const SCHEMA_VERSION = 3;

/** Alle unterstuetzten Feldtypen. */
export const FIELD_TYPES = {
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

export const FIELD_TYPE_KEYS = Object.keys(FIELD_TYPES);

const ID_PATTERN = /^[a-z][a-z0-9_-]*$/i;
const KEY_PATTERN = /^[a-z][a-z0-9_]*$/i;

/* ------------------------------------------------------------------ */
/* Normalisierung                                                      */
/* ------------------------------------------------------------------ */

/** Bringt eine Option in die Form { value, label }. */
export function normaliseOption(option) {
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

export function normaliseField(raw) {
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
export const DEFAULT_GROUP_ORDER = 50;

export function normaliseFieldGroup(raw, index) {
  return {
    id: String(raw?.id ?? `gruppe_${index + 1}`).trim(),
    order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : DEFAULT_GROUP_ORDER,
    title: String(raw?.title ?? `Gruppe ${index + 1}`).trim(),
    description: raw?.description ? String(raw.description) : '',
    visibleIf: raw?.visibleIf ? String(raw.visibleIf) : '',
    fields: (Array.isArray(raw?.fields) ? raw.fields : []).map(normaliseField),
  };
}

export function normaliseSection(raw, index) {
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
export function normaliseTemplate(raw) {
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
export function resolveFieldGroups(template, sharedGroupsById) {
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
export function resolveFields(template, sharedGroupsById) {
  return resolveFieldGroups(template, sharedGroupsById).flatMap((group) => group.fields);
}

/** Alle Feldschluessel, die in Vorlagentexten verwendet werden duerfen. */
export function knownKeys(template, sharedGroupsById) {
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
export function defaultValues(template, sharedGroupsById) {
  const values = {};
  for (const field of resolveFields(template, sharedGroupsById)) {
    values[field.key] = defaultValueForField(field);
  }
  return values;
}

export function defaultValueForField(field) {
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
export function validateTemplate(template, { existingIds = [], sharedGroupsById = new Map() } = {}) {
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

export { DERIVED_VARIABLES };
