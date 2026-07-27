# Arztbriefgenerator

Ein Werkzeug zum Erstellen kardiologischer Arztbriefe aus geprüften
Hausvorlagen. Es läuft **vollständig lokal im Browser** – ohne Server, ohne
Installation, ohne Build-Schritt und ohne eine einzige Netzwerkverbindung.

Die 23 mitgelieferten Vorlagen stammen wörtlich aus
`Musterarztbriefe_Med._I.docx` und `Textbausteine_Kardio.docx`.

---

## Starten

Es genügt, `index.html` im Browser zu öffnen – ein Doppelklick reicht.

Für den vollen Funktionsumfang ist ein lokaler Webserver zu empfehlen, weil
einige Browser ES-Module und die Zwischenablage unter `file://` einschränken:

```bash
# im Projektordner
python3 -m http.server 8080
# danach http://localhost:8080 im Browser öffnen
```

Alternativ `npm start` (startet denselben Server) oder eine beliebige
„Live Server"-Erweiterung der Entwicklungsumgebung.

Voraussetzung ist ein aktueller Browser (Chrome, Edge, Firefox oder Safari in
einer Version ab 2022). Node.js wird **nur** für die Tests benötigt, nicht für
den Betrieb.

## Bedienung

### Brief erstellen

1. **Vorlage wählen.** Die Auswahl ist nach Fachgebiet gruppiert (Koronar,
   Rhythmologie, Devices, Klappenvitien, Herzinsuffizienz, Gefäße, Hypertonie,
   Pneumologie, Allgemein). Unter der Auswahl stehen eine Kurzbeschreibung und
   die Quellenangabe.
2. **Maske ausfüllen.** Die Felder sind klinisch gegliedert: zuerst
   Stammdaten und Aufenthalt, dann die fallspezifischen Angaben, zuletzt
   Befunde, Therapieempfehlung und Procedere. Pflichtfelder sind mit `*`
   markiert, Hilfetexte nennen die Belegstelle in der Vorlage.
   Felder erscheinen und verschwinden je nach Eingabe – die CK-Zeile etwa nur
   beim STEMI, die Packungsjahre nur bei ausgewähltem Nikotinabusus.
3. **Brief lesen.** Rechts entsteht der Text in Echtzeit. Offene Pflichtfelder
   werden über der Ausgabe gemeldet.
4. **Übernehmen.** Jeder Abschnitt lässt sich einzeln kopieren, oder der
   gesamte Brief über „Alles kopieren".

### Nachbearbeiten ohne Datenverlust

Jeder Abschnitt der Ausgabe ist direkt editierbar. Sobald ein Abschnitt von
Hand geändert wurde, gilt:

* Er wird mit **„manuell bearbeitet"** markiert und ab da **nicht mehr
  automatisch überschrieben**.
* Ändert sich anschließend etwas in der Maske, erscheint zusätzlich der
  Hinweis **„Vorlage hat sich geändert"** – die manuelle Fassung bleibt aber
  stehen.
* Erst ein Klick auf **„Aus Vorlage neu erzeugen"** (mit Rückfrage) verwirft
  die manuellen Änderungen.
* Auch der Wechsel der Vorlage fragt vorher nach.

### Textbausteine

Über „Textbausteine …" öffnet sich die Bibliothek mit 25 wiederverwendbaren
Blöcken aus `Textbausteine_Kardio.docx` (vegetative Anamnese, körperlicher
Untersuchungsbefund, Langzeit-EKG, Langzeit-RR, Lungenfunktion, BGA,
Abdomensonographie, UKG, Punktions- und Anlageprozeduren, freistehende
Procedere-Zeilen). Bausteine sind durchsuchbar, werden mit den aktuellen
Eingaben gerendert und lassen sich an der Cursorposition in einen wählbaren
Abschnitt einfügen.

### Vorlagen-Editor

Im Reiter „Vorlagen-Editor" lassen sich Vorlagen **anlegen, bearbeiten,
duplizieren, löschen, exportieren und importieren**.

* Mitgelieferte Vorlagen können überschrieben und jederzeit über
  „Auf Originalfassung zurücksetzen" wiederhergestellt werden; gelöschte
  mitgelieferte Vorlagen erscheinen als „ausgeblendet" und sind
  wiederherstellbar.
