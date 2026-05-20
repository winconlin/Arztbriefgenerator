# Arztbriefgenerator

Lokaler, statischer Arztbriefgenerator ohne zusätzliche Installation.

## Start

Einfach `index.html` im Browser öffnen.

## Enthaltene Vorlagen (v2, näher an den Vorlagen)

- ACS-PCI (inkl. Telemetrie, CK bei STEMI, AHB-Option, standardisierte Punktionsstelle)
- Device: PM/ICD/CRT-P/CRT-D/LifeVest (inkl. Rö-Thx, Device-Kontrolle, OAK-Pause, Nachsorgetermin)
- Klappenvitien: TAVI, operativer Klappenersatz, M-TEER, T-TEER inkl. OPV-Block
- Lungenarterienembolie inkl. optionaler Thrombektomie

## Hausstandards (abgebildet)

- LDL-Ziel Default: `<55 mg/dl`
- DAPT-Default in ACS-Template: 12 Monate (anpassbar)
- Einheitliches Datumsformat: `TT.MM.JJJJ`
- Terminmodule mit Datum/Uhrzeit/Ort + Überweisungshinweis
- Standardisierter Punktionsstellen-Satz
- Sprachstil wahlweise konservativ oder variabel (Synonymrotation)

## Technischer Aufbau

- `index.html`: Oberfläche
- `styles.css`: Layout/UI
- `app.js`: Feldmatrix, Template-Logik und Textgenerierung
