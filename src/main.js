/**
 * Einstiegspunkt: verdrahtet Zustand und Oberflaeche.
 *
 * Die Anwendung laeuft vollstaendig lokal. Es gibt in diesem Projekt keinen
 * einzigen `fetch`, kein `XMLHttpRequest`, keinen `WebSocket`, keine externe
 * Ressource und keinen Schreibzugriff auf die URL.
 */

import { createStore } from './core/store.js';
import { BUILTIN_TEMPLATES } from './data/templates/index.js';
import { SHARED_FIELD_GROUPS } from './data/fields.js';
import { $, el, replaceChildren } from './ui/dom.js';
import { createFormView } from './ui/formView.js';
import { createPreviewView } from './ui/previewView.js';
import { createEditorView } from './ui/editorView.js';
import { createSnippetView } from './ui/snippetView.js';

/* ------------------------------------------------------------------ */
/* Startdiagnose                                                       */
/* ------------------------------------------------------------------ */

/**
 * Zeigt einen Startfehler im statischen Hinweisfeld an.
 *
 * Es wird ausschliesslich die technische Fehlermeldung ausgegeben. Der
 * Anwendungszustand und damit jede Patienteneingabe bleibt aussen vor.
 */
function startfehlerAnzeigen(fehler) {
  try {
    const hinweis = document.getElementById('start-hinweis');
    const titel = document.getElementById('start-hinweis-titel');
    const text = document.getElementById('start-hinweis-text');
    if (!hinweis || !titel || !text) return;

    hinweis.hidden = false;
    hinweis.classList.add('is-error');
    titel.textContent = 'Die Anwendung konnte nicht gestartet werden.';
    text.classList.remove('startup-hint');
    text.textContent = 'Technische Meldung: '
      + (fehler && fehler.message ? fehler.message : String(fehler))
      + ' – Weitere Einzelheiten stehen in der Browserkonsole (Taste F12). '
      + 'Bitte prüfen Sie, ob das heruntergeladene Archiv vollständig entpackt wurde.';
  } catch {
    // Wenn selbst das scheitert, bleibt der statische Hinweis stehen.
  }
}

// Fehler, die erst nach dem Start auftreten, sollen nicht still verpuffen.
// Protokolliert wird nur die technische Meldung, niemals Formulardaten.
window.addEventListener('error', (ereignis) => {
  console.error('Arztbriefgenerator: unerwarteter Fehler –', ereignis.message);
});
window.addEventListener('unhandledrejection', (ereignis) => {
  console.error('Arztbriefgenerator: unbehandelte Zurückweisung –', ereignis.reason?.message ?? ereignis.reason);
});

/**
 * Baut die Anwendung auf. Laeuft vollstaendig in einem try/catch, damit ein
 * Fehler beim Start sichtbar wird, statt eine funktionslose Oberflaeche zu
 * hinterlassen.
 */
