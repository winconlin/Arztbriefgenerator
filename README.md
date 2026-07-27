# Arztbriefgenerator

Ein Werkzeug zum Erstellen kardiologischer Arztbriefe aus geprüften
Hausvorlagen. Es läuft **vollständig lokal im Browser** – ohne Server, ohne
Installation, ohne Build-Schritt und ohne eine einzige Netzwerkverbindung.

Die 23 mitgelieferten Vorlagen stammen wörtlich aus
`Musterarztbriefe_Med._I.docx` und `Textbausteine_Kardio.docx`.

---

## Starten (für Anwender)

1. ZIP-Archiv von GitHub herunterladen.
2. Archiv **vollständig entpacken** – in einen normalen Ordner, z. B. auf dem
   Desktop.
3. `index.html` doppelklicken.

Das war alles. Es wird **kein** Webserver, **kein** Node.js, **kein** Terminal
und **keine** Installation benötigt. In der Adresszeile des Browsers steht
danach `file:///…` – genau so ist es gedacht.

> **Wichtig:** Das Archiv muss zuerst entpackt werden. Wird `index.html` direkt
> aus der ZIP-Vorschau des Betriebssystems geöffnet, fehlen die übrigen
> Dateien und die Anwendung startet nicht. Achten Sie darauf, dass der Ordner
> `dist` neben `index.html` liegt.

Voraussetzung ist ein aktueller Browser: Chrome, Edge oder Firefox ab
Version 98 (Frühjahr 2022) beziehungsweise Safari 15.4.

Startet die Anwendung nicht, bleibt ein deutlich sichtbarer Hinweis stehen und
nennt den Grund; technische Einzelheiten stehen in der Browserkonsole
(Taste <kbd>F12</kbd>).

### Optional: über einen lokalen Server

Für die Entwicklung lässt sich die Anwendung zusätzlich über HTTP ausliefern.
Für die reguläre Nutzung ist das **nicht** erforderlich:

```bash
npm start          # entspricht: python3 -m http.server 8080
```

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
  könnten keine Verbindung nach außen aufbauen. Der Smoke-Test weist beides
  aktiv nach: Ein eingeschleustes Inline-Skript wird blockiert, ein `fetch`
  nach außen ebenfalls.
* `script-src` und `style-src` erlauben neben `'self'` das lokale Schema
  `file:`. Beim Doppelklick hat die Seite die Herkunft `null`, sodass `'self'`
  je nach Browser nicht greift und Skript und Stylesheet blockiert würden.
  Netzwerkquellen bleiben ausgeschlossen, `'unsafe-inline'` und
  `'unsafe-eval'` sind weiterhin nicht erlaubt.
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

Vanilla-JavaScript mit ES6-Modulen und ohne jede Abhängigkeit – weder zur
Laufzeit noch für den Build.

Die Anwendung wird als **ein klassisches Skript** ausgeliefert
(`dist/app.bundle.js`). Grund: Browser verweigern das Laden von ES-Modulen
über `file://` (die Seite hat dann die Herkunft `null`, das Laden scheitert an
der CORS-Prüfung). Ein Modul-Einstiegspunkt würde beim Doppelklick also
komplett stumm fehlschlagen. Die modularen Quellen unter `src/` bleiben die
maßgebliche Fassung; das Bundle wird daraus erzeugt und ist mitcommittet,
damit der heruntergeladene Ordner sofort funktioniert.

