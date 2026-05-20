# Arztbriefgenerator

Lokaler Arztbriefgenerator als statische Website (ohne zusätzliche Installation).

## Start

Einfach `index.html` im Browser öffnen.

## Enthalten

- Fallgruppen (Koronar, Device inkl. ICD/CRT-P/CRT-D/LifeVest, Klappenvitien inkl. M-/T-TEER, LAE inkl. Thrombektomie, Rhythmologie)
- Ausgabe in 3 Felder: Aktuelle Diagnosen, Epikrise, Procedere
- Feldmatrix + Vorlagenlogik in `templates.js`
- Variabler Schreibstil mit Synonymen
- Hausstandards:
  - LDL default `<55 mg/dl`
  - DAPT default elektive PCI `6 Monate` (anpassbar)
  - DAPT default ACS-PCI `12 Monate`
  - Datumsformat `TT.MM.JJJJ`

## Hinweise

- Für echte klinische Nutzung müssen Inhalte ärztlich validiert und hausintern freigegeben werden.
- Die Vorlagen lassen sich direkt in `templates.js` erweitern.
