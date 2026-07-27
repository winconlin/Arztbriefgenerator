/**
 * Wiederverwendbare Abschnittstexte.
 *
 * Diese Bloecke gehoeren zu den gemeinsamen Feldgruppen aus `fields.js` und
 * werden von den ausfuehrlichen Vorlagen (Quelle: Textbausteine_Kardio.docx)
 * zusammengesetzt. Der Wortlaut stammt unveraendert aus dem Quelldokument.
 */

/** Kopfzeile "-jähriger Patient in gutem Allgemein- und normalem Ernährungszustand (Größe cm, Gewicht kg)". */
const KU_KOPF = '{{#if alter}}{{alter}}-{{jaehriger}} {{/if}}{{patient_wort}} in gutem Allgemein- und normalem Ernährungszustand'
  + '{{#if groesse_cm or gewicht_kg}} ({{#if groesse_cm}}Größe {{groesse_cm}} cm{{/if}}{{#if groesse_cm and gewicht_kg}}, {{/if}}'
  + '{{#if gewicht_kg}}Gewicht {{gewicht_kg}} kg{{/if}}){{/if}}';

export const KU_AUSFUEHRLICH = `${KU_KOPF}, wach und zu allen Qualitäten orientiert. Kein Ikterus, keine Zyanose. Schleimhäute feucht. Schilddrüse schluckverschieblich.
Cor: Herztöne rein, rhythmisch, normofrequente Herzaktion, keine vitientypischen Geräusche auskultierbar, Jugularvenen nicht gestaut, kein peripheres Pulsdefizit, periphere Pulse gut tastbar, keine peripheren Ödeme.
Pulmo: vesikuläres Atemgeräusch beidseits, keine Rasselgeräusche, kein Spasmus, sonorer Klopfschall, reines Vesikuläratmen.
Abdomen: weich, regelrechte Darmgeräusche über allen vier Quadranten auskultierbar, kein Druckschmerz, keine Abwehrspannung, keine Resistenzen, kein Meteorismus, kein Aszites, Leber und Milz nicht tastbar vergrößert, kein Druck- oder Klopfschmerz über den Nierenlagern und der Wirbelsäule. Neurologisch orientierend unauffällig.`;

export const KU_KURZ = `${KU_KOPF}. Cor: auskultatorisch rein, {{ku_rhythmus}}; Pulmo: vesikuläres Atemgeräusch, keine Rasselgeräusche; Fuß- und Leistenpulse gut tastbar, keine Jugularvenenstauung; keine peripheren Ödeme; keine Zyanose; Abdomen: weich, kein Druckschmerz, keine Resistenzen; neurologisch orientierend kein fokal-neurologisches Defizit.`;

export const VEGETATIVE_ANAMNESE = 'Appetit, Durst und Flüssigkeitsaufnahme seien normal, es bestehe keine Übelkeit, kein Reflux und keine Dysphagie. Das Körpergewicht sei im letzten Jahr stabil gewesen. Stuhlgang und Miktion seien unauffällig, es bestehe keine Nykturie. Die Frage nach Husten oder Auswurf wurde verneint, ebenso die nach Fieber, Schüttelfrost und Nachtschweiß. Der Schlaf sei gut. Aktuell bestehen keine Infekte, die Leistung sei normal. Schwindel, Schwäche und Kopfschmerzen seien nicht vorhanden.';

/* ------------------------------------------------------------------ */
/* Abschnitte, die aus den gemeinsamen Feldgruppen gespeist werden      */
/* ------------------------------------------------------------------ */

export const SECTION_RISIKOFAKTOREN = {
  id: 'risikofaktoren',
  title: 'Kardiovaskuläre Risikofaktoren',
  visibleIf: 'kv_risikofaktoren not empty',
  template: `{{#each kv_risikofaktoren}}- {{this}}{{#if this == "Nikotinabusus" and nikotin_py}} ({{nikotin_py}} py){{/if}}{{#if this == "Diabetes Mellitus" and diabetes_typ}} Typ {{diabetes_typ}}{{/if}}
{{/each}}`,
};

