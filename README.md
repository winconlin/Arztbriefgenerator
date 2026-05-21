# Arztbriefgenerator

Lokaler, statischer Arztbriefgenerator inklusive **Template-Editor** und **Export/Import** als eine gemeinsame Datei.

## Start

`index.html` im Browser öffnen.

## Neu: Template-Editor + Weitergabe

- Bestehende Templates können erweitert/ergänzt werden.
- Neue Templates können mit Shared-Feldern und Custom-Feldern erstellt werden.
- Alle Templates sind als **eine einzige JSON-Datei** exportierbar: `arztbrief_templates_all.json`.
- Diese Datei kann auf anderen Rechnern wieder importiert werden (Weitergabe/Sammeldatei).

## Architektur

- `index.html`: Generator + Editor UI
- `app.js`: Shared-Feldkatalog, Template-Store, Rendering, Editor, Export/Import
- `styles.css`: Layout und UI
