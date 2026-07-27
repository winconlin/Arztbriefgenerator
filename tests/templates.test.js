/**
 * Abnahme der mitgelieferten Vorlagen gegen DOCS/COVERAGE_MATRIX.md.
 *
 * Geprueft wird zweierlei:
 *   1. technische Fehlerfreiheit aller 23 Vorlagen (Validierung, Rendern,
 *      keine Platzhalterreste, keine Interpunktionsreste)
 *   2. inhaltliche Vollstaendigkeit: charakteristische Saetze der beiden
 *      Quelldokumente muessen woertlich im erzeugten Brief stehen
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { BUILTIN_TEMPLATES } from '../src/data/templates/index.js';
import { SHARED_GROUPS_BY_ID } from '../src/data/fields.js';
import { SNIPPETS } from '../src/data/snippets.js';
import { defaultValueForField, resolveFields, validateTemplate } from '../src/core/schema.js';
import { render } from '../src/engine/renderer.js';
import { findMissingRequired, generateLetter, letterToText } from '../src/core/letter.js';

const nach = (id) => {
  const template = BUILTIN_TEMPLATES.find((entry) => entry.id === id);
  assert.ok(template, `Vorlage "${id}" fehlt`);
  return template;
};

/** Fuellt alle Pflichtfelder mit plausiblen Testwerten. */
function pflichtwerte(template, ueberschreibungen = {}) {
  const werte = {};
  for (const feld of resolveFields(template, SHARED_GROUPS_BY_ID)) {
    werte[feld.key] = defaultValueForField(feld);
    const leer = werte[feld.key] === '' || (Array.isArray(werte[feld.key]) && werte[feld.key].length === 0);
    if (!feld.required || !leer) continue;
    if (feld.type === 'number') werte[feld.key] = '2';
    else if (feld.type === 'date') werte[feld.key] = '2026-06-15';
    else if (feld.type === 'time') werte[feld.key] = '09:30';
    else if (feld.type === 'month') werte[feld.key] = '2026-03';
    else if (feld.type === 'multiselect') werte[feld.key] = [feld.options[0].value];
    else if (feld.options?.length) werte[feld.key] = feld.options[0].value;
    else werte[feld.key] = 'Testwert';
  }
  return { anrede: 'Herr', nachname: 'Beispiel', ...werte, ...ueberschreibungen };
}

const brieftext = (id, ueberschreibungen = {}) => {
  const template = nach(id);
  const werte = pflichtwerte(template, ueberschreibungen);
  const brief = generateLetter(template, werte, SHARED_GROUPS_BY_ID);
  assert.deepEqual(brief.errors, [], `Renderfehler in "${id}"`);
  return letterToText(brief.sections);
};

/* ------------------------------------------------------------------ */
/* Vollstaendigkeit der Vorlagensammlung                               */
/* ------------------------------------------------------------------ */

const ERWARTETE_VORLAGEN = [
  // Musterarztbriefe_Med._I.docx
  'pvi', 'epu_sonstige', 'kardioversion_stationaer', 'acs', 'pci_elektiv',
  'aortenklappenstenose_tavi', 'schrittmacher',
  // Textbausteine_Kardio.docx
  'koronarangiographie_elektiv', 'acs_langform', 'schrittmacher_langform', 'crt_d',
  'kardiale_dekompensation', 'taa_vorhofflimmern', 'kardioversion_ambulant', 'epu_bei_vhf',
  'lungenarterienembolie', 'hypertensive_krise', 'klappenoperation', 'bypass_op',
  'copd_exazerbation', 'pneumonie', 'lungenkarzinom_staging', 'todesfall_palliativ',
];

test('alle 23 Vorlagen der Coverage-Matrix sind vorhanden', () => {
  assert.deepEqual([...BUILTIN_TEMPLATES.map((t) => t.id)].sort(), [...ERWARTETE_VORLAGEN].sort());
});

test('jede Vorlage nennt ihre Quelle', () => {
  for (const template of BUILTIN_TEMPLATES) {
    assert.match(template.source, /Musterarztbriefe_Med\._I\.docx|Textbausteine_Kardio\.docx/, template.id);
  }
});

