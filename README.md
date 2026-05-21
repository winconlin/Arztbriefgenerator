# Arztbriefgenerator

Lokaler Arztbriefgenerator mit 2 getrennten Ansichten:
1. **Arztbriefgenerator**
2. **Template Editor**

Es ist immer nur eine Ansicht sichtbar.

## Template Editor (vereinfacht)

- 3 Textfelder: Diagnosen, Epikrise, Procedere
- Variablen-Einfügung direkt an Cursorposition als `[[variable_key]]`
- Variablen-Eigenschaften:
  - Typ (`text`, `number`, `select`, `date`, `boolean`, `multiline`)
  - Name/Label
  - Position (Diagnosen/Epikrise/Procedere)
  - Sortierung
  - Default-Wert
  - Optionen (bei Dropdown)
- Einblendbare Variablen-Tabelle ohne Code-Overload

## Export/Import

- Exportiert **alle** Templates in **eine Datei**: `arztbrief_templates_all.json`
- Importiert dieselbe Sammeldatei wieder
- Speicherung lokal via `localStorage`
