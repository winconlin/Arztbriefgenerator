/**
 * Browser-Smoke-Test der ausgelieferten Anwendung.
 *
 *   node tools/smoke.mjs                   testet über file:// (Standard)
 *   node tools/smoke.mjs --http            testet zusätzlich über http://localhost
 *   node tools/smoke.mjs --browser=firefox testet mit Firefox statt Chromium
 *
 * Der file://-Lauf bildet den tatsaechlichen Nutzungsvorgang ab: entpackter
 * Ordner, Doppelklick auf index.html, kein Server, keine Sonderflags des
 * Browsers und keine abgeschalteten Sicherheitsmechanismen.
 *
 * Playwright ist eine reine Entwicklungsabhaengigkeit und wird fuer den
 * Betrieb der Anwendung nicht gebraucht. Fehlt es, endet dieses Skript mit
 * einem Hinweis statt mit einem Fehler.
 */

import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let playwright;
try {
  playwright = await import('playwright');
} catch {
  console.log('Playwright ist nicht installiert – der Browser-Smoke-Test wird übersprungen.');
  console.log('Zum Ausführen: npm install --no-save playwright && npx playwright install chromium');
  process.exit(0);
}

const argumente = process.argv.slice(2);
const browserName = (argumente.find((a) => a.startsWith('--browser=')) ?? '--browser=chromium').split('=')[1];
const auchHttp = argumente.includes('--http');

/* ------------------------------------------------------------------ */
/* Testdaten                                                           */
/* ------------------------------------------------------------------ */

const arbeitsordner = mkdtempSync(path.join(tmpdir(), 'arztbrief-smoke-'));
const gueltigeDatei = path.join(arbeitsordner, 'import-gueltig.json');
const defekteDatei = path.join(arbeitsordner, 'import-defekt.json');

writeFileSync(gueltigeDatei, JSON.stringify({
  format: 'arztbriefgenerator-vorlagen',
  schemaVersion: 3,
  templates: [{
    id: 'import_test',
    title: 'Importierte Testvorlage',
    group: 'Eigene Vorlagen',
    sharedGroups: ['stammdaten'],
    sections: [{ id: 'a', title: 'Abschnitt', order: 1, template: 'Test {{nachname}}' }],
  }],
}, null, 2));
writeFileSync(defekteDatei, '{ das ist kein gueltiges JSON');

/* ------------------------------------------------------------------ */
/* Testlauf                                                            */
/* ------------------------------------------------------------------ */