test('die Bausteinbibliothek ist vollstaendig', () => {
  // 25 Bausteine in vier Kategorien, siehe DOCS/COVERAGE_MATRIX.md Abschnitt 4.
  assert.equal(SNIPPETS.length, 25);
  const ids = SNIPPETS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'Baustein-IDs sind eindeutig');

  const proKategorie = {};
  for (const snippet of SNIPPETS) proKategorie[snippet.category] = (proKategorie[snippet.category] ?? 0) + 1;
  assert.deepEqual(proKategorie, {
    'Anamnese & Untersuchung': 3,
    'Technische Befunde': 11,
    Prozeduren: 4,
    Procedere: 7,
  });
});

/* ------------------------------------------------------------------ */
/* Technische Fehlerfreiheit                                           */
/* ------------------------------------------------------------------ */

test('jede Vorlage besteht die Schema-Validierung ohne Fehler und Hinweise', () => {
  for (const template of BUILTIN_TEMPLATES) {
    const bericht = validateTemplate(template, { sharedGroupsById: SHARED_GROUPS_BY_ID });
    assert.deepEqual(bericht.errors, [], `Fehler in "${template.id}"`);
    assert.deepEqual(bericht.warnings, [], `Hinweise in "${template.id}"`);
  }
});

test('Template-IDs und Abschnitts-IDs sind eindeutig', () => {
  const ids = BUILTIN_TEMPLATES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const template of BUILTIN_TEMPLATES) {
    const abschnitte = template.sections.map((s) => s.id);
    assert.equal(new Set(abschnitte).size, abschnitte.length, template.id);
  }
});

test('mit ausgefuellten Pflichtfeldern bleibt kein Feld offen', () => {
  for (const template of BUILTIN_TEMPLATES) {
    const offen = findMissingRequired(template, pflichtwerte(template), SHARED_GROUPS_BY_ID);
    assert.deepEqual(offen.map((e) => e.key), [], template.id);
  }
});

test('jede Vorlage rendert sauber – keine Reste, keine Luecken', () => {
  for (const template of BUILTIN_TEMPLATES) {
    const text = brieftext(template.id);
    assert.ok(text.trim().length > 0, `"${template.id}" erzeugt keinen Text`);
    assert.doesNotMatch(text, /\{\{|\}\}/, `unaufgeloeste Platzhalter in "${template.id}"`);
    assert.doesNotMatch(text, /\(\s*\)/, `leere Klammern in "${template.id}"`);
    assert.doesNotMatch(text, /\s,|,,|\s\./, `Interpunktionsrest in "${template.id}"`);
    assert.doesNotMatch(text, /\n\s*\n\s*\n/, `mehrfache Leerzeilen in "${template.id}"`);
    assert.doesNotMatch(text, /^[ \t]*[-•]\s*$/m, `leerer Aufzaehlungspunkt in "${template.id}"`);
  }
});

test('auch ohne jede Eingabe bricht keine Vorlage ab', () => {
  for (const template of BUILTIN_TEMPLATES) {
    const brief = generateLetter(template, {}, SHARED_GROUPS_BY_ID);
    assert.deepEqual(brief.errors, [], template.id);
  }
});

test('alle Bausteine rendern fehlerfrei', () => {
  for (const snippet of SNIPPETS) {
    const ergebnis = render(snippet.text, { anrede: 'Frau', nachname: 'Test', alter: '70' }, { cleanup: false });
    assert.deepEqual(ergebnis.errors, [], snippet.id);
    assert.doesNotMatch(ergebnis.text, /\{\{|\}\}/, snippet.id);
  }
});

/* ------------------------------------------------------------------ */
/* Inhaltliche Treue zu den Quelldokumenten                            */
/* ------------------------------------------------------------------ */