* Abschnitte und Felder lassen sich sortieren, hinzufügen und entfernen.
* Die Platzhalterpalette am Ende der Seite fügt Platzhalter an der
  Cursorposition ein.
* Die Vorlage wird laufend validiert. **Solange Fehler bestehen, ist
  Speichern blockiert** – geprüft werden eindeutige IDs, gültige Platzhalter,
  gültige Bedingungen, bekannte Filter und vollständige Auswahllisten.
* Der Import prüft jede Vorlage einzeln, überspringt fehlerhafte, meldet
  ID-Kollisionen und fragt vor dem Überschreiben nach.

## Vorlagensprache

Vorlagentexte sind reiner Text mit wenigen Konstrukten – **kein JavaScript**:

| Konstrukt | Bedeutung |
| --- | --- |
| `{{feld}}` | Wert einsetzen |
| `{{datum \| date}}` | mit Filter: `date`, `dateShort`, `dateShortYear`, `monthyear`, `time`, `num`, `enum`, `join`, `bullets`, `cap`, `upper`, `lower`, `fallback` |
| `{{#if bedingung}} … {{#elseif …}} … {{#else}} … {{/if}}` | Verzweigung |
| `{{#unless bedingung}} … {{/unless}}` | negierte Bedingung |
| `{{#each liste}} … {{/each}}` | Wiederholgruppe; darin `{{this.feld}}`, `{{@index}}`, `{{@number}}`, `{{@first}}`, `{{@last}}`, `{{@count}}` |
| `{{#each liste as eintrag}}` | Schleife mit benanntem Eintrag |
| `{{! Kommentar }}` | erscheint nicht in der Ausgabe |

Bedingungen kennen `==`, `!=`, `<`, `<=`, `>`, `>=`, `and`, `or`, `not`,
`contains`, `in`, `empty` und Klammern – zum Beispiel
`cha2ds2vasc >= 2`, `acs_typ == "STEMI" and ck_max not empty`,
`kv_risikofaktoren contains "Nikotinabusus"`.

Zwei Eigenschaften sind für saubere Briefe wichtig:

* **Zeilen, die nur Blocktags enthalten, erzeugen keinen Umbruch.** Ein nicht
  erfüllter optionaler Absatz hinterlässt damit keine Leerzeile.
* **Nach dem Rendern wird nachbereinigt:** leere Klammern, doppelte
  Leerzeichen, verwaiste Satzzeichen und leere Aufzählungspunkte
  verschwinden. Medizinische Notation wie `<55mg/dl`, `0,8 cm²`, `Z.n.`,
  `8-10 Tagen` oder `1/2/3-Gefäßerkrankung` bleibt unangetastet.

Geschlechtsabhängige Formen werden aus der Anrede abgeleitet und stehen als
Platzhalter bereit: `{{anrede_name}}`, `{{anrede_name_akk}}`,
`{{patient_nom}}`, `{{patient_akk}}`, `{{patient_dat}}`, `{{patient_gen}}`,
`{{patient_poss}}`, `{{jaehriger}}` und weitere.

## Datenschutz

**Es verlassen keine Daten das Gerät.** Das ist nicht nur eine Zusage, sondern
technisch abgesichert:

* Die `Content-Security-Policy` in `index.html` setzt `default-src 'none'` und
  `connect-src 'none'`. Selbst ein Fehler oder eine manipulierte Vorlage
  könnten keine Verbindung nach außen aufbauen.
* Der Quelltext enthält **kein** `fetch`, `XMLHttpRequest`, `WebSocket`,
  `sendBeacon`, keine externen Skripte, Schriften oder Bilder und keine
  Telemetrie.
* Es werden **keine Daten in die URL geschrieben**.
* **Patienteneingaben werden standardmäßig nicht gespeichert.** Sie liegen nur
  im Arbeitsspeicher und sind mit dem Schließen des Fensters verschwunden.
  Dauerhaft im `localStorage` liegen nur die Vorlagen.
