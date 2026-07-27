/**
 * Tests fuer das ausgelieferte Browser-Bundle.
 *
 * Diese Tests sichern die Doppelklick-Tauglichkeit ab: Sie schlagen fehl,
 * sobald index.html wieder ein ES-Modul laedt, das Bundle fehlt oder nicht
 * mehr dem Stand von src/ entspricht.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import { AUSGABE, EINSTIEG, bundleErzeugen, codeMaske, moduleAnalysieren } from '../tools/bundler.mjs';

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lies = (relativ) => readFileSync(path.join(wurzel, relativ), 'utf8');

const bundle = lies(AUSGABE);
const indexHtml = lies('index.html');

/* ------------------------------------------------------------------ */
/* Auslieferung                                                        */
/* ------------------------------------------------------------------ */

test('das Bundle ist vorhanden und nicht leer', () => {
  assert.ok(bundle.length > 1000, 'Bundle wirkt unvollständig');
});

test('index.html lädt kein ES-Modul mehr', () => {
  assert.doesNotMatch(indexHtml, /type\s*=\s*["']module["']/,
    'Ein Modul-Skript wird über file:// blockiert (Origin "null").');
  assert.doesNotMatch(indexHtml, /<script[^>]*src=["']src\//,
    'index.html darf den Modul-Einstiegspunkt nicht direkt laden.');
});

test('index.html bindet das Bundle als klassisches Skript ein', () => {
  const treffer = /<script([^>]*)src=["']([^"']+)["']([^>]*)>/.exec(indexHtml);
  assert.ok(treffer, 'kein Skript-Tag gefunden');
  assert.equal(treffer[2], AUSGABE);
  const attribute = treffer[1] + treffer[3];
  assert.doesNotMatch(attribute, /type\s*=/, 'kein type-Attribut, damit es ein klassisches Skript bleibt');
  assert.match(attribute, /\bdefer\b/, 'defer, damit das DOM beim Start vorhanden ist');
});

test('das Bundle lässt zur Laufzeit nichts nachladen', () => {
  for (const muster of [/\bfetch\s*\(/, /XMLHttpRequest/, /\bimport\s*\(/, /WebSocket/, /sendBeacon/]) {
    const gefunden = bundle.match(new RegExp(muster.source, 'g')) ?? [];
    // Treffer duerfen nur in Kommentaren stehen (der Datenschutzhinweis in main.js).
    const echte = gefunden.filter((_, index) => {
      const position = bundle.indexOf(gefunden[index]);
      return codeMaske(bundle)[position] === 1;
    });
    assert.deepEqual(echte, [], `Laufzeit-Nachladen über ${muster} gefunden`);
  }
});

test('das Bundle enthält keine dynamische Codeausführung', () => {
  const maske = codeMaske(bundle);
  for (const muster of [/\beval\s*\(/g, /new\s+Function\s*\(/g]) {
    let treffer;
    while ((treffer = muster.exec(bundle)) !== null) {
      assert.equal(maske[treffer.index], 0,
        `"${treffer[0]}" steht als Code im Bundle – erlaubt ist es nur in Kommentaren.`);
    }
  }
});

/* ------------------------------------------------------------------ */
/* Gültigkeit als klassisches Skript                                   */
/* ------------------------------------------------------------------ */

test('das Bundle enthält keine unaufgelösten import- oder export-Anweisungen', () => {
  const maske = codeMaske(bundle);
  const muster = /^[ \t]*(import|export)\b/gm;
  let treffer;
  while ((treffer = muster.exec(bundle)) !== null) {
    const position = treffer.index + treffer[0].indexOf(treffer[1]);
    assert.equal(maske[position], 0,
      `Unaufgelöste "${treffer[1]}"-Anweisung an Position ${position}.`);
  }
});

test('das Bundle lässt sich als klassisches Skript übersetzen', () => {
  // vm.Script übersetzt, ohne auszuführen. Bei einem Modul-Konstrukt oder
  // einem Syntaxfehler wirft der Aufruf.
  assert.doesNotThrow(() => new vm.Script(bundle, { filename: AUSGABE }));
});

/* ------------------------------------------------------------------ */
/* Übereinstimmung mit den Quellen                                     */
/* ------------------------------------------------------------------ */

test('das Bundle entspricht dem aktuellen Stand von src/', () => {
  const frisch = bundleErzeugen(wurzel, EINSTIEG);
  assert.equal(bundle, frisch,
    'dist/app.bundle.js ist veraltet. Bitte "npm run build" ausführen und das Ergebnis mitcommitten.');
});

test('alle Module des Einstiegsgraphen sind im Bundle enthalten', () => {
  const enthalten = [...bundle.matchAll(/__definitionen\["([^"]+)"\]/g)].map((t) => t[1]);
  assert.ok(enthalten.includes(EINSTIEG), 'Einstiegspunkt fehlt');
  assert.ok(enthalten.length >= 25, `nur ${enthalten.length} Module gebündelt`);
  for (const id of enthalten) {
    assert.doesNotThrow(() => lies(id), `Modul ${id} existiert nicht mehr unter src/`);
  }
});

test('die Exporte im Bundle stimmen mit den ESM-Quellen überein', async () => {
  const enthalten = [...bundle.matchAll(/__definitionen\["([^"]+)"\]/g)].map((t) => t[1]);
  let geprueft = 0;

  for (const id of enthalten) {
    let namensraum;
    try {
      namensraum = await import(path.join(wurzel, id));
    } catch (fehler) {
      // main.js greift beim Laden auf Browser-Globale zu und lässt sich hier
      // nicht auswerten; diesen Fall deckt der Browser-Smoke-Test ab.
      if (/\b(document|window|localStorage|navigator)\b is not defined/.test(String(fehler))) continue;
      throw fehler;
    }

    const analyse = moduleAnalysieren(lies(id), id);
    const ausBundle = [...analyse.exportNamen.keys()];
    if (analyse.hatDefault) ausBundle.push('default');

    assert.deepEqual(ausBundle.sort(), Object.keys(namensraum).sort(),
      `Exportnamen weichen ab in ${id}`);
    geprueft += 1;
  }

  assert.ok(geprueft >= 25, `nur ${geprueft} Module verglichen`);
});

/* ------------------------------------------------------------------ */
/* Der Bundler selbst                                                  */
/* ------------------------------------------------------------------ */

test('der Scanner unterscheidet Code von Zeichenketten, Kommentaren und Regex', () => {
  const quelle = [
    'const a = 1;',            // Code
    '// export const b = 2;',  // Kommentar
    '/* import x from "y"; */',
    'const r = /„\\s*"/g;',    // Regex mit Anführungszeichen
    'const t = `',
    'export const c = 3;',     // im Template-Literal
    '`;',
    'export const d = 4;',     // Code
  ].join('\n');

  const analyse = moduleAnalysieren(quelle, 'test.js');
  assert.deepEqual([...analyse.exportNamen.keys()], ['d'],
    'nur die echte export-Anweisung darf erkannt werden');
});

test('der Bundler übernimmt Vorlagentexte unverändert', () => {
  // Stichproben aus beiden Quelldokumenten – der Build darf medizinische
  // Inhalte unter keinen Umständen verändern.
  const belege = [
    'wurde mit akutem Koronarsyndrom auf unsere Chest-Pain-Unit aufgenommen',
    'Statintherapie mit Ziel-LDL <55mg/dl',
    'Ziel LDL-Cholesterin < 70 mg/dl',
    'Ablation des Cavotriksupidalen Isthmus',
    'Tel. Chefarztsekreteriat 08031/365 3101',
    'Tel. Chefarztsekretariat 08031/365 3101',
    'nierdemolekulares Heparin',
    'Mit Bedauern müssen wir Ihnen vom Tode',
  ];
  for (const beleg of belege) {
    assert.ok(bundle.includes(beleg), `fehlt im Bundle: ${beleg}`);
  }
});

test('zirkuläre Importe würden den Build stoppen', () => {
  // Absicherung der Schutzfunktion: ein Zyklus darf nicht still ein kaputtes
  // Bundle erzeugen.
  assert.throws(() => bundleErzeugen(wurzel, 'tests/fixtures/zyklus-a.js'), /Zirkulärer Import|nicht gefunden/);
});
