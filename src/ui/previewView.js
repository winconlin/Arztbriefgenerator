/**
 * Live-Vorschau des Briefs.
 *
 * Jeder Abschnitt ist einzeln editierbar und kopierbar. Sobald ein Abschnitt
 * von Hand bearbeitet wurde, wird er nicht mehr automatisch ueberschrieben:
 * Die Maske meldet dann nur noch, dass eine neuere Fassung vorliegt, und das
 * Ueberschreiben muss ausdruecklich bestaetigt werden.
 */

import { copyToClipboard, el, insertAtCursor, replaceChildren } from './dom.js';
import { findMissingRequired, generateLetter, letterToText } from '../core/letter.js';

export function createPreviewView({ container, statusContainer, store, onStatus }) {
  /** Zuletzt gerenderte Abschnitte – fuer Kopieren und Bausteineinfuegen. */
  let currentSections = [];
  /** Textfelder je Abschnitt, damit Bausteine an der Cursorposition landen. */
  const textareas = new Map();
  let lastFocusedSectionId = null;

  function status(message, tone = 'info') {
    if (onStatus) onStatus(message, tone);
  }

  function build() {
    const template = store.getActiveTemplate();
    if (!template) {
      replaceChildren(container, el('p', { class: 'hint', text: 'Keine Vorlage ausgewählt.' }));
      currentSections = [];
      return;
    }

    // Fokus und Cursorposition ueber den Neuaufbau retten, damit das Tippen
    // in einem Abschnitt nicht unterbrochen wird.
    const active = document.activeElement;
    const activeId = active && container.contains(active) ? active.id : null;
    const caretStart = activeId ? active.selectionStart : null;
    const caretEnd = activeId ? active.selectionEnd : null;

    const letter = generateLetter(template, store.values, store.sharedGroupsById, {
      manualSections: store.getManualSections(),
    });
    currentSections = letter.sections;
    textareas.clear();

    renderStatus(template, letter);
    replaceChildren(container, letter.sections.map(renderSection));
    for (const textarea of textareas.values()) autosize(textarea);

    if (activeId) {
      const restored = container.querySelector(`#${CSS.escape(activeId)}`);
      if (restored) {
        restored.focus();
        try { restored.setSelectionRange(caretStart, caretEnd); } catch { /* nicht auswaehlbar */ }
      }
    }
  }

  function renderStatus(template, letter) {
    if (!statusContainer) return;
    const missing = findMissingRequired(template, store.values, store.sharedGroupsById);
    const parts = [];

    if (letter.errors.length) {
      parts.push(el('div', { class: 'banner banner-error' }, [
        el('strong', { text: 'Fehler in der Vorlage: ' }),
        el('ul', {}, letter.errors.map((message) => el('li', { text: message }))),
      ]));
    }

    if (missing.length) {
      parts.push(el('div', { class: 'banner banner-warn' }, [
        el('strong', { text: `${missing.length} Pflichtfeld${missing.length === 1 ? '' : 'er'} noch offen: ` }),
        el('span', { text: missing.map((entry) => entry.label).join(', ') }),
      ]));
    }

    const manualCount = store.listManualSections().length;
    if (manualCount > 0) {
      parts.push(el('div', { class: 'banner banner-info' }, [
        el('span', { text: `${manualCount} Abschnitt${manualCount === 1 ? '' : 'e'} von Hand bearbeitet – ${manualCount === 1 ? 'dieser wird' : 'diese werden'} nicht automatisch überschrieben. ` }),
        el('button', {
          type: 'button',
          class: 'link-button',
          text: 'Alle manuellen Änderungen verwerfen',
          on: {
            click: () => {
              if (!confirm('Alle manuellen Änderungen an den Abschnitten verwerfen und neu aus der Vorlage erzeugen?')) return;
              store.discardManualText();
              status('Manuelle Änderungen verworfen.', 'info');
            },
          },
        }),
      ]));
    }

    replaceChildren(statusContainer, parts);
  }

  /** Textfeld auf seinen Inhalt wachsen lassen – der Brief soll ganz sichtbar sein. */
  function autosize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight + 2}px`;
  }

  function renderSection(section) {
    const textareaId = `abschnitt-${section.id}`;
    const textarea = el('textarea', {
      id: textareaId,
      class: ['section-text', section.manual ? 'is-manual' : ''],
      rows: 2,
      value: section.text,
      attrs: { 'aria-label': `${section.title} – generierter Text` },
      on: {
        focus: () => { lastFocusedSectionId = section.id; },
        input: (event) => {
          autosize(event.target);
          const value = event.target.value;
          // Wird der Text wieder auf den generierten Stand gebracht, gilt der
          // Abschnitt nicht laenger als manuell bearbeitet.
          if (value === section.generatedText) store.discardManualText(section.id);
          else store.setManualText(section.id, value, section.generatedText);
        },
      },
    });
    textareas.set(section.id, textarea);

    const badges = [];
    if (section.manual) badges.push(el('span', { class: 'badge badge-manual', text: 'manuell bearbeitet' }));
    if (section.outdated) badges.push(el('span', { class: 'badge badge-outdated', text: 'Vorlage hat sich geändert' }));
    if (section.empty && !section.manual) badges.push(el('span', { class: 'badge', text: 'leer' }));

    const actions = [
      el('button', {
        type: 'button',
        class: 'secondary small',
        text: 'Kopieren',
        on: {
          click: async () => {
            const ok = await copyToClipboard(textarea.value);
            status(ok ? `Abschnitt „${section.title}" kopiert.` : 'Kopieren nicht möglich – bitte den Text manuell markieren.', ok ? 'success' : 'error');
          },
        },
      }),
    ];

    if (section.manual) {
      actions.push(el('button', {
        type: 'button',
        class: 'secondary small',
        text: 'Aus Vorlage neu erzeugen',
        attrs: { title: 'Verwirft die manuellen Änderungen dieses Abschnitts' },
        on: {
          click: () => {
            if (!confirm(`Die manuellen Änderungen im Abschnitt „${section.title}" verwerfen und neu aus der Vorlage erzeugen?`)) return;
            store.discardManualText(section.id);
            status(`Abschnitt „${section.title}" neu erzeugt.`, 'info');
          },
        },
      }));
    }

    return el('section', { class: 'output-section' }, [
      el('div', { class: 'output-head' }, [
        el('h3', {}, [el('label', { attrs: { for: textareaId }, text: section.title }), ...badges]),
        el('div', { class: 'output-actions' }, actions),
      ]),
      textarea,
    ]);
  }

  /** Gesamttext, so wie er aktuell in den Feldern steht (inkl. manueller Änderungen). */
  function fullText() {
    const withTitles = store.settings.sectionTitlesInOutput;
    const sections = currentSections.map((section) => ({
      title: section.title,
      text: textareas.get(section.id)?.value ?? section.text,
    }));
    return letterToText(sections, { withTitles });
  }

  async function copyAll() {
    const text = fullText();
    if (!text.trim()) {
      status('Es gibt noch keinen Text zum Kopieren.', 'warn');
      return;
    }
    const ok = await copyToClipboard(text);
    status(ok ? 'Gesamter Brief kopiert.' : 'Kopieren nicht möglich – bitte den Text manuell markieren.', ok ? 'success' : 'error');
  }

  /** Fuegt einen Baustein in den zuletzt fokussierten Abschnitt ein. */
  function insertSnippet(text, sectionId) {
    const target = sectionId || lastFocusedSectionId || currentSections[0]?.id;
    const textarea = textareas.get(target);
    if (!textarea) {
      status('Kein Zielabschnitt vorhanden.', 'warn');
      return false;
    }
    insertAtCursor(textarea, text);
    status(`Baustein in „${currentSections.find((section) => section.id === target)?.title}" eingefügt.`, 'success');
    return true;
  }

  return {
    build,
    fullText,
    copyAll,
    insertSnippet,
    listSections: () => currentSections.map((section) => ({ id: section.id, title: section.title })),
    getFocusedSectionId: () => lastFocusedSectionId,
  };
}
