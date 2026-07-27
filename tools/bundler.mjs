/**
 * Minimaler ES-Modul-Bundler – ohne jede Abhaengigkeit.
 *
 * Warum ein eigener Bundler statt esbuild oder rollup?
 * Die Anwendung soll ohne Installation nutzbar sein und ohne Netzwerkzugriff
 * gebaut werden koennen. Ein Werkzeug mit eigenem Binary-Download waere eine
 * zusaetzliche Huerde und liesse sich hier nicht pruefen. Der Modulgraph
 * dieses Projekts ist bewusst einfach gehalten (nur relative Importe, keine
 * Namespace-Importe, keine Re-Exporte, keine dynamischen Importe), sodass
 * ein nachvollziehbarer Bundler von rund 300 Zeilen genuegt.
 *
 * Das Ergebnis ist ein klassisches Skript (kein `type="module"`), das der
 * Browser auch ueber `file://` laedt.
 *
 * Der Bundler veraendert ausschliesslich Import- und Export-Anweisungen.
 * Jeder andere Zeichen des Quelltextes – insbesondere die medizinischen
 * Vorlagentexte – wird unveraendert uebernommen.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

/* ------------------------------------------------------------------ */
/* Scanner: welche Zeichen sind echter Code?                           */
/* ------------------------------------------------------------------ */

/**
 * Erzeugt eine Maske, die fuer jede Position angibt, ob sie zu Code gehoert
 * (true) oder zu einer Zeichenkette, einem Template-Literal, einem Kommentar
 * oder einem regulaeren Ausdruck (false).
 *
 * Diese Unterscheidung ist notwendig, weil im Quelltext sowohl regulaere
 * Ausdruecke mit Anfuehrungszeichen vorkommen (z. B. /„\s*"/g in cleanup.js)
 * als auch mehrzeilige Template-Literale mit medizinischem Text. Eine reine
 * Zeilen- oder Regex-Erkennung wuerde daran scheitern.
 */
export function codeMaske(quelle) {
  const maske = new Uint8Array(quelle.length); // 1 = Code
  const laenge = quelle.length;
  let i = 0;
  /** Letztes bedeutsames Codezeichen – unterscheidet Division von Regex. */
  let letztes = '';

  const istWertEnde = (zeichen) => /[A-Za-z0-9_$)\]]/.test(zeichen);

  function zeichenketteUeberspringen(anfuehrung) {
    i += 1;
    while (i < laenge) {
      if (quelle[i] === '\\') { i += 2; continue; }
      if (quelle[i] === anfuehrung) { i += 1; return; }
      if (quelle[i] === '\n') return; // unabgeschlossen – Abbruch statt Endlosschleife
      i += 1;
    }
  }

  function regexUeberspringen() {
    i += 1;
    let inZeichenklasse = false;
    while (i < laenge) {
      if (quelle[i] === '\\') { i += 2; continue; }
      if (quelle[i] === '[') inZeichenklasse = true;
      else if (quelle[i] === ']') inZeichenklasse = false;
      else if (quelle[i] === '/' && !inZeichenklasse) { i += 1; break; }
      else if (quelle[i] === '\n') return; // war doch eine Division
      i += 1;
    }
    while (i < laenge && /[dgimsuvy]/.test(quelle[i])) i += 1; // Flags
  }

  function templateUeberspringen() {
    i += 1; // oeffnendes Backtick
    while (i < laenge) {
      if (quelle[i] === '\\') { i += 2; continue; }
      if (quelle[i] === '`') { i += 1; return; }
      if (quelle[i] === '$' && quelle[i + 1] === '{') {
        i += 2;
        codeLesen(1); // in ${ … } gilt wieder Code
        continue;
      }
      i += 1;
    }
  }

  /**
   * Liest Code und markiert ihn. Bei `tiefe > 0` wird beim passenden
   * schliessenden `}` zurueckgekehrt (Ende eines ${ … }-Ausdrucks).
   */
  function codeLesen(tiefe) {
    while (i < laenge) {
      const zeichen = quelle[i];
      const naechstes = quelle[i + 1];

      if (zeichen === '/' && naechstes === '/') {
        while (i < laenge && quelle[i] !== '\n') i += 1;
        continue;
      }
      if (zeichen === '/' && naechstes === '*') {
        i += 2;
        while (i < laenge && !(quelle[i] === '*' && quelle[i + 1] === '/')) i += 1;
        i += 2;
        continue;
      }
      if (zeichen === '"' || zeichen === "'") { zeichenketteUeberspringen(zeichen); letztes = 'x'; continue; }
      if (zeichen === '`') { templateUeberspringen(); letztes = 'x'; continue; }
      if (zeichen === '/' && !istWertEnde(letztes)) { regexUeberspringen(); letztes = 'x'; continue; }

      if (tiefe > 0) {
        if (zeichen === '{') tiefe += 1;
        else if (zeichen === '}') {
          tiefe -= 1;
          maske[i] = 1;
          i += 1;
          if (tiefe === 0) return;
          continue;
        }
      }

      maske[i] = 1;
      if (!/\s/.test(zeichen)) letztes = zeichen;
      i += 1;
    }
  }

  codeLesen(0);
  return maske;
}