```
index.html            Markup, Content-Security-Policy
styles.css            Gestaltung inkl. Druckansicht
dist/
  app.bundle.js       ERZEUGT – ausgeliefertes klassisches Skript
tools/
  bundler.mjs         ES-Module -> klassisches Skript
  build.mjs           Build und Aktualitätsprüfung
  smoke.mjs           Browsertest über file:// und http
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

## Für Entwickler

Bearbeitet wird **ausschließlich** `src/`. Nach jeder Änderung muss das Bundle
neu erzeugt werden:

```bash
npm run build          # erzeugt dist/app.bundle.js aus src/
npm test               # 128 Logik- und Bundle-Tests
```

> **Regel:** `dist/app.bundle.js` gehört in denselben Commit wie die Änderung
> an `src/`. Andernfalls lädt der heruntergeladene Ordner eine veraltete
> Fassung. `npm test` schlägt fehl, wenn das Bundle nicht dem Stand von `src/`
> entspricht; `npm run build:check` prüft das auch einzeln, etwa in einem
> Pre-Commit-Hook oder in der CI.

`dist/app.bundle.js` wird erzeugt und ist **nicht von Hand zu bearbeiten**.
Der Bundler (`tools/bundler.mjs`, rund 300 Zeilen, ohne Abhängigkeiten) fasst
den Modulgraphen zu einem klassischen Skript zusammen. Er verändert
ausschließlich `import`- und `export`-Anweisungen; jedes andere Zeichen –
insbesondere die medizinischen Vorlagentexte – wird unverändert übernommen.
Das sichert ein eigener Test ab.

### Browsertests

```bash
npm run test:file      # Smoke-Test über eine echte file://-URL
npm run test:browser   # zusätzlich über einen lokalen HTTP-Server
```

Diese Tests brauchen Playwright als reine Entwicklungsabhängigkeit; fehlt es,
melden sie das und enden ohne Fehler. Für den Betrieb der Anwendung wird es
nicht benötigt.

```bash
npm install --no-save playwright && npx playwright install chromium
```

Steht bereits ein Browser bereit, lässt er sich über die Umgebungsvariable
`ARZTBRIEF_BROWSER_PATH` verwenden. Mit `--browser=firefox` läuft derselbe
Test gegen Firefox.

### Manueller Test in Firefox

Falls Firefox nicht automatisiert zur Verfügung steht, ist dieser Ablauf
reproduzierbar von Hand durchzuführen:

1. `npm run build` ausführen.
2. Im Dateimanager `index.html` per Doppelklick in Firefox öffnen; die
   Adresszeile muss mit `file:///` beginnen.
3. Konsole öffnen (<kbd>F12</kbd>) und prüfen: keine Fehler, insbesondere
   keine CSP- oder CORS-Meldung zu `dist/app.bundle.js`.
4. Der Starthinweis darf nicht mehr sichtbar sein.
5. Vorlagen-Dropdown enthält 23 Einträge; Vorlage „Akutes Koronarsyndrom"
   wählen, Nachnamen eintippen – der Brief rechts muss sich mitändern.
6. Beide Reiter durchschalten, Bausteindialog öffnen und schließen,
   „Alles kopieren" auslösen und die Rückmeldung prüfen.

## Tests

```bash
npm test
```

128 Tests, keine Abhängigkeiten, Node.js ab Version 18. Abgedeckt sind der
Ausdrucksparser, der Vorlagen-Parser, Filter, Bedingungen und Schleifen, die
Nachbereinigung, Schema-Validierung, abgeleitete Platzhalter, Persistenz und
Migration, Import/Export, die inhaltliche Vollständigkeit aller 23 Vorlagen
gegenüber den Quelldokumenten sowie das ausgelieferte Bundle.

## Weitere Unterlagen

| Datei | Inhalt |
| --- | --- |
| [`DOCS/COVERAGE_MATRIX.md`](DOCS/COVERAGE_MATRIX.md) | jede Vorlage mit Feldern, Datentypen, Wiederholgruppen, konditionaler Logik und Abnahmeergebnis |
| [`DOCS/QUELLTEXTE.md`](DOCS/QUELLTEXTE.md) | wortgetreuer Extrakt beider Word-Dokumente als Prüfgrundlage |
| [`DOCS/ARCHITECTURE_AND_BUGS.md`](DOCS/ARCHITECTURE_AND_BUGS.md) | Analyse des Ausgangszustands mit den behobenen Bugs und Risiken |
| [`ZUSAMMENFASSUNG.md`](ZUSAMMENFASSUNG.md) | Überblick über die Änderungen, Testergebnisse und Roadmap |
