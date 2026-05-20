# Arztbriefgenerator (lokale Website)

Dieser Prototyp läuft vollständig lokal im Browser (ohne Serverinstallation).

## Start

1. Repository herunterladen/klonen
2. `index.html` im Browser öffnen

## Enthalten

- UI für Auswahl von Fallgruppen
- Dynamische Eingabefelder je Vorlage
- Ausgabe in 3 Felder: **Aktuelle Diagnosen**, **Epikrise**, **Procedere**
- Copy-Buttons je Feld + Gesamtbrief
- Option für variierende Formulierungen (Synonyme)

## Datenstruktur

- `data/field-matrix.v1.1.json`: Globale Feldmatrix und Hausstandards
- `data/templates.json`: Vorlagen inkl. Felder und Textbausteine

## Bereits abgebildete Kernbereiche

- ACS mit PCI
- Device (PM / ICD / CRT-P / CRT-D / LifeVest)
- Klappenvitien (TAVI / operativer Ersatz / M-TEER / T-TEER)

Die Dateien sind so aufgebaut, dass weitere Vorlagen einfach ergänzt werden können.