/* ------------------------------------------------------------------ */
/* Modulanalyse                                                        */
/* ------------------------------------------------------------------ */

const IMPORT_MUSTER = /^import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?/;
const EXPORT_NAMED_MUSTER = /^export\s*\{([^}]*)\}\s*;?/;
const EXPORT_DEKLARATION_MUSTER = /^export\s+(async\s+function|function|const|let|var|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/;
const EXPORT_DEFAULT_MUSTER = /^export\s+default\s/;

/**
 * Zerlegt ein Modul in Importe, Exporte und den bereinigten Rumpf.
 */
export function moduleAnalysieren(quelle, dateiname) {
  const maske = codeMaske(quelle);
  const importe = [];
  const exportNamen = new Map(); // exportierterName -> lokalerName
  let hatDefault = false;

  // Ersetzungen sammeln und erst am Ende anwenden, damit die Positionen
  // waehrend der Analyse gueltig bleiben.
  const ersetzungen = [];

  for (let i = 0; i < quelle.length; i += 1) {
    // Nur Anweisungen am Zeilenanfang und in echtem Code betrachten.
    if (!maske[i]) continue;
    if (i !== 0 && quelle[i - 1] !== '\n') continue;
    if (!quelle.startsWith('import', i) && !quelle.startsWith('export', i)) continue;

    const rest = quelle.slice(i);

    const importTreffer = IMPORT_MUSTER.exec(rest);
    if (importTreffer && quelle.startsWith('import', i)) {
      const [gesamt, klausel, pfad] = importTreffer;
      if (!pfad.startsWith('.')) {
        throw new Error(`${dateiname}: nicht relativer Import "${pfad}" wird nicht unterstützt.`);
      }
      importe.push(pfad);
      ersetzungen.push({ von: i, bis: i + gesamt.length, text: importErsetzen(klausel, pfad, dateiname) });
      continue;
    }

    if (!quelle.startsWith('export', i)) continue;

    const benannt = EXPORT_NAMED_MUSTER.exec(rest);
    if (benannt) {
      for (const eintrag of benannt[1].split(',')) {
        const teil = eintrag.trim();
        if (!teil) continue;
        const alsTreffer = /^([A-Za-z_$][A-Za-z0-9_$]*)\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)$/.exec(teil);
        if (alsTreffer) exportNamen.set(alsTreffer[2], alsTreffer[1]);
        else exportNamen.set(teil, teil);
      }
      ersetzungen.push({ von: i, bis: i + benannt[0].length, text: '' });
      continue;
    }

    const deklaration = EXPORT_DEKLARATION_MUSTER.exec(rest);
    if (deklaration) {
      exportNamen.set(deklaration[2], deklaration[2]);
      // Nur das Schluesselwort "export " entfernen, Rest bleibt unangetastet.
      ersetzungen.push({ von: i, bis: i + 'export '.length, text: '' });
      continue;
    }

    if (EXPORT_DEFAULT_MUSTER.test(rest)) {
      hatDefault = true;
      const treffer = EXPORT_DEFAULT_MUSTER.exec(rest);
      ersetzungen.push({ von: i, bis: i + treffer[0].length, text: '__exports.default = ' });
      continue;
    }

    throw new Error(`${dateiname}: unbekannte export-Anweisung: ${rest.slice(0, 60)}…`);
  }

  let rumpf = quelle;
  for (const ersetzung of ersetzungen.sort((a, b) => b.von - a.von)) {
    rumpf = rumpf.slice(0, ersetzung.von) + ersetzung.text + rumpf.slice(ersetzung.bis);
  }

  return { importe, exportNamen, hatDefault, rumpf };
}

function importErsetzen(klausel, pfad, dateiname) {
  const bereinigt = klausel.trim();
  const modul = `__require(${JSON.stringify(pfad)})`;

  // import { a, b as c } from '…'
  if (bereinigt.startsWith('{')) {
    const inhalt = bereinigt.slice(1, bereinigt.lastIndexOf('}'));
    const teile = inhalt.split(',').map((s) => s.trim()).filter(Boolean).map((teil) => {
      const alsTreffer = /^([A-Za-z_$][A-Za-z0-9_$]*)\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)$/.exec(teil);
      return alsTreffer ? `${alsTreffer[1]}: ${alsTreffer[2]}` : teil;
    });
    return `const { ${teile.join(', ')} } = ${modul};`;
  }

  // import * as ns from '…'
  const namespaceTreffer = /^\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)$/.exec(bereinigt);
  if (namespaceTreffer) return `const ${namespaceTreffer[1]} = ${modul};`;

  // import name from '…'
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(bereinigt)) return `const ${bereinigt} = ${modul}.default;`;

  throw new Error(`${dateiname}: nicht unterstützte Import-Klausel "${klausel}".`);
}