test('Musterarztbriefe: charakteristische Saetze stehen woertlich im Brief', () => {
  const acs = brieftext('acs');
  assert.ok(acs.includes('wurde mit akutem Koronarsyndrom auf unsere Chest-Pain-Unit aufgenommen'));
  assert.ok(acs.includes('Eine duale Thrombozytenaggregationshemmung mit ASS und'));
  assert.ok(acs.includes('ist für 12 Monate indiziert, anschließend eine lebensbegleitende Monotherapie'));
  assert.ok(acs.includes('die periphere Durchblutung, Sensibilität und Motorik waren allzeit intakt'));
  assert.ok(acs.includes('häusliches Umfeld und ihre weitere fachärztliche Betreuung'));
  assert.ok(acs.includes('Statintherapie mit Ziel-LDL <55mg/dl'), 'Zielwert der Musterarztbriefe');

  const pvi = brieftext('pvi');
  assert.ok(pvi.includes('Nach dem Ausschluss intracavitärer Thromben in einer transösophagealen Echokardiographie'));
  assert.ok(pvi.includes('mit erfolgreicher Isolation aller Pulmonalvenen mittels'));
  assert.ok(pvi.includes('Die beidseits punktierten Vv. Femorales sind am Entlasstag inspektorisch und palpatorisch reizlos'));

  const sm = brieftext('schrittmacher');
  assert.ok(sm.includes('Postinterventionell lässt sich radiomorphologisch eine korrekte Aggregats- und Sondenlage ohne Anhalt für Pneumothorax abgrenzen'));
  assert.ok(sm.includes('Wir bitten um ambulante Wundkontrolle und Fadenzug in 8-10 Tagen'));

  const tavi = brieftext('aortenklappenstenose_tavi');
  assert.ok(tavi.includes('Eine ambulante TAVI-CT wurde im Radiologischen Zentrum Rosenheim wie untenstehend vereinbart'));
  assert.ok(tavi.includes('Deutschen Herzzentrum München zur Heart-Team-Vorstellung'));

  const ekv = brieftext('kardioversion_stationaer');
  assert.ok(ekv.includes('erfolgte komplikationslos die elektrische Cardioversion mit'));
  assert.ok(ekv.includes('Therapieoptionen eines dauerhaften Rhythmuserhaltes (medikamentös vs. Interventionell)'));
});

test('Textbausteine: charakteristische Saetze stehen woertlich im Brief', () => {
  const koro = brieftext('koronarangiographie_elektiv');
  assert.ok(koro.includes('Der postinterventionelle Verlauf gestaltete sich komplikationslos'));
  assert.ok(koro.includes('duale Plättchenhemmung mit Aspirin und'), '„Aspirin" wie im Quelldokument');
  assert.ok(koro.includes('Ziel LDL-Cholesterin < 70 mg/dl'), 'Zielwert der Textbausteine');
  assert.ok(koro.includes('zuletzt palpatorisch und auskultatorisch unauffällig und reizlos bei geringem lokalem Hämatom'));

  const dekomp = brieftext('kardiale_dekompensation');
  assert.ok(dekomp.includes('Radiologisch imponierte eine pulmonalvenöse Stauung und in der körperlichen Untersuchung waren deutliche Beinödeme nachweisbar'));
  assert.ok(dekomp.includes('Wir empfehlen tägliche Gewichtskontrollen und eine maximale tägliche Flüssigkeitszufuhr von 1,5 l'));
  assert.ok(dekomp.includes('Tägliche Flüssigkeitszufuhr von max. 1,5 L'));

  const lae = brieftext('lungenarterienembolie');
  assert.ok(lae.includes('Nach einer initialen Heparinisierung mittels Heparinperfusor'), 'Verlauf aus der Quelle');
  assert.ok(lae.includes('nierdemolekulares Heparin'), 'Schreibweise der Quelle bleibt erhalten');

  const smLang = brieftext('schrittmacher_langform');
  assert.ok(smLang.includes('Ein Aggregat-Ausweis und eine Infobroschüre wurden'));
  assert.ok(smLang.includes('Tel. Chefarztsekreteriat 08031/365 3101'), 'Kontaktangabe der Quelle');

  const crt = brieftext('crt_d');
  assert.ok(crt.includes('bei hochgradig eingeschränkter linksventrikulärer Pumpfunktion und Asynchronie bei einem breiten Linksschenkelblock'));
  assert.ok(crt.includes('Tel. Chefarztsekretariat 08031/365 3101'), 'abweichende Schreibweise der CRT-D-Vorlage');

  const klappe = brieftext('klappenoperation');
  assert.ok(klappe.includes('Schön Klinik Vogtareuth'));
  assert.ok(klappe.includes('In den präoperativen Vorbereitungsuntersuchungen ergaben sich keine Kontraindikationen für den bevorstehenden Eingriff'));

  const copd = brieftext('copd_exazerbation');
  assert.ok(copd.includes('antiobstruktive Inhalationstherapie begleitet von systemischer antinflammatorischer Therapie'));

  const tod = brieftext('todesfall_palliativ');
  assert.ok(tod.includes('Mit Bedauern müssen wir Ihnen vom Tode'));
  assert.ok(tod.includes('Wir bedauern diesen Verlauf'));
});

