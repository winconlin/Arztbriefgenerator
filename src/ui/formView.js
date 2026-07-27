/**
 * Dynamische Eingabemaske.
 *
 * Rendert die Feldgruppen des aktiven Templates in klinischer Reihenfolge,
 * unterstuetzt alle Feldtypen inklusive Wiederholgruppen und blendet Felder
 * nach ihren Sichtbarkeitsregeln ein und aus.
 */

import { el, replaceChildren } from './dom.js';
import { isVisible } from '../core/letter.js';
import { withDerivedValues } from '../core/derived.js';
import { defaultValueForField, resolveFieldGroups } from '../core/schema.js';
import { collectExpressionPaths } from '../engine/expression.js';

const CUSTOM_OPTION = '__frei__';

export function createFormView({ container, store, onChange }) {
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
