/**
 * Build-Skript: erzeugt aus den Modulen unter src/ das ausgelieferte
 * Browser-Bundle unter dist/app.bundle.js.
 *
 *   node tools/build.mjs            Bundle schreiben
 *   node tools/build.mjs --check    nur pruefen, ob das Bundle aktuell ist
 *
 * Ohne Abhaengigkeiten und ohne Netzwerkzugriff.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AUSGABE, EINSTIEG, bundleErzeugen } from './bundler.mjs';

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const zielDatei = path.join(wurzel, AUSGABE);
const nurPruefen = process.argv.includes('--check');

const bundle = bundleErzeugen(wurzel, EINSTIEG);

if (nurPruefen) {
  let vorhanden;
  try {
    vorhanden = readFileSync(zielDatei, 'utf8');
  } catch {
    console.error(`FEHLER: ${AUSGABE} fehlt. Bitte "npm run build" ausführen und mitcommitten.`);
    process.exit(1);
  }
  if (vorhanden !== bundle) {
    console.error(`FEHLER: ${AUSGABE} ist nicht auf dem Stand von src/. Bitte "npm run build" ausführen und mitcommitten.`);
    process.exit(1);
  }
  console.log(`${AUSGABE} ist aktuell (${bundle.length} Zeichen).`);
  process.exit(0);
}

mkdirSync(path.dirname(zielDatei), { recursive: true });
writeFileSync(zielDatei, bundle, 'utf8');

const zeilen = bundle.split('\n').length;
console.log(`${AUSGABE} geschrieben: ${zeilen} Zeilen, ${bundle.length} Zeichen.`);