/* ------------------------------------------------------------------ */
/* Konditionale Logik der Quelldokumente                               */
/* ------------------------------------------------------------------ */

test('CHA2DS2-VASc steuert die Dauer der Antikoagulation', () => {
  // Beleg PVI: "dauerhaft (X >= 2)/ für drei Monate indiziert (X = 0-1)"
  assert.ok(brieftext('pvi', { cha2ds2vasc: '3' }).includes('orale Antikoagulation dauerhaft indiziert'));
  assert.ok(brieftext('pvi', { cha2ds2vasc: '1' }).includes('orale Antikoagulation für drei Monate indiziert'));
  assert.ok(brieftext('pvi', { cha2ds2vasc: '2' }).includes('dauerhaft'), 'Schwelle liegt bei 2');

  // Beleg Cardioversion: "dauerhaft (X >= 2)/ für vier Wochen indiziert (X = 0-1)"
  assert.ok(brieftext('kardioversion_stationaer', { cha2ds2vasc: '0' }).includes('für vier Wochen indiziert'));
  assert.ok(brieftext('kardioversion_stationaer', { cha2ds2vasc: '4' }).includes('dauerhaft indiziert'));
});

test('bei Pulsed Field Ablation entfaellt die PPI-Empfehlung', () => {
  // Beleg: "ergänzend ist eine PPI-Therapie ... zu empfehlen (nicht bei PFA)"
  const kryo = brieftext('pvi', { pvi_verfahren: 'Kryo-Ballon' });
  assert.ok(kryo.includes('ergänzend ist eine PPI-Therapie in doppelter Standarddosis für vier Wochen nach PVI zu empfehlen'));
  assert.ok(kryo.includes('- PPI in doppelter Standarddosis für vier Wochen'));

  const pfa = brieftext('pvi', { pvi_verfahren: 'Pulsed Field Ablation' });
  assert.doesNotMatch(pfa, /PPI/, 'bei PFA darf keine PPI-Empfehlung erscheinen');
});

test('die CK-Zeile erscheint nur beim STEMI', () => {
  // Beleg: "CK max.: XXXX U/l (nur bei STEMI)"
  assert.ok(brieftext('acs', { acs_typ: 'STEMI', ck_max: '1240' }).includes('- CK max.: 1240 U/l'));
  assert.doesNotMatch(brieftext('acs', { acs_typ: 'NSTEMI', ck_max: '1240' }), /CK max/);
});

test('die Antikoagulations-Passagen erscheinen nur beim Vorhofflattern', () => {
  // Beleg: "Nur Vorhofflattern: Bei einem CHA2DS2-VASc-Score von X ..."
  const flattern = brieftext('epu_sonstige', { epu_typ: 'flattern', cha2ds2vasc: '3' });
  assert.ok(flattern.includes('Ablation des Cavotrikuspidalen Isthmus'));
  assert.ok(flattern.includes('orale Antikoagulation dauerhaft indiziert'));

  const avnrt = brieftext('epu_sonstige', { epu_typ: 'avnrt' });
  assert.ok(avnrt.includes('Modulation des slow-pathway'));
  assert.doesNotMatch(avnrt, /Antikoagulation/, 'ohne Vorhofflattern keine OAK-Passage');
  assert.doesNotMatch(avnrt, /CHA2DS2-VASc/);
});

test('Singular und Plural bei der Stentzahl', () => {
  assert.ok(brieftext('acs', { stent_anzahl: '1' }).includes('Implantation eines DE-Stents'));
  assert.ok(brieftext('acs', { stent_anzahl: '3' }).includes('Implantation 3 DE-Stents'));
});