export const SECTION_VORDIAGNOSEN = {
  id: 'vordiagnosen',
  title: 'Relevante Vordiagnosen',
  visibleIf: 'vordiagnosen not empty',
  template: `{{#each vordiagnosen}}- {{this.text}}
{{/each}}`,
};

export const SECTION_ANAMNESE = {
  id: 'anamnese',
  title: 'Anamnese',
  visibleIf: 'anamnese not empty or veg_anamnese',
  template: `{{#if anamnese}}{{anamnese}}
{{/if}}{{#if veg_anamnese}}
Vegetative Anamnese: ${VEGETATIVE_ANAMNESE}{{/if}}`,
};

export const SECTION_UNTERSUCHUNG = {
  id: 'untersuchung',
  title: 'Körperlicher Untersuchungsbefund',
  visibleIf: 'ku_variante not empty or ku_zusatz not empty',
  template: `{{#if ku_variante == "ausfuehrlich"}}${KU_AUSFUEHRLICH}{{/if}}{{#if ku_variante == "kurz"}}${KU_KURZ}{{/if}}{{#if ku_zusatz}}
{{ku_zusatz}}{{/if}}`,
};

export const SECTION_BEFUNDE = {
  id: 'befunde',
  title: 'Befunde',
  visibleIf: 'labor_auffaellig not empty or ekg_aufnahme not empty or echo_befund not empty or weitere_befunde not empty',
  template: `{{#if labor_auffaellig}}Pathologische Laborwerte bei Aufnahme:
{{labor_auffaellig}}

{{/if}}{{#if ekg_aufnahme}}EKG bei Aufnahme:
{{ekg_aufnahme}}

{{/if}}{{#if echo_befund}}Echokardiographie:
{{echo_befund}}

{{/if}}{{#if weitere_befunde}}{{weitere_befunde}}{{/if}}`,
};

export const SECTION_THERAPIEEMPFEHLUNG = {
  id: 'therapieempfehlung',
  title: 'Therapieempfehlung',
  visibleIf: 'medikation not empty or therapieempfehlung_text not empty',
  template: `{{#each medikation}}- {{this.wirkstoff}}{{#if this.staerke}} {{this.staerke}}{{/if}}{{#if this.schema}} {{this.schema}}{{/if}}{{#if this.hinweis}} ({{this.hinweis}}){{/if}}
{{/each}}{{#if therapieempfehlung_text}}{{therapieempfehlung_text}}{{/if}}`,
};

/** Anhang fuer jeden Procedere-Abschnitt: frei ergaenzte Punkte. */
export const PROCEDERE_ZUSATZ = `{{#each procedere_zusatz}}- {{this.text}}
{{/each}}`;

/** Feldgruppen, die eine ausfuehrliche Vorlage (Quelle T) typischerweise braucht. */
export const SHARED_GROUPS_LANGFORM = [
  'stammdaten',
  'aufenthalt',
  'risikofaktoren',
  'vordiagnosen',
  'anamnese_untersuchung',
  'befunde',
  'therapieempfehlung',
  'procedere_frei',
];

/** Feldgruppen fuer die kompakten Hausstandard-Briefe (Quelle M). */
export const SHARED_GROUPS_KURZFORM = ['stammdaten', 'aufenthalt', 'procedere_frei'];

/** Die Standardabschnitte einer Langform-Vorlage, ohne die fallspezifischen. */
export function langformRahmen({ diagnosen, verlauf, procedere, verlaufTitel = 'Therapie und Verlauf' }) {
  return [
    { id: 'diagnosen', title: 'Aktuelle Diagnosen', template: diagnosen },
    SECTION_RISIKOFAKTOREN,
    SECTION_VORDIAGNOSEN,
    SECTION_ANAMNESE,
    SECTION_UNTERSUCHUNG,
    SECTION_BEFUNDE,
    { id: 'verlauf', title: verlaufTitel, template: verlauf },
    SECTION_THERAPIEEMPFEHLUNG,
    { id: 'procedere', title: 'Procedere', template: `${procedere}\n${PROCEDERE_ZUSATZ}` },
  ].map((section, index) => ({ ...section, order: index + 1 }));
}
