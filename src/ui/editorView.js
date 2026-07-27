/**
 * Vorlagen-Editor.
 *
 * Vorlagen anlegen, bearbeiten, duplizieren, loeschen, exportieren und
 * importieren. Gearbeitet wird auf einer Arbeitskopie; gespeichert wird erst
 * nach erfolgreicher Validierung (eindeutige IDs, gueltige Platzhalter,
 * gueltige Bedingungen).
 */

import { downloadJson, el, insertAtCursor, replaceChildren } from './dom.js';
import {
  DERIVED_VARIABLES,
  FIELD_TYPES,
  SCHEMA_VERSION,
  normaliseTemplate,
  resolveFieldGroups,
  validateTemplate,
} from '../core/schema.js';
import { clearTemplateCache } from '../engine/renderer.js';

export function createEditorView({ listContainer, formContainer, store, onStatus, onTemplatesChanged }) {
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