function anwendungStarten() {
  const store = createStore({ builtinTemplates: BUILTIN_TEMPLATES, sharedGroups: SHARED_FIELD_GROUPS });

  /* ------------------------------------------------------------------ */
  /* Statusmeldungen                                                     */
  /* ------------------------------------------------------------------ */

  const statusBar = $('#statusleiste');
  let statusTimer = null;

  function showStatus(message, tone = 'info') {
    if (statusTimer) clearTimeout(statusTimer);
    statusBar.className = `statusbar statusbar-${tone}`;
    statusBar.textContent = message;
    statusBar.hidden = false;
    if (tone !== 'error') {
      statusTimer = setTimeout(() => { statusBar.hidden = true; }, 6000);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Ansichten                                                           */
  /* ------------------------------------------------------------------ */

  const preview = createPreviewView({
    container: $('#ausgabe'),
    statusContainer: $('#ausgabe-status'),
    store,
    onStatus: showStatus,
  });

  const form = createFormView({
    container: $('#eingabemaske'),
    store,
    onChange: () => { if (store.settings.autoPreview) preview.build(); },
  });

  const editor = createEditorView({
    listContainer: $('#vorlagenliste'),
    formContainer: $('#vorlageneditor'),
    store,
    onStatus: showStatus,
    onTemplatesChanged: () => {
      renderTemplateSelect();
      form.render();
      preview.build();
    },
  });

  const snippets = createSnippetView({
    dialog: $('#bausteine-dialog'),
    container: $('#bausteine-liste'),
    targetSelect: $('#bausteine-ziel'),
    store,
    preview,
    onStatus: showStatus,
  });

  /* ------------------------------------------------------------------ */
  /* Vorlagenauswahl                                                     */
  /* ------------------------------------------------------------------ */

  const templateSelect = $('#vorlage');
  const templateInfo = $('#vorlage-info');

  function renderTemplateSelect() {
    const templates = store.listTemplates();
    const active = store.getActiveTemplate();
    const byGroup = new Map();
    for (const template of templates) {
      if (!byGroup.has(template.group)) byGroup.set(template.group, []);
      byGroup.get(template.group).push(template);
    }

    replaceChildren(templateSelect, [...byGroup.entries()].map(([group, entries]) => el(
      'optgroup',
      { attrs: { label: group } },
      entries.map((template) => el('option', {
        value: template.id,
        text: template.title,
        selected: active && template.id === active.id,
      })),
    )));

    replaceChildren(templateInfo, active
      ? [
        active.description ? el('p', { text: active.description }) : null,
        active.source ? el('p', { class: 'source-note', text: `Quelle: ${active.source}` }) : null,
      ]
      : []);
  }

  templateSelect.addEventListener('change', (event) => {
    if (store.hasManualEdits()) {
      const proceed = confirm('In der Vorschau gibt es von Hand bearbeitete Abschnitte. Beim Wechsel der Vorlage gehen diese Änderungen verloren. Fortfahren?');
      if (!proceed) {
        renderTemplateSelect();
        return;
      }
    }
    store.setActiveTemplate(event.target.value);
  });

  /* ------------------------------------------------------------------ */
  /* Kopfleiste und Aktionen                                             */
  /* ------------------------------------------------------------------ */

  const views = {
    generator: $('#ansicht-generator'),
    editor: $('#ansicht-editor'),
  };
  const tabs = {
    generator: $('#tab-generator'),
    editor: $('#tab-editor'),
  };

  function showView(name) {
    for (const [key, node] of Object.entries(views)) {
      node.hidden = key !== name;
      tabs[key].classList.toggle('is-active', key === name);
      tabs[key].setAttribute('aria-selected', String(key === name));
    }
    if (name === 'editor') editor.refresh();
  }

  tabs.generator.addEventListener('click', () => showView('generator'));
  tabs.editor.addEventListener('click', () => showView('editor'));

  $('#aktualisieren').addEventListener('click', () => {
    preview.build();
    showStatus('Vorschau aktualisiert.', 'success');
  });

  $('#alles-kopieren').addEventListener('click', () => preview.copyAll());

  $('#bausteine-oeffnen').addEventListener('click', () => snippets.open());
  $('#bausteine-schliessen').addEventListener('click', () => $('#bausteine-dialog').close());
  $('#bausteine-suche').addEventListener('input', (event) => snippets.setFilter(event.target.value));

  $('#eingaben-zuruecksetzen').addEventListener('click', () => {
    if (!confirm('Alle Eingaben dieser Sitzung löschen? Vorlagen bleiben erhalten.')) return;
    store.resetValues();
    showStatus('Eingaben gelöscht.', 'success');
  });

  /* Einstellungen */
  const autoPreviewToggle = $('#einstellung-livevorschau');
  const persistToggle = $('#einstellung-eingaben-merken');
  const titlesToggle = $('#einstellung-ueberschriften');

  autoPreviewToggle.checked = store.settings.autoPreview;
  persistToggle.checked = store.settings.persistValues;
  titlesToggle.checked = store.settings.sectionTitlesInOutput;

  autoPreviewToggle.addEventListener('change', (event) => {
    store.updateSettings({ autoPreview: event.target.checked });
    $('#aktualisieren').hidden = event.target.checked;
    if (event.target.checked) preview.build();
  });

  persistToggle.addEventListener('change', (event) => {
    if (event.target.checked) {
      const proceed = confirm(
        'Eingaben lokal zwischenspeichern?\n\n'
        + 'Dabei werden die eingegebenen Patientendaten im Speicher dieses Browsers abgelegt und bleiben nach dem Schließen erhalten. '
        + 'Sie verlassen das Gerät nicht. Auf gemeinsam genutzten Rechnern wird davon abgeraten.',
      );
      if (!proceed) {
        event.target.checked = false;
        return;
      }
    }
    store.updateSettings({ persistValues: event.target.checked });
    showStatus(event.target.checked ? 'Eingaben werden lokal zwischengespeichert.' : 'Eingaben werden nicht mehr gespeichert.', 'info');
  });

  titlesToggle.addEventListener('change', (event) => {
    store.updateSettings({ sectionTitlesInOutput: event.target.checked });
  });

  $('#alles-loeschen').addEventListener('click', () => {
    if (!confirm('Sämtliche lokal gespeicherten Daten löschen – eigene Vorlagen, Einstellungen und zwischengespeicherte Eingaben?')) return;
    store.clearAll();
    showStatus('Alle lokal gespeicherten Daten wurden gelöscht.', 'success');
  });

  /* ------------------------------------------------------------------ */
  /* Zustandsabonnement                                                  */
  /* ------------------------------------------------------------------ */

  store.subscribe((reason) => {
    if (reason === 'template' || reason === 'templates' || reason === 'reset') {
      renderTemplateSelect();
      form.render();
    }
    if (reason === 'values' && !store.settings.autoPreview) return;
    preview.build();

    if (store.saveError) showStatus(store.saveError, 'error');
  });

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */

  renderTemplateSelect();
  form.render();
  preview.build();
  showView('generator');
  $('#aktualisieren').hidden = store.settings.autoPreview;

  for (const notice of store.consumeNotices()) showStatus(notice, 'info');
  if (store.saveError) showStatus(store.saveError, 'error');

  // Start geglueckt: Hinweisfeld ausblenden.
  const startHinweis = document.getElementById('start-hinweis');
  if (startHinweis) startHinweis.hidden = true;
  window.__arztbriefBereit = true;
}

try {
  anwendungStarten();
} catch (fehler) {
  console.error('Arztbriefgenerator: Start fehlgeschlagen –', fehler);
  startfehlerAnzeigen(fehler);
}
