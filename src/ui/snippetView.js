/**
 * Bausteinbibliothek.
 *
 * Zeigt die Bausteine aus Textbausteine_Kardio.docx, rendert sie mit den
 * aktuellen Eingaben und fuegt sie an der Cursorposition in einen Abschnitt
 * der Vorschau ein.
 */

import { copyToClipboard, el, replaceChildren } from './dom.js';
import { SNIPPETS, SNIPPET_CATEGORIES } from '../data/snippets.js';
import { render } from '../engine/renderer.js';
import { withDerivedValues } from '../core/derived.js';

export function createSnippetView({ dialog, container, targetSelect, store, preview, onStatus }) {
  let activeCategory = SNIPPET_CATEGORIES[0];
  let filterText = '';

  const status = (message, tone = 'info') => onStatus && onStatus(message, tone);

  function renderedText(snippet) {
    return render(snippet.text, withDerivedValues(store.values), { cleanup: false }).text;
  }

  function renderTargets() {
    const sections = preview.listSections();
    const focused = preview.getFocusedSectionId();
    replaceChildren(targetSelect, sections.map((section) => el('option', {
      value: section.id,
      text: section.title,
      selected: section.id === focused,
    })));
  }

  function renderList() {
    const needle = filterText.trim().toLowerCase();
    const matches = SNIPPETS.filter((snippet) => {
      const inCategory = needle ? true : snippet.category === activeCategory;
      const matchesText = !needle
        || snippet.title.toLowerCase().includes(needle)
        || snippet.text.toLowerCase().includes(needle);
      return inCategory && matchesText;
    });

    replaceChildren(container, [
      el('div', { class: 'snippet-tabs' }, SNIPPET_CATEGORIES.map((category) => el('button', {
        type: 'button',
        class: ['tab-small', category === activeCategory && !needle ? 'is-active' : ''],
        text: category,
        on: { click: () => { activeCategory = category; filterText = ''; renderAll(); } },
      }))),
      matches.length
        ? el('ul', { class: 'snippet-list' }, matches.map((snippet) => {
          const text = renderedText(snippet);
          return el('li', { class: 'snippet' }, [
            el('div', { class: 'snippet-head' }, [
              el('strong', { text: snippet.title }),
              el('div', { class: 'output-actions' }, [
                el('button', {
                  type: 'button', class: 'small', text: 'Einfügen',
                  on: {
                    click: () => {
                      const ok = preview.insertSnippet(text, targetSelect.value);
                      if (ok) dialog.close();
                    },
                  },
                }),
                el('button', {
                  type: 'button', class: 'secondary small', text: 'Kopieren',
                  on: {
                    click: async () => {
                      const copied = await copyToClipboard(text);
                      status(copied ? 'Baustein kopiert.' : 'Kopieren nicht möglich.', copied ? 'success' : 'error');
                    },
                  },
                }),
              ]),
            ]),
            snippet.note ? el('p', { class: 'help', text: snippet.note }) : null,
            el('pre', { class: 'snippet-preview', text }),
          ]);
        }))
        : el('p', { class: 'hint', text: 'Kein Baustein gefunden.' }),
    ]);
  }

  function renderAll() {
    renderTargets();
    renderList();
  }

  function open() {
    renderAll();
    dialog.showModal();
  }

  return { open, refresh: renderAll, setFilter: (value) => { filterText = value; renderList(); } };
}