test('geschlechtsabhaengige Formulierungen im fertigen Brief', () => {
  const herr = brieftext('acs', { anrede: 'Herr', nachname: 'Müller' });
  assert.ok(herr.includes('Herr Müller wurde mit akutem Koronarsyndrom'));
  assert.ok(herr.includes('Wir entlassen Herrn Müller'));
  assert.ok(herr.includes('in sein häusliches Umfeld'));

  const frau = brieftext('acs', { anrede: 'Frau', nachname: 'Müller' });
  assert.ok(frau.includes('Frau Müller wurde mit akutem Koronarsyndrom'));
  assert.ok(frau.includes('Wir entlassen Frau Müller'));
  assert.ok(frau.includes('in ihr häusliches Umfeld'));
});

test('das Vorhofflimmern wird korrekt gebeugt', () => {
  const text = brieftext('pvi', { vhf_typ: 'Kurz-Persistierend' });
  assert.ok(text.includes('Kurz-Persistierendes Vorhofflimmern, Erstdiagnose'), 'Nominativ in den Diagnosen');
  assert.ok(text.includes('mit symptomatischem Kurz-Persistierenden Vorhofflimmern'), 'gebeugte Form in der Epikrise');
});

test('Wiederholgruppen erzeugen je Eintrag eine Zeile', () => {
  const text = brieftext('acs', {
    vorbehandlungen: [
      { art: 'Koronare Bypass-OP', details: 'LIMA – LAD', zeitpunkt: '2019-03', ort: 'Klinikum Rosenheim' },
      { art: 'PCI', details: '', zeitpunkt: '2021-07', ort: '' },
    ],
  });
  assert.ok(text.includes('- Koronare Bypass-OP (LIMA – LAD) 03/19 (Klinikum Rosenheim)'));
  assert.ok(text.includes('- PCI 07/21'));
});

test('modulare Verlaufsabsaetze der TAA-Vorlage schalten einzeln', () => {
  const ohne = brieftext('taa_vorhofflimmern');
  assert.doesNotMatch(ohne, /Amiodaron/);
  assert.doesNotMatch(ohne, /Cardio-MRT/);

  const mit = brieftext('taa_vorhofflimmern', {
    ekv_durchgefuehrt: true, ekv_energie: '200', ekv_rezidiv: true, amiodaron_aufsaettigung_g: '10',
    koro_erfolgt: true, cmrt_erfolgt: true, diabetesberatung: true,
  });
  assert.ok(mit.includes('Elektrokardioversion mittels 200 Joule in den Sinusrhythmus, es kam allerdings zu einem frühen Rezidiv'));
  assert.ok(mit.includes('Dauertherapie mit Amiodaron nach initialer Aufsättigung auf 10 g'));
  assert.ok(mit.includes('Kontrolle des EKGs (QTc < 500 ms)'));
  assert.ok(mit.includes('Cardio-MRT-Untersuchung'));
  assert.ok(mit.includes('Diabetes- und Ernährungsberatung'));
});

test('die vier Abklaerungsabsaetze der hypertensiven Krise schalten einzeln', () => {
  const ohne = brieftext('hypertensive_krise');
  assert.doesNotMatch(ohne, /Cushing|Metanephrine|Nierenarterienstenose|Hyperaldosteronismus/);

  const mit = brieftext('hypertensive_krise', {
    abklaerung_cushing: true, abklaerung_phaeo: true, abklaerung_nierenarterie: true, abklaerung_hyperaldo: true,
  });
  assert.ok(mit.includes('zum Ausschluss eines Cushing-Syndroms Cortisol und ACTH bestimmt'));
  assert.ok(mit.includes('Zum Ausschluss eines Phächromozytoms bestimmten wir die Metanephrine im Plasma'));
  assert.ok(mit.includes('Eine Nierenarterienstenose konnte duplexsonographisch'));
  assert.ok(mit.includes('erhöhter Aldosteron-Renin-Quotient'));
  assert.ok(mit.includes('- Durchführung eines Kochsalzbelastungstestes'));
});

test('die Risikofaktoren erscheinen mit ihren Zusatzangaben', () => {
  const text = brieftext('acs', {
    kv_risikofaktoren: ['Arterielle Hypertonie', 'Nikotinabusus', 'Diabetes Mellitus'],
    nikotin_py: '30',
    diabetes_typ: 'II',
  });
  assert.ok(text.includes('Kardiovaskuläre Risikofaktoren: Arterielle Hypertonie, Nikotinabusus (30 py), Diabetes Mellitus Typ II.'));
});
