# Feldmatrix v1.1 – Arztbriefgenerator

## Hausstandards
- LDL-Ziel default: `<55 mg/dl`
- DAPT default elektive PCI: `6 Monate` (anpassbar)
- DAPT default ACS-PCI: `12 Monate`
- OAK-Rhythmologie: regelbasiert nach CHA₂DS₂-VASc
- Datumsformat: `TT.MM.JJJJ`
- Terminmodule: Datum/Uhrzeit/Ort/Überweisung erforderlich

## Globaler Kern
| Key | Typ | Pflicht | Beispiel |
|---|---|---:|---|
| gender | select | ja | männlich/weiblich/divers |
| age | number | ja | 72 |
| admission_date | text | ja | 20.05.2026 |
| discharge_date | text | ja | 22.05.2026 |
| cv_risk_factors | multiselect+text | nein | Hypertonie, Diabetes |

## Module
### Koronar / ACS-PCI
`acs_type, vessel_disease, target_vessel, stent_count, p2y12, dapt_months, ldl_target`

### Device
`device_type (PM/ICD/CRT-P/CRT-D/LifeVest), mode, manufacturer, serial_number, follow_up_date`

### Klappe
`valve_type, procedure_type (TAVI/M-TEER/T-TEER/OP), koef, pmean, lvef, opv_checklist`

### LAE
`lae_side, respiratory_failure, oac_agent, oac_duration, thrombectomy`
