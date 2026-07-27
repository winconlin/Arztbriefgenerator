/**
 * Persistenz im localStorage – inklusive Migration der Daten aus dem
 * Prototypen.
 *
 * Datenschutz: Standardmaessig werden ausschliesslich *Vorlagen* gespeichert,
 * niemals Patienteneingaben. Das Zwischenspeichern von Eingaben ist ein
 * ausdrueckliches Opt-in (`settings.persistValues`) und jederzeit mit einem
 * Klick loeschbar.
 */

import { SCHEMA_VERSION, normaliseTemplate } from './schema.js';

export const STORAGE_KEY = 'arztbrief_daten_v3';
export const LEGACY_KEYS = ['arztbrief_templates_all_v2', 'arztbrief_templates_all'];

export const DEFAULT_SETTINGS = {
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
export function loadState() {
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
export function saveState(state) {
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
export function clearStorage() {
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
export function migrateTemplate(legacy) {
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
