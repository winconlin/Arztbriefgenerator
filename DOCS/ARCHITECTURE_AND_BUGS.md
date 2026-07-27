# Architektur-, Bug- und Risikoanalyse (Stand vor Umbau)

Analysebasis: Commit `84e47a3` (Merge PR #9) sowie die beiden medizinischen
Quelldokumente `Musterarztbriefe_Med._I.docx` und `Textbausteine_Kardio.docx`.

Dieses Dokument beschreibt den **Ist-Zustand** des Prototyps. Es ist die
Begründung für den in Phase B–E durchgeführten Umbau. Der beschriebene Zustand
gilt bewusst für den *alten* Code – nach Abschluss aller Phasen ist die
Zielarchitektur in `README.md` und `ZUSAMMENFASSUNG.md` beschrieben.

---

## 1. Ist-Dateistruktur

```
/
├── index.html      66 Zeilen   – komplettes Markup beider Ansichten, feste IDs
├── app.js         131 Zeilen   – State, Persistenz, Template-Engine, UI, Editor
├── templates.js    76 Zeilen   – window.APP_CONFIG mit 8 Szenario-Templates
├── styles.css       6 Zeilen   – minifiziertes CSS
└── README.md       26 Zeilen
```

Keine Build-Tools, keine Abhängigkeiten, keine Tests, kein `package.json`.
Portabilität ist damit gegeben – dieser Vorteil wird beim Umbau bewahrt.

## 2. Ist-Datenmodell

Persistiert wird ein einziges Objekt unter dem `localStorage`-Schlüssel
`arztbrief_templates_all_v2`:

```jsonc
{
  "templates": [
    {
      "id": "acs_standard",
      "title": "ACS Standard",
      "variables": [
        { "key":"p2y12", "label":"P2Y12", "type":"select",
          "options":["Clopidogrel"], "default":"Ticagrelor",
          "position":"procedere", "order":1 }
      ],
      "output": {
        "diagnosen": "…{{platzhalter}}…",
        "epikrise":  "…",
        "procedere": "…"
      }
    }
  ]
}
```

Kerneigenschaften und ihre Folgen:

| Eigenschaft | Folge |
| --- | --- |
| `output` hat **genau drei** feste Schlüssel | Anamnese, körperlicher Untersuchungsbefund, Befunde, Therapie & Verlauf, Therapieempfehlung sind nicht abbildbar |
| `variables` ist eine **flache Liste** | Keine Gruppierung, keine Wiederholgruppen (Diagnosenliste, Stents, Medikation) |
| `position` ist auf `diagnosen`/`epikrise`/`procedere` beschränkt | Kopplung von Eingabemaske an die drei Ausgabefelder; klinische Gliederung der Maske unmöglich |
| Kein `schemaVersion` | Migration nicht möglich, obwohl der Schlüsselname (`…_v2`) eine Vorversion impliziert |
| Kein Feld für Pflicht/Optional, Hilfetext, Einheit, Sichtbarkeitsregel | Keine Validierung, keine konditionale Maske |
| Template-Text ist reiner String mit `{{key}}` | Keine Bedingungen, keine Schleifen, keine Formatierung |

### Zweites, unerreichbares Datenmodell

`templates.js` definiert ein **völlig anderes** Modell (`window.APP_CONFIG` mit
`fieldMatrix`, `caseGroups`, `synonyms` und `generate(d, s)`-Funktionen für acht
Szenarien). Dieses Modell ist mächtiger (Bedingungen via JS-Ternary), aber:

> **`templates.js` wird von `index.html` nirgends eingebunden.** Es existiert
> kein `<script src="templates.js">`. Der komplette dort hinterlegte
> medizinische Inhalt (elektive PCI, ACS-PCI, Device, LifeVest, TAVI/TEER,
> LAE, Kardioversion, PVI/EPU) ist **toter Code** und für Nutzer nicht
> erreichbar.

Damit stehen dem Anwender faktisch **ein** Template (`acs_standard`, 3 Sätze)
gegenüber **23 Szenarien** in den Quelldokumenten zur Verfügung.

---

## 3. Sicherheitsrisiken

### 3.1 HTML-Injection / XSS über Template-Daten (hoch)

Vier Stellen schreiben nicht escapte Daten per `innerHTML` in das Dokument:

| Stelle | Injizierbare Daten |
| --- | --- |
| `app.js:31` `renderTemplates()` | `t.title` (via `textContent` – hier unkritisch), aber `o.value = t.id` ungeprüft |
| `app.js:37-40` `inputFor()` | `v.key`, `v.default`, `v.options[]` – direkt in Attributwerte |
| `app.js:46` `renderForm()` | `v.label` – direkt in `<label>` |
| `app.js:67-68` `redrawVarTable()` | `v.key`, `v.label`, `v.type`, `v.position`, `v.order` |

Beispiel: ein Template mit `{"key":"x\" onfocus=alert(1) autofocus=\"", …}` führt
beim Rendern der Maske Skriptcode aus. Da Templates über `import-all` aus einer
**beliebigen JSON-Datei** geladen werden (`app.js:113-117`) und Vorlagen
zwischen Kolleginnen und Kollegen ausgetauscht werden sollen, ist das ein
realistischer Angriffspfad. Konsequenz in einer Klinikumgebung: eingegebene
Patientendaten könnten aus dem DOM ausgelesen und – trotz „offline"-Anspruch –
per `fetch` exfiltriert werden.

**Maßnahme im Umbau:** keinerlei `innerHTML` mit Daten; ausschließlich
`document.createElement` + `textContent` (`src/ui/dom.js`), zusätzlich eine
restriktive CSP im `<head>`, die `connect-src`, `img-src`, `frame-src` auf
`'none'` setzt.

### 3.2 Datenverlust beim Import (hoch)

```js
document.getElementById("import-all").onchange = async (e) => {
  const f = e.target.files?.[0]; if(!f) return;
  const parsed = JSON.parse(await f.text());   // ← wirft bei ungültigem JSON
  if(!Array.isArray(parsed.templates)) return;
  state = parsed; persist();                    // ← ersetzt ALLES, ohne Backup
};
```

* Ungültiges JSON löst eine unbehandelte Promise-Rejection aus – der Nutzer
  bekommt keinerlei Rückmeldung, „es passiert einfach nichts".
* Ein gültiges `{"templates":[]}` löscht sämtliche eigenen Vorlagen
  unwiderruflich; direkt danach wirft `app.js:131` (`state.templates[0].id`)
  einen `TypeError` und die App ist bis zum Leeren des `localStorage`
  unbenutzbar.
* Keine Schema-Validierung: Felder mit falschem Typ landen ungeprüft im State.

### 3.3 Keine Content-Security-Policy

Es existiert keine CSP. In Kombination mit 3.1 gibt es keine zweite
Verteidigungslinie gegen Exfiltration.

### 3.4 Positiv: keine Netzwerkzugriffe im Ist-Zustand

Der Prototyp lädt keine CDN-Ressourcen, keine Fonts, kein Telemetrie-Skript und
schreibt nichts in die URL. Diese Eigenschaft ist zu **erhalten**, nicht zu
reparieren.

### 3.5 Datenschutz: Persistenzumfang

Aktuell werden nur Templates persistiert, keine Eingabewerte – das ist
datenschutzseitig günstig. Beim Umbau darf ein Komfort-Feature („Eingaben
merken") diesen Zustand nicht stillschweigend aufweichen; erforderlich sind
Opt-in und eine sichtbare Löschfunktion.

---

## 4. Funktionale Bugs

| # | Ort | Bug | Auswirkung |
| --- | --- | --- | --- |
| B1 | `index.html` | `templates.js` wird nicht eingebunden | 8 Szenarien mit medizinischem Inhalt sind unerreichbar |
| B2 | `app.js:131` | `state.templates[0].id` ohne Guard | `TypeError`, App startet nicht, wenn Template-Liste leer ist |
| B3 | `app.js:52` | `document.getElementById(v.key)` | Variablen-Keys teilen den globalen ID-Namensraum. Ein Key `diagnosen`, `epikrise`, `procedere`, `scenario` oder `generate` kollidiert mit vorhandenen Element-IDs → falsche oder leere Werte, überschriebene Ausgabefelder |
| B4 | `app.js:37` | `select` setzt kein `selected` | `default` eines Dropdowns wird nie angewandt |
| B5 | `app.js:39` | `boolean` ignoriert `default`, liefert die Strings `"ja"`/`"nein"` | Bedingungslogik auf Booleans unmöglich |
| B6 | `app.js:40` | `date` und `multiline` fallen auf `<input type=text>` durch | 2 von 6 dokumentierten Typen sind nicht implementiert |
| B7 | `app.js:56` | `fill()` ersetzt fehlende Werte durch `""` | Ergebnis „Wir entlassen  am  in gutem Allgemeinzustand", leere Klammern `()`, doppelte Leerzeichen, verwaiste Satzzeichen |
| B8 | `app.js:45` | `sort((a,b)=>a.order-b.order)` bei fehlendem `order` | `NaN`-Vergleich → unstabile, praktisch zufällige Feldreihenfolge |
| B9 | `app.js:84-91` | `save-var` schreibt in `getTemplate()` (Generator-Auswahl), nicht in das im Editor per ID adressierte Template | Variablen landen am falschen Template |
| B10 | `app.js:96` | `const base = getTemplate() \|\| {variables:[]}` | Ein „neues" Template erbt stillschweigend alle Variablen des gerade ausgewählten |
| B11 | `app.js:105` | `state.templates.filter(...)` + `push` | Speichern verschiebt das Template ans Listenende → Reihenfolge springt bei jedem Speichern |
| B12 | `app.js:100-102` | Konvertierung `[[key]]` → `{{key}}` via `/\[\[([\w_]+)\]\]/g` | Verlustbehaftet und inkonsistent: zwei Platzhaltersyntaxen, keine Prüfung, ob der Platzhalter als Variable existiert → stumme Leerausgabe bei Tippfehlern |
| B13 | `app.js:129` | `navigator.clipboard.writeText` ohne `try/catch` | Unter `file://` ist der Kontext in mehreren Browsern nicht „secure" → Kopieren schlägt ohne jede Rückmeldung fehl |
| B14 | `app.js:129` | Zugriff auf `diagnosen`/`epikrise`/`procedere` als implizite globale Variablen | Bricht in strikterem Kontext und bei ID-Kollisionen (B3) |
| B15 | `app.js:24` | `persist()` ohne `try/catch` | `QuotaExceededError` (Safari Private Mode) verwirft die Speicherung stumm |
| B16 | `index.html:26-28` | Ausgabefelder sind `readonly` | Der generierte Brief lässt sich nicht nachbearbeiten – für den klinischen Einsatz disqualifizierend |
| B17 | `index.html` | `<label>` ohne `for`, Inputs ohne `id`-Bezug in der Maske | Screenreader-Zuordnung fehlt, Klick aufs Label fokussiert nicht |
| B18 | `app.js` gesamt | Kein Löschen, kein Duplizieren, kein Einzel-Export von Templates | Editor bleibt Einbahnstraße |
| B19 | `app.js:120-126` | `scenario.onchange` befüllt den Editor, wird aber auch beim reinen Generator-Wechsel ausgelöst | Ungespeicherte Editor-Änderungen gehen ohne Warnung verloren |

---

## 5. Technische Einschränkungen gegenüber den Quelldokumenten

Die Quelldokumente verlangen sechs Fähigkeiten, die der Prototyp strukturell
nicht besitzt:

1. **Beliebige Abschnitte.** `Textbausteine_Kardio.docx` gliedert jeden Brief in
   *Aktuelle Diagnosen · Kardiovaskuläre Risikofaktoren · Relevante Vordiagnosen ·
   Anamnese · Körperlicher Untersuchungsbefund · Befunde · Therapie und Verlauf ·
   Therapieempfehlung · Procedere* – neun Abschnitte gegenüber drei möglichen.
2. **Alternativen im Fließtext.** Die Vorlagen kodieren Auswahl als
   Schrägstrich-Listen: `Paroxysmales/ (Kurz-)Persistierendes Vorhofflimmern`,
   `Kryo-Ballon/ RF`, `A. rad./fem. rechts/links`, `1-/2-Kammer-Schrittmacher`.
   Ohne Dropdown-Platzhalter muss der Anwender im Fließtext löschen –
   genau die Fehlerquelle, die das Werkzeug beseitigen soll.
3. **Konditionale Passagen.** Explizit im Dokument markiert:
   `CK max.: XXXX U/l (nur bei STEMI)`, `Nur Vorhofflattern: Bei einem
   CHA2DS2-VASc-Score …`, `ergänzend ist eine PPI-Therapie … zu empfehlen
   (nicht bei PFA)`, sowie die Score-abhängige Verzweigung
   `dauerhaft (X ≥ 2) / für vier Wochen (X = 0-1)`.
4. **Genusabhängige Formulierungen.** `in sein/ihr häusliches Umfeld`,
   `der Patient`/`die Patientin`, `-jähriger Patient`.
5. **Wiederholbare Strukturen.** Mehrere Diagnosen pro Brief, mehrere Stents,
   mehrere Vordiagnosen, Medikationslisten, mehrere technische Befunde.
6. **Zahlen-/Datums-/Uhrzeitfelder mit Einheit.** `XXX J biphasisch`,
   `CK max. XXXX U/l`, `KÖF 0,X cm²`, `pmean XX mmHg`, `um XX.XX Uhr`,
   `bis max. XX mmHg`, `FEV1 1,33 L (50,2 %)`.

Zusätzlich enthält `Textbausteine_Kardio.docx` eine **Bausteinbibliothek**, die
kein vollständiger Brief ist (vegetative Anamnese, zwei Varianten des
körperlichen Untersuchungsbefunds, Langzeit-RR, Langzeit-EKG, Belastungs-EKG,
Lungenfunktion, BGA, Abdomensonographie, UKG, Punktions- und Anlageprozeduren,
freistehende Procedere-Zeilen). Für diese Bausteine existiert im Prototyp
überhaupt kein Konzept.

---

## 6. Weitere Mängel

* **Keine Trennung der Belange.** `app.js` mischt Datenmodell, Persistenz,
  Template-Engine, Formular-Rendering, Editor-Logik und Event-Bindung in einer
  Datei ohne Module (`<script src>` statt `type="module"`).
* **Keine Tests.** Weder für Platzhalterersetzung noch für Import-Validierung.
* **Keine Validierung** beim Speichern: leere IDs werden zwar abgefangen, aber
  doppelte IDs, ungültige Zeichen und unbekannte Platzhalter nicht.
* **Kein Feedback.** Fast alle Fehlerpfade enden in einem stummen `return`.
* **CSS minifiziert in 6 Zeilen** – nicht wartbar, kein Fokus-Styling, kein
  Druck-Layout, kein `prefers-color-scheme`.

---

## 7. Zielarchitektur (Umsetzung in Phase B–E)

```
index.html                  Markup + CSP, lädt genau ein ES-Modul
styles.css                  lesbares CSS, Fokus-States, Druckansicht
src/
  main.js                   Bootstrap, Verdrahtung
  core/
    schema.js               Template-/Feld-Schema, Normalisierung, Validierung
    store.js                zentraler State + Subscriptions
    storage.js              localStorage-Zugriff, Versionierung, Migration v1/v2 → v3
  engine/
    tokenizer.js            Template-Text → AST (Text, Var, If, Each)
    conditions.js           sicherer Ausdrucksparser (kein eval, kein Function)
    renderer.js             AST + Daten → Text
    cleanup.js              Interpunktions-/Leerraumbereinigung
    format.js               Datum, Uhrzeit, Zahl, Aufzählungen
  data/
    fields.js               gemeinsame Feldbibliothek (Stammdaten, Aufenthalt …)
    snippets.js             Bausteinbibliothek aus Textbausteine_Kardio.docx
    templates/*.js          migrierte Briefvorlagen
  ui/
    dom.js                  sichere DOM-Helfer (kein innerHTML mit Daten)
    formView.js             dynamische Eingabemaske
    previewView.js          Live-Vorschau, Abschnittskopie, manuelle Nachbearbeitung
    editorView.js           Template-Editor (CRUD, Import/Export, Validierung)
tests/                      node:test-Suite, keine externen Abhängigkeiten
DOCS/                       diese Analyse, Coverage-Matrix, Quelltext-Extrakt
```

Leitentscheidungen:

* **Kein Build-Schritt.** ES6-Module laden nativ; die App bleibt per
  `python3 -m http.server` oder als Ordner auf einem USB-Stick lauffähig.
* **Kein `eval`, kein `new Function`.** Bedingungen werden von einem eigenen
  Tokenizer/Parser in einen AST überführt und interpretiert.
* **Kein `innerHTML` mit variablen Daten.** Ausschließlich `createElement` +
  `textContent`.
* **Medizinische Texte sind Daten, kein Code.** Kein Template enthält
  JavaScript – anders als im alten `templates.js` mit seinen
  `generate(d, s)`-Funktionen.
