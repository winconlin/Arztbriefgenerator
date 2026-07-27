/**
 * Zentraler Anwendungszustand.
 *
 * Der Store haelt alle Daten an einer Stelle und benachrichtigt die
 * Oberflaechen-Module ueber Aenderungen. Er kennt kein DOM.
 */

import { DEFAULT_SETTINGS, loadState, saveState, clearStorage } from './storage.js';
import { defaultValueForField, normaliseTemplate, resolveFields } from './schema.js';

export function createStore({ builtinTemplates = [], sharedGroups = [] } = {}) {
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
