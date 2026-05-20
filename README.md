# Arztbriefgenerator

Lokaler, statischer Arztbriefgenerator ohne zusätzliche Installation.

## Start

Einfach `index.html` im Browser öffnen.

## Enthaltene Vorlagen (v1)

- ACS-PCI
- Device: 1/2-Kammer-PM, ICD, CRT-P, CRT-D, LifeVest
- Klappenvitien: TAVI, operativer Klappenersatz, M-TEER, T-TEER
- Lungenarterienembolie inkl. optionaler Thrombektomie

## Hausstandards (abgebildet)

- LDL-Ziel Default: `<55 mg/dl`
- DAPT-Default: elektive PCI 6 Monate (anpassbar), ACS-PCI 12 Monate
- Einheitliches Datumsformat: `TT.MM.JJJJ`
- Terminmodule mit Datum/Uhrzeit/Ort + Überweisungshinweis
- Standardisierter Punktionsstellen-Satz

## Technischer Aufbau

- `index.html`: Oberfläche
- `styles.css`: Layout/UI
- `app.js`: Feldmatrix, Template-Logik und Textgenerierung
