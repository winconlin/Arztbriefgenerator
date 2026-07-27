/**
 * Abgeleitete Platzhalter.
 *
 * Die Quellvorlagen kodieren geschlechtsabhaengige Formulierungen als
 * Schraegstrich-Alternativen ("in sein/ihr haeusliches Umfeld",
 * "-jaehriger Patient", "der Patient"). Statt dafuer je ein Eingabefeld zu
 * verlangen, werden diese Formen aus der Anrede abgeleitet und stehen in
 * jeder Vorlage als Platzhalter zur Verfuegung.
 *
 * Es entsteht dadurch kein neuer medizinischer Inhalt – nur die im Original
 * bereits vorhandene Alternative wird ausgewaehlt.
 */

import { asText } from '../engine/values.js';

/** Beschreibung fuer Editor-Hilfe und Validierung. */
export const DERIVED_VARIABLES = [
  { key: 'anrede_name', description: 'Anrede + Nachname im Nominativ, z. B. "Herr Müller"' },
  { key: 'anrede_name_akk', description: 'Akkusativ, z. B. "Herrn Müller" – "Wir entlassen …"' },
  { key: 'anrede_name_dat', description: 'Dativ, z. B. "Herrn Müller" – "Mit … wurden …"' },
  { key: 'anrede_kurz', description: 'Kurzform, z. B. "Hr. Müller"' },
  { key: 'voller_name', description: 'Vorname + Nachname, sofern erfasst' },
  { key: 'patient_wort', description: '"Patient" / "Patientin"' },
  { key: 'patient_nom', description: '"der Patient" / "die Patientin"' },
  { key: 'patient_akk', description: '"den Patienten" / "die Patientin"' },
  { key: 'patient_dat', description: '"dem Patienten" / "der Patientin"' },
  { key: 'patient_gen', description: '"des Patienten" / "der Patientin"' },
  { key: 'patient_poss', description: '"sein" / "ihr" – z. B. "in sein häusliches Umfeld"' },
  { key: 'patient_poss_gen', description: '"seiner" / "ihrer"' },
  { key: 'patient_poss_akk', description: '"seinen" / "ihren"' },
  { key: 'jaehriger', description: '"jähriger" / "jährige" – z. B. "{{alter}}-{{jaehriger}} {{patient_wort}}"' },
  { key: 'ist_weiblich', description: 'Wahrheitswert für eigene Bedingungen' },
];

export const DERIVED_KEYS = new Set(DERIVED_VARIABLES.map((entry) => entry.key));

const FEMALE = {
  patient_wort: 'Patientin',
  patient_nom: 'die Patientin',
  patient_akk: 'die Patientin',
  patient_dat: 'der Patientin',
  patient_gen: 'der Patientin',
  patient_poss: 'ihr',
  patient_poss_gen: 'ihrer',
  patient_poss_akk: 'ihren',
  jaehriger: 'jährige',
};

const MALE = {
  patient_wort: 'Patient',
  patient_nom: 'der Patient',
  patient_akk: 'den Patienten',
  patient_dat: 'dem Patienten',
  patient_gen: 'des Patienten',
  patient_poss: 'sein',
  patient_poss_gen: 'seiner',
  patient_poss_akk: 'seinen',
  jaehriger: 'jähriger',
};

/**
 * Erweitert die Formulardaten um die abgeleiteten Platzhalter.
 * Die Originaldaten bleiben unveraendert.
 */
export function withDerivedValues(values) {
  const data = { ...(values || {}) };
  const anrede = asText(data.anrede).trim();
  const female = anrede.toLowerCase().startsWith('frau');
  const forms = female ? FEMALE : MALE;

  const nachname = asText(data.nachname).trim();
  const vorname = asText(data.vorname).trim();
  const anredeWort = anrede || (female ? 'Frau' : 'Herr');
  // "Herr" wird in Akkusativ und Dativ zu "Herrn"; "Frau" bleibt unveraendert.
  const anredeWortFlektiert = female ? anredeWort : `${anredeWort}n`;
  const join = (...parts) => parts.filter(Boolean).join(' ');

  Object.assign(data, forms, {
    ist_weiblich: female,
    anrede_name: join(anredeWort, nachname),
    anrede_name_akk: join(anredeWortFlektiert, nachname),
    anrede_name_dat: join(anredeWortFlektiert, nachname),
    anrede_kurz: join(female ? 'Fr.' : 'Hr.', nachname),
    voller_name: join(vorname, nachname) || nachname,
  });

  return data;
}
