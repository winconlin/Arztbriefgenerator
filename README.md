# Arztbriefgenerator

Lokaler Arztbriefgenerator als statische Website (ohne zusätzliche Installation).

## Start

Einfach `index.html` im Browser öffnen.

## Enthaltene Vorlagen (v3)

- Elektive Koronarangiographie / PCI
- ACS-PCI
- Device: PM/ICD/CRT-P/CRT-D/LifeVest
- Klappenvitien: TAVI, operativer Klappenersatz, M-TEER, T-TEER inkl. OPV-Block
- Lungenarterienembolie inkl. optionaler Thrombektomie
- Kardiale Dekompensation
- TAA bei Vorhofflimmern
- Elektrische Kardioversion
- Pulmonalvenenisolation (EPU bei VHF)
- Sonstige EPU (AVNRT/AVRT/WPW/CTI)
- Hypertensive Krise
- Bypass-OP Vorbereitung

## Hausstandards (abgebildet)

- LDL-Ziel Default: `<55 mg/dl`
- DAPT-Default: elektive PCI 6 Monate (anpassbar), ACS-PCI 12 Monate
- Einheitliches Datumsformat: `TT.MM.JJJJ`
- Terminmodule mit Datum/Uhrzeit/Ort + Überweisungshinweis
- Standardisierter Punktionsstellen-Satz
- Sprachstil wahlweise konservativ oder variabel (Synonymrotation)

## Technischer Aufbau

- `index.html`: Oberfläche
- `styles.css`: Layout/UI
- `app.js`: Feldmatrix, Template-Logik und Textgenerierung