* Das Zwischenspeichern von Eingaben ist ein Opt-in mit ausdrücklicher
  Rückfrage („Einstellungen und Datenschutz").
* „Alle lokal gespeicherten Daten löschen" entfernt Vorlagen, Einstellungen
  und zwischengespeicherte Eingaben in einem Schritt.

Der Export erzeugt eine lokale Datei über einen Blob-Download – auch dabei
findet kein Netzwerkzugriff statt.

> Der generierte Text ist ein **Entwurf** und vor der Verwendung ärztlich zu
> prüfen. Das Werkzeug setzt ausschließlich die hinterlegten Vorlagen
> zusammen; es trifft keine medizinischen Entscheidungen.

## Architektur

Vanilla-JavaScript mit ES6-Modulen, ohne Abhängigkeiten und ohne Build-Schritt.

```
index.html            Markup, Content-Security-Policy
styles.css            Gestaltung inkl. Druckansicht
src/
  main.js             Bootstrap, verbindet Zustand und Oberfläche
  engine/             Template-Engine, ohne DOM-Bezug und einzeln testbar
    values.js         Wertzugriff, Wahrheitswerte, Vergleiche
    expression.js     Ausdrucksparser für Bedingungen (kein eval)
    tokenizer.js      Vorlagentext → Syntaxbaum
    format.js         Filter (Datum, Uhrzeit, Zahl, Aufzählung …)
    renderer.js       Syntaxbaum + Daten → Text
    cleanup.js        Interpunktions- und Leerraumbereinigung
  core/
    schema.js         Feldtypen, Normalisierung, Validierung
    derived.js        geschlechtsabhängige Formen aus der Anrede
    storage.js        localStorage, Versionierung, Migration
    store.js          zentraler Zustand mit Abonnements
    letter.js         Briefaufbau, Sichtbarkeit, Pflichtfeldprüfung
  data/
    fields.js         gemeinsame Feldgruppen
    sectionBlocks.js  wiederverwendbare Abschnittstexte
    snippets.js       Bausteinbibliothek (25 Blöcke)
    templates/        die 23 Briefvorlagen, nach Fachgebiet getrennt
  ui/
    dom.js            sichere DOM-Helfer
    formView.js       dynamische Eingabemaske
    previewView.js    Live-Vorschau, Kopieren, manuelle Nachbearbeitung
    editorView.js     Vorlagen-Editor
    snippetView.js    Bausteinbibliothek
tests/                node:test-Suite, keine externen Abhängigkeiten
DOCS/                 Analyse, Coverage-Matrix, Quelltext-Extrakt
```

Zwei Entscheidungen sind für die Sicherheit tragend:

* **Kein `eval`, kein `new Function`.** Bedingungen werden tokenisiert,
  geparst und interpretiert. Eine importierte Vorlage kann keinen Code
  ausführen.
* **Kein `innerHTML` mit Daten.** Die gesamte Oberfläche entsteht über
  `createElement` und `textContent`.

### Vorlagen ergänzen

Eigene Vorlagen entstehen am einfachsten im Editor und werden im `localStorage`
abgelegt. Sollen sie fest mitgeliefert werden, genügt eine neue Datei unter
`src/data/templates/` und ein Eintrag in `src/data/templates/index.js`.

## Tests

```bash
npm test          # entspricht: node --test "tests/*.test.js"
```

115 Tests, keine Abhängigkeiten, Node.js ab Version 18. Abgedeckt sind der
Ausdrucksparser, der Vorlagen-Parser, Filter, Bedingungen und Schleifen, die
Nachbereinigung, Schema-Validierung, abgeleitete Platzhalter, Persistenz und
Migration, Import/Export sowie die inhaltliche Vollständigkeit aller 23
Vorlagen gegenüber den Quelldokumenten.

## Weitere Unterlagen

| Datei | Inhalt |
| --- | --- |
| [`DOCS/COVERAGE_MATRIX.md`](DOCS/COVERAGE_MATRIX.md) | jede Vorlage mit Feldern, Datentypen, Wiederholgruppen, konditionaler Logik und Abnahmeergebnis |
| [`DOCS/QUELLTEXTE.md`](DOCS/QUELLTEXTE.md) | wortgetreuer Extrakt beider Word-Dokumente als Prüfgrundlage |
| [`DOCS/ARCHITECTURE_AND_BUGS.md`](DOCS/ARCHITECTURE_AND_BUGS.md) | Analyse des Ausgangszustands mit den behobenen Bugs und Risiken |
| [`ZUSAMMENFASSUNG.md`](ZUSAMMENFASSUNG.md) | Überblick über die Änderungen, Testergebnisse und Roadmap |