async function testlauf(basis, bezeichnung) {
  // ARZTBRIEF_BROWSER_PATH erlaubt einen bereits vorhandenen Browser, wenn
  // Playwright seine eigenen Binärdateien nicht herunterladen kann.
  const browser = await playwright[browserName].launch(
    process.env.ARZTBRIEF_BROWSER_PATH ? { executablePath: process.env.ARZTBRIEF_BROWSER_PATH } : {},
  );
  const seite = await (await browser.newContext({ viewport: { width: 1500, height: 1050 }, acceptDownloads: true })).newPage();

  const konsolenfehler = [];
  const seitenfehler = [];
  const fremdeAnfragen = [];
  const ordnerBasis = basis.replace(/index\.html$/, '');
  seite.on('console', (m) => { if (m.type() === 'error') konsolenfehler.push(m.text()); });
  seite.on('pageerror', (e) => seitenfehler.push(String(e)));
  seite.on('request', (r) => { if (!r.url().startsWith(ordnerBasis)) fremdeAnfragen.push(r.url()); });

  const ergebnisse = [];
  const pruefe = (name, ok, zusatz = '') => ergebnisse.push({ name, ok, zusatz });

  await seite.goto(basis);
  await seite.waitForTimeout(1200);

  /* Start */
  pruefe('Initialisierung abgeschlossen', await seite.evaluate(() => window.__arztbriefBereit === true));
  pruefe('Starthinweis ausgeblendet', await seite.evaluate(() => document.getElementById('start-hinweis').hidden === true));
  const anzahlVorlagen = await seite.$$eval('#vorlage option', (o) => o.length);
  pruefe('Vorlagen-Dropdown gefüllt', anzahlVorlagen === 23, `${anzahlVorlagen} Vorlagen`);
  pruefe('Eingabemaske gerendert', (await seite.$$eval('#eingabemaske .field', (n) => n.length)) > 0);
  pruefe('Briefvorschau erzeugt', (await seite.$eval('#ausgabe textarea', (t) => t.value.length)) > 0);
  pruefe('Stylesheet trotz CSP geladen', await seite.evaluate(
    () => getComputedStyle(document.querySelector('.topbar')).backgroundColor === 'rgb(29, 78, 216)',
  ));

  /* Generator */
  await seite.selectOption('#vorlage', 'acs');
  await seite.waitForTimeout(300);
  const vorEingabe = await seite.inputValue('#abschnitt-epikrise');
  await seite.fill('#feld-nachname', 'Testpatient');
  await seite.waitForTimeout(300);
  const nachEingabe = await seite.inputValue('#abschnitt-epikrise');
  pruefe('Feldänderung ändert den generierten Text', vorEingabe !== nachEingabe && nachEingabe.includes('Testpatient'));

  await seite.selectOption('#vorlage', 'pvi');
  await seite.waitForTimeout(300);
  pruefe('Vorlagenwechsel', (await seite.inputValue('#abschnitt-epikrise')).includes('Pulmonalvenen'));
  pruefe('Stammdaten bleiben beim Wechsel erhalten', (await seite.inputValue('#feld-nachname')) === 'Testpatient');
  await seite.selectOption('#vorlage', 'acs');
  await seite.waitForTimeout(300);
  pruefe('Pflichtfeldmeldung erscheint', (await seite.textContent('#ausgabe-status')).includes('Pflichtfeld'));

  await seite.selectOption('#feld-acs_typ', 'STEMI');
  await seite.waitForTimeout(300);
  const ckSichtbar = await seite.isVisible('#feld-ck_max');
  await seite.selectOption('#feld-acs_typ', 'NSTEMI');
  await seite.waitForTimeout(300);
  const ckVerborgen = await seite.isVisible('#feld-ck_max');
  pruefe('Konditionale Felder blenden sich ein und aus', ckSichtbar === true && ckVerborgen === false);

  const listeVorher = await seite.$$eval('.list-entry', (n) => n.length);
  await seite.click('text=+ Vorbehandlung hinzufügen');
  await seite.waitForTimeout(300);
  const listeNachHinzu = await seite.$$eval('.list-entry', (n) => n.length);
  await seite.click('.list-entry button.danger');
  await seite.waitForTimeout(300);
  const listeNachEntfernen = await seite.$$eval('.list-entry', (n) => n.length);
  pruefe('Wiederholgruppe ergänzen und entfernen',
    listeNachHinzu === listeVorher + 1 && listeNachEntfernen === listeVorher);

  await seite.click('#abschnitt-procedere');
  await seite.keyboard.press('End');
  await seite.keyboard.type('\n- Handnotiz');
  await seite.waitForTimeout(300);
  const manuellMarkiert = await seite.isVisible('.badge-manual');
  await seite.selectOption('#feld-p2y12', 'Clopidogrel');
  await seite.waitForTimeout(300);
  pruefe('Manuelle Änderung bleibt geschützt',
    manuellMarkiert && (await seite.inputValue('#abschnitt-procedere')).includes('- Handnotiz'));

  await seite.click('#eingaben-zuruecksetzen').catch(() => {});
  await seite.evaluate(() => { window.confirm = () => true; });
  await seite.click('#eingaben-zuruecksetzen');
  await seite.waitForTimeout(400);
  pruefe('"Eingaben zurücksetzen" funktioniert', (await seite.inputValue('#feld-nachname')) === '');

  await seite.evaluate(() => { document.getElementById('einstellung-livevorschau').click(); });
  await seite.waitForTimeout(300);
  const aktualisierenSichtbar = await seite.isVisible('#aktualisieren');
  await seite.fill('#feld-nachname', 'Zweitname');
  await seite.waitForTimeout(300);
  const vorKlick = await seite.inputValue('#abschnitt-epikrise');
  await seite.click('#aktualisieren');
  await seite.waitForTimeout(300);
  const nachKlick = await seite.inputValue('#abschnitt-epikrise');
  pruefe('"Text aktualisieren" erzeugt den Text neu',
    aktualisierenSichtbar && vorKlick !== nachKlick && nachKlick.includes('Zweitname'));
  await seite.evaluate(() => { document.getElementById('einstellung-livevorschau').click(); });

  /* Ansichten */
  await seite.click('#tab-editor');
  await seite.waitForTimeout(400);
  const editorSichtbar = (await seite.isVisible('#ansicht-editor')) && !(await seite.isVisible('#ansicht-generator'));
  await seite.click('#tab-generator');
  await seite.waitForTimeout(400);
  const generatorSichtbar = (await seite.isVisible('#ansicht-generator')) && !(await seite.isVisible('#ansicht-editor'));
  pruefe('Ansichtswechsel, jeweils nur eine Ansicht sichtbar', editorSichtbar && generatorSichtbar);

  /* Textbausteine */
  await seite.click('#bausteine-oeffnen');
  await seite.waitForTimeout(400);
  const dialogOffen = await seite.isVisible('#bausteine-dialog');
  await seite.fill('#bausteine-suche', 'Langzeit');
  await seite.waitForTimeout(300);
  const treffer = await seite.$$eval('.snippet', (n) => n.length);
  const zielAnzahl = await seite.$$eval('#bausteine-ziel option', (o) => o.length);
  await seite.selectOption('#bausteine-ziel', { index: 1 });
  await seite.click('.snippet button');
  await seite.waitForTimeout(400);
  const eingefuegt = await seite.evaluate(
    () => [...document.querySelectorAll('#ausgabe textarea')].some((t) => t.value.includes('Langzeit')),
  );
  pruefe('Bausteine: öffnen, suchen, Ziel wählen, einfügen',
    dialogOffen && treffer > 0 && zielAnzahl > 0 && eingefuegt, `${treffer} Treffer, ${zielAnzahl} Ziele`);
  pruefe('Bausteindialog schließt', !(await seite.isVisible('#bausteine-dialog')));

  /* Zwischenablage */
  const abschnittMeldung = await seite.evaluate(async () => {
    document.querySelector('.output-section button').click();
    await new Promise((r) => setTimeout(r, 600));
    const leiste = document.getElementById('statusleiste');
    return leiste.hidden ? '' : leiste.textContent;
  });
  pruefe('Abschnitt kopieren meldet ein Ergebnis', abschnittMeldung.length > 0, abschnittMeldung);
  const gesamtMeldung = await seite.evaluate(async () => {
    document.getElementById('alles-kopieren').click();
    await new Promise((r) => setTimeout(r, 600));
    return document.getElementById('statusleiste').textContent;
  });
  pruefe('Gesamten Brief kopieren meldet ein Ergebnis', gesamtMeldung.length > 0, gesamtMeldung);

  /* Editor */
  await seite.click('#tab-editor');
  await seite.waitForTimeout(400);
  await seite.click('.template-list-button');
  await seite.waitForTimeout(400);
  pruefe('Vorlage im Editor auswählbar', (await seite.textContent('.editor-validation')).includes('gültig'));
  await seite.click('text=Duplizieren');
  await seite.waitForTimeout(400);
  const kopieId = await seite.inputValue('.editor-block input');
  pruefe('Duplizieren erzeugt eine neue ID', kopieId.includes('_kopie'), kopieId);
  await seite.click('.editor-toolbar button');
  await seite.waitForTimeout(600);
  pruefe('Gültige Vorlage speicherbar', (await seite.$$eval('#vorlage option', (o) => o.length)) === 24);
  await seite.click('text=+ Neue Vorlage');
  await seite.waitForTimeout(400);
  pruefe('Validierungsfehler blockiert das Speichern',
    (await seite.getAttribute('.editor-toolbar button', 'disabled')) !== null);

  const download = await Promise.all([
    seite.waitForEvent('download', { timeout: 8000 }).catch(() => null),
    seite.click('text=Alle exportieren'),
  ]).then(([d]) => d);
  pruefe('Export erzeugt einen lokalen Download', download !== null,
    download ? download.suggestedFilename() : 'kein Download');

  const vorImport = await seite.$$eval('#vorlage option', (o) => o.length);
  await seite.setInputFiles('.file-label input', gueltigeDatei);
  await seite.waitForTimeout(700);
  const nachImport = await seite.$$eval('#vorlage option', (o) => o.length);
  pruefe('Import einer gültigen JSON-Datei', nachImport === vorImport + 1, `${vorImport} -> ${nachImport}`);

  await seite.setInputFiles('.file-label input', defekteDatei);
  await seite.waitForTimeout(700);
  const meldungDefekt = await seite.textContent('#statusleiste');
  pruefe('Defekte JSON-Datei wird abgelehnt, ohne Vorlagen zu verlieren',
    meldungDefekt.includes('JSON') && (await seite.$$eval('#vorlage option', (o) => o.length)) === nachImport,
    meldungDefekt.slice(0, 50));

  await seite.click('.template-list-button');
  await seite.waitForTimeout(300);
  const vorLoeschen = await seite.$$eval('#vorlage option', (o) => o.length);
  await seite.click('.editor-toolbar button.danger');
  await seite.waitForTimeout(500);
  pruefe('Vorlage löschen bzw. ausblenden',
    (await seite.$$eval('#vorlage option', (o) => o.length)) === vorLoeschen - 1);
  const wiederherstellen = await seite.$('text=wiederherstellen');
  if (wiederherstellen) { await wiederherstellen.click(); await seite.waitForTimeout(500); }
  pruefe('Mitgelieferte Vorlage wiederherstellbar',
    (await seite.$$eval('#vorlage option', (o) => o.length)) === vorLoeschen);

  /* Speicherung */
  const vorNeuladen = await seite.$$eval('#vorlage option', (o) => o.length);
  await seite.reload();
  await seite.waitForTimeout(1200);
  pruefe('Eigene Vorlagen überleben das Neuladen',
    (await seite.$$eval('#vorlage option', (o) => o.length)) === vorNeuladen && vorNeuladen > 23,
    `${vorNeuladen}`);
  const gespeicherteWerte = await seite.evaluate(() => {
    const roh = localStorage.getItem('arztbrief_daten_v3');
    return roh ? Object.keys(JSON.parse(roh).values || {}).length : -1;
  });
  pruefe('Patienteneingaben werden ohne Opt-in nicht gespeichert', gespeicherteWerte === 0, `${gespeicherteWerte} Werte`);

  await seite.evaluate(() => {
    window.confirm = () => true;
    document.getElementById('alles-loeschen').click();
  });
  await seite.waitForTimeout(500);
  pruefe('"Alle lokal gespeicherten Daten löschen" leert den Speicher',
    (await seite.evaluate(() => localStorage.getItem('arztbrief_daten_v3'))) === null);
  pruefe('Danach wieder ausschließlich mitgelieferte Vorlagen',
    (await seite.$$eval('#vorlage option', (o) => o.length)) === 23);

  /* Content-Security-Policy: wird sie überhaupt durchgesetzt? */
  const inlineBlockiert = await seite.evaluate(() => new Promise((fertig) => {
    window.__cspInlineLief = false;
    const skript = document.createElement('script');
    skript.textContent = 'window.__cspInlineLief = true;';
    document.body.appendChild(skript);
    setTimeout(() => fertig(window.__cspInlineLief === false), 200);
  }));
  pruefe('CSP blockiert Inline-Skripte', inlineBlockiert);

  const netzwerkBlockiert = await seite.evaluate(async () => {
    try {
      await fetch('https://example.invalid/test');
      return false;
    } catch {
      return true;
    }
  });
  pruefe("CSP blockiert Netzwerkzugriffe (connect-src 'none')", netzwerkBlockiert);

  /* Fehlerfreiheit */
  // CSP-Verstöße der beiden Prüfungen oben sind erwünscht und zählen nicht.
  const relevanteKonsolenfehler = konsolenfehler.filter(
    (t) => !t.includes('favicon') && !/Content Security Policy|Refused to/i.test(t),
  );
  pruefe('Keine pageerror-Ereignisse', seitenfehler.length === 0, seitenfehler.join(' | '));
  pruefe('Keine Konsolenfehler', relevanteKonsolenfehler.length === 0, relevanteKonsolenfehler.join(' | '));
  pruefe('Keine Anfragen außerhalb des Anwendungsordners', fremdeAnfragen.length === 0, fremdeAnfragen.join(' | '));

  await browser.close();

  console.log(`\n##### ${bezeichnung} (${browserName}) #####`);
  let fehler = 0;
  for (const eintrag of ergebnisse) {
    if (!eintrag.ok) fehler += 1;
    console.log(`  ${eintrag.ok ? 'OK  ' : 'FEHL'}  ${eintrag.name}${eintrag.zusatz ? `  [${eintrag.zusatz}]` : ''}`);
  }
  console.log(`  => ${ergebnisse.length - fehler} von ${ergebnisse.length} bestanden`);
  return fehler;
}

/* ------------------------------------------------------------------ */

let fehlerGesamt = 0;

// 1. Der eigentliche Nutzungsvorgang: entpackter Ordner, Doppelklick.
fehlerGesamt += await testlauf(pathToFileURL(path.join(wurzel, 'index.html')).href, 'Direkt geöffnet (file://)');

// 2. Zusätzlich der Serverbetrieb, damit beide Startarten abgesichert sind.
if (auchHttp) {
  const typen = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
  const server = createServer((anfrage, antwort) => {
    const relativ = decodeURIComponent(anfrage.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const ziel = path.join(wurzel, relativ);
    if (!ziel.startsWith(wurzel)) { antwort.writeHead(403).end(); return; }
    try {
      antwort.writeHead(200, { 'Content-Type': typen[path.extname(ziel)] ?? 'application/octet-stream' });
      antwort.end(readFileSync(ziel));
    } catch {
      antwort.writeHead(404).end();
    }
  });
  await new Promise((fertig) => server.listen(0, '127.0.0.1', fertig));
  const port = server.address().port;
  fehlerGesamt += await testlauf(`http://127.0.0.1:${port}/index.html`, 'Über lokalen Server (http)');
  server.close();
}

process.exit(fehlerGesamt === 0 ? 0 : 1);