/* ------------------------------------------------------------------ */
/* Bundle erzeugen                                                     */
/* ------------------------------------------------------------------ */

/**
 * @param {string} wurzel       Projektwurzel
 * @param {string} einstieg     Einstiegsmodul, relativ zur Wurzel
 * @returns {string}            fertiges klassisches Skript
 */
export function bundleErzeugen(wurzel, einstieg) {
  const module = new Map();
  const reihenfolge = [];
  const inArbeit = new Set();

  const idVon = (absolut) => path.relative(wurzel, absolut).split(path.sep).join('/');

  function einlesen(absolut, herkunft) {
    const id = idVon(absolut);
    if (module.has(id)) return id;

    if (inArbeit.has(id)) {
      throw new Error(`Zirkulärer Import entdeckt: ${[...inArbeit].join(' -> ')} -> ${id}`);
    }
    inArbeit.add(id);

    let quelle;
    try {
      quelle = readFileSync(absolut, 'utf8');
    } catch {
      throw new Error(`Modul "${id}" nicht gefunden (referenziert von ${herkunft ?? 'Einstiegspunkt'}).`);
    }

    const analyse = moduleAnalysieren(quelle, id);
    const abhaengigkeiten = analyse.importe.map((pfad) => einlesen(path.resolve(path.dirname(absolut), pfad), id));

    inArbeit.delete(id);
    module.set(id, { ...analyse, abhaengigkeiten });
    reihenfolge.push(id);
    return id;
  }

  const einstiegId = einlesen(path.resolve(wurzel, einstieg), null);

  const teile = [];
  teile.push(`/*
 * Arztbriefgenerator – erzeugtes Browser-Bundle.
 *
 * NICHT VON HAND BEARBEITEN. Diese Datei entsteht aus den Modulen unter
 * src/ und wird mit "npm run build" neu erzeugt.
 *
 * Sie ist ein klassisches Skript ohne ES-Modul-Importe, damit die Anwendung
 * auch beim direkten Öffnen von index.html über file:// funktioniert.
 * Zur Laufzeit wird nichts nachgeladen.
 *
 * Einstiegspunkt: ${einstiegId}
 * Enthaltene Module: ${reihenfolge.length}
 */`);
  teile.push('(function () {');
  teile.push("  'use strict';");
  teile.push('');
  teile.push('  var __definitionen = {};');
  teile.push('  var __instanzen = {};');
  teile.push('');
  teile.push('  function __resolve(basis, pfad) {');
  teile.push('    var teile = basis.split("/");');
  teile.push('    teile.pop();');
  teile.push('    pfad.split("/").forEach(function (stueck) {');
  teile.push('      if (stueck === "." || stueck === "") return;');
  teile.push('      if (stueck === "..") teile.pop();');
  teile.push('      else teile.push(stueck);');
  teile.push('    });');
  teile.push('    return teile.join("/");');
  teile.push('  }');
  teile.push('');
  teile.push('  function __laden(id) {');
  teile.push('    if (__instanzen[id]) return __instanzen[id];');
  teile.push('    var definition = __definitionen[id];');
  teile.push('    if (!definition) throw new Error("Modul nicht im Bundle enthalten: " + id);');
  teile.push('    var exporte = {};');
  teile.push('    __instanzen[id] = exporte;');
  teile.push('    definition(exporte, function (pfad) { return __laden(__resolve(id, pfad)); });');
  teile.push('    return exporte;');
  teile.push('  }');
  teile.push('');

  for (const id of reihenfolge) {
    const modul = module.get(id);
    teile.push(`  __definitionen[${JSON.stringify(id)}] = function (__exports, __require) {`);
    teile.push(`/* ---- ${id} ---- */`);
    teile.push(modul.rumpf.replace(/\s*$/, ''));
    if (modul.exportNamen.size) {
      const zuweisungen = [...modul.exportNamen.entries()]
        .map(([exportiert, lokal]) => `      __exports[${JSON.stringify(exportiert)}] = ${lokal};`)
        .join('\n');
      teile.push('');
      teile.push('      /* Exporte */');
      teile.push(zuweisungen);
    }
    teile.push('  };');
    teile.push('');
  }

  teile.push(`  __laden(${JSON.stringify(einstiegId)});`);
  teile.push('}());');
  teile.push('');

  return teile.join('\n');
}

export const EINSTIEG = 'src/main.js';
export const AUSGABE = 'dist/app.bundle.js';
