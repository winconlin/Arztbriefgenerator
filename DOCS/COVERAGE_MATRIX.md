# Coverage-Matrix der medizinischen Vorlagen

Vollständige Erfassung aller Vorlagen aus den beiden Quelldokumenten.
Der wörtliche Extrakt beider Dokumente liegt zur Nachprüfung in
[`QUELLTEXTE.md`](QUELLTEXTE.md) – er ist die **Single Source of Truth**.
Kein Satz, keine Dosierung und keine Empfehlung dieser Matrix ist erfunden;
alle Formulierungen stammen wörtlich aus den Quelldokumenten.

**Quellen**

| Kürzel | Datei | Charakter |
| --- | --- | --- |
| **M** | `Musterarztbriefe_Med._I.docx` | 7 kompakte Hausstandard-Briefe, Gliederung *Aktuelle Diagnosen / Epikrise / Procedere* |
| **T** | `Textbausteine_Kardio.docx` | 16 ausführliche Briefe, Gliederung *Aktuelle Diagnosen / KV-Risikofaktoren / Relevante Vordiagnosen / Anamnese / Körperlicher Untersuchungsbefund / Befunde / Therapie und Verlauf / Therapieempfehlung / Procedere*, zusätzlich eine Bausteinbibliothek |

**Legende Datentypen**

`text` Einzeiler · `multiline` Fließtext · `number` Zahl · `date` Datum ·
`time` Uhrzeit · `monthyear` Monat/Jahr (`XX/XX`) · `select` Dropdown ·
`multiselect` Mehrfachauswahl · `checkbox` Ja/Nein · `radio` Optionsgruppe ·
`list` Wiederholgruppe mit Unterfeldern

**Legende Status**

| Status | Bedeutung |
| --- | --- |
| 🔴 | im Prototyp gar nicht vorhanden |
| 🟠 | rudimentär/inhaltlich verkürzt vorhanden |
| 🟡 | vorhanden, aber technisch nicht korrekt abbildbar (fehlende Engine-Fähigkeit) |

Alle in dieser Matrix mit 🔴/🟠/🟡 markierten Punkte werden in Phase B–D
umgesetzt; die Abnahme erfolgt in Phase E gegen genau diese Tabelle.

---

## 0. Übersicht aller Vorlagen

| ID | Titel | Quelle | Gruppe | Abschnitte | Ist-Status Prototyp |
| --- | --- | --- | --- | --- | --- |
| `pvi` | Pulmonalvenenisolation | M | Rhythmologie | 3 | 🟠 nur als toter Code in `templates.js` (`pvi_epu`, 2 Sätze) |
| `epu_sonstige` | Sonstige elektrophysiologische Untersuchung | M | Rhythmologie | 3 | 🟠 dito, drei Prozedurtypen in ein Dropdown zusammengefasst |
| `kardioversion_stationaer` | Elektrische Kardioversion (stationär) | M | Rhythmologie | 3 | 🟠 toter Code `cardioversion` |
| `acs` | Akutes Koronarsyndrom | M | Koronar | 3 | 🟠 toter Code `acs_pci`; einziges *erreichbares* Template `acs_standard` mit 3 erfundenen Sätzen |
| `pci_elektiv` | Perkutane Koronarintervention (chronisches KS) | M | Koronar | 3 | 🟠 toter Code `elective_pci` |
| `aortenklappenstenose_tavi` | Aortenklappenstenose / TAVI | M | Klappen | 3 | 🟠 toter Code `tavi_teer_opv`, stark generisch |
| `schrittmacher` | Schrittmacherimplantation | M | Devices | 3 | 🟠 toter Code `pm_icd_crt` |
| `koronarangiographie_elektiv` | Koronarangiographie (elektiv) | T | Koronar | 9 | 🔴 |
| `acs_langform` | Akutes Koronarsyndrom (Langform) | T | Koronar | 9 | 🔴 |
| `schrittmacher_langform` | Schrittmacher (Langform) | T | Devices | 9 | 🔴 |
| `crt_d` | CRT-D-Implantation | T | Devices | 9 | 🔴 |
| `kardiale_dekompensation` | Kardiale Dekompensation | T | Herzinsuffizienz | 9 | 🔴 |
| `taa_vorhofflimmern` | Tachyarrhythmia absoluta bei Vorhofflimmern | T | Rhythmologie | 9 | 🔴 |
| `kardioversion_ambulant` | Kardioversion (Tagesklinik, ambulant) | T | Rhythmologie | 9 | 🔴 |
| `epu_bei_vhf` | EPU bei Vorhofflimmern | T | Rhythmologie | 8 | 🔴 |
| `lungenarterienembolie` | Lungenarterienembolie | T | Gefäße | 9 | 🟠 toter Code `lae`, Text frei erfunden |
| `hypertensive_krise` | Hypertensive Krise | T | Hypertonie | 9 | 🔴 |
| `klappenoperation` | Klappenoperation (operativer Ersatz) | T | Klappen | 9 | 🔴 |
| `bypass_op` | Bypass-OP (Verlegung) | T | Koronar | 9 | 🔴 |
| `copd_exazerbation` | Infektexazerbierte COPD | T | Pneumologie | 3 | 🔴 |
| `pneumonie` | Septische Pneumonie | T | Pneumologie | 4 | 🔴 |
| `lungenkarzinom_staging` | Lungenkarzinom – Staging-Komplettierung | T | Pneumologie/Onkologie | 4 | 🔴 |
| `todesfall_palliativ` | Todesfall / palliativer Verlauf | T | Allgemein | 2 | 🔴 |
| — | Bausteinbibliothek (21 Blöcke) | T | — | — | 🔴 kein Konzept vorhanden |

Zusätzlich im Prototyp vorhanden, **aber ohne Beleg in den Quelldokumenten**:
`lifevest` (LifeVest-Versorgung) und die M-TEER/T-TEER-Optionen in
`tavi_teer_opv`. Diese Texte sind nicht aus den Vorlagen abgeleitet. Sie werden
**nicht** in das neue Datenmodell übernommen (Grundsatz „keine erfundenen
medizinischen Inhalte"); der Sachverhalt ist in `ZUSAMMENFASSUNG.md` vermerkt.

---

## 1. Gemeinsame Felder (alle Vorlagen)

Diese Felder wiederholen sich in praktisch jedem Brief und werden **einmal**
zentral definiert (`src/data/fields.js`), damit ein Wechsel der Vorlage die
bereits eingegebenen Daten nicht verwirft.

### Gruppe „Patientenstammdaten"

| Feld | Label | Typ | Pflicht | Belegstelle | Bemerkung |
| --- | --- | --- | --- | --- | --- |
| `anrede` | Anrede | select `Herr`/`Frau` | ✔ | M: „X stellte sich …", T: „Herr .. klagt über …" | steuert Genus |
| `nachname` | Nachname | text | ✔ | T: „Fr. Elisabeth May" | |
| `vorname` | Vorname | text | ✖ | T: „Frau May" | optional, nur in Todesfall-Vorlage genutzt |
| `alter` | Alter (Jahre) | number | ✖ | T: „-jähriger Patient" | erzeugt „72-jähriger Patient" |
| `groesse_cm` | Größe (cm) | number | ✖ | T: „(Größe cm, Gewicht kg)" | |
| `gewicht_kg` | Gewicht (kg) | number | ✖ | T: „(Größe cm, Gewicht kg)" | |

**Konditionale Logik (Genus).** Aus `anrede` abgeleitet, ohne eigenes Eingabefeld:

| Ableitung | `Herr` | `Frau` | Belegstelle |
| --- | --- | --- | --- |
| Anrede + Name | „Herr Müller" | „Frau Müller" | M durchgängig als `X` |
| Possessivpronomen | „sein" | „ihr" | M: „in sein/ihr häusliches Umfeld" |
| Patientenbezeichnung | „der Patient" / „den Patienten" / „dem Patienten" | „die Patientin" / „die Patientin" / „der Patientin" | T durchgängig „der Patient" |
| Alterszusatz | „72-jähriger Patient" | „72-jährige Patientin" | T: „-jähriger Patient" |

🟡 Im Prototyp nicht abbildbar – `fill()` kennt keine Bedingungen.

### Gruppe „Aufenthalt"

| Feld | Label | Typ | Pflicht | Belegstelle |
| --- | --- | --- | --- | --- |
| `aufnahme_datum` | Aufnahmedatum | date | ✔ | T: „Die stationäre Aufnahme … erfolgte am xx.08.2018" |
| `entlass_datum` | Entlassdatum | date | ✔ | M: „Wir entlassen X am XX.XX." |
| `entlass_az` | Allgemeinzustand bei Entlassung | select `gutem`/`stabilem`/`stabilem und beschwerdefreiem`/`deutlich gebessertem` | ✔ | M: „in gutem/stabilem Allgemeinzustand", T: „in stabilem und beschwerdefreiem Zustand" |
| `entlass_formel` | Entlassformulierung | select (Hausstil M / Hausstil T) | ✔ | zwei belegte Varianten, s. u. |

Belegte Entlassformeln (wörtlich, keine Mischformen):

* **M:** „Wir entlassen {Anrede Name} am {Datum} in {AZ} Allgemeinzustand in
  {sein/ihr} häusliches Umfeld und ihre weitere fachärztliche Betreuung."
* **T (Regelfall):** „Am {Datum} konnten wir {den Patienten/die Patientin} in
  stabilem und beschwerdefreiem Zustand wieder in Ihre geschätzte ambulante
  ärztliche Weiterbehandlung entlassen und stehen für Rückfragen gerne zur
  Verfügung."
* **T (Variante Herzinsuffizienz/LAE/Hypertonie):** „Wir entlassen {den
  Patienten/die Patientin} am {Datum} in gutem Allgemeinzustand in Ihre
  geschätzte haus- und fachärztliche Weiterbetreuung und stehen bei Rückfragen
  jederzeit gerne zur Verfügung."
* **T (Verlegung):** „Wir konnten {den Patienten/die Patientin} am {Datum} in
  stabilem Allgemeinzustand in die Schön Klinik Vogtareuth verlegen."

### Gruppe „Kardiovaskuläre Risikofaktoren"

| Feld | Label | Typ | Pflicht | Belegstelle |
| --- | --- | --- | --- | --- |
| `kv_risikofaktoren` | Risikofaktoren | multiselect | ✖ | T Z. 1–4 |
| `nikotin_py` | Nikotinabusus (py) | number | ✖ | T: „Nikotinabusus (XX py)" |
| `diabetes_typ` | Diabetes-Typ | select `I`/`II` | ✖ | T: „Diabetes Mellitus Typ I/II" |

Optionen `kv_risikofaktoren` (wörtlich, vollständig): Arterielle Hypertonie ·
Adipositas · Nikotinabusus · Diabetes Mellitus · Hypercholesterinämie ·
Hyperlipoproteinämie · Hyperurikämie · positive Familienanamnese.

🟡 `multiselect` fehlt dem Prototyp; `nikotin_py` und `diabetes_typ` sind
konditionale Unterfelder (nur sichtbar, wenn der jeweilige Risikofaktor gewählt
ist) – ebenfalls nicht abbildbar.

---

## 2. Vorlagen aus `Musterarztbriefe_Med._I.docx`

### 2.1 `pvi` — Pulmonalvenenisolation

**Szenario:** Symptomatisches Vorhofflimmern, elektive PVI mittels Kryoballon,
Radiofrequenz oder PFA nach TEE-gesteuertem Thrombusausschluss.

**Abschnitte:** Aktuelle Diagnosen · Epikrise · Procedere

| Statisch (unverändert übernommen) | Variabel |
| --- | --- |
| „Nach dem Ausschluss intracavitärer Thromben in einer transösophagealen Echokardiographie erfolgte komplikationslos die Elektrophysiologische Untersuchung mit erfolgreicher Isolation aller Pulmonalvenen mittels …" | Ablationsverfahren |
| „Der weitere Aufenthalt gestaltete sich unauffällig, in seriellen echokardiographischen Kontrollen konnte postinterventionell ein Perikarderguss ausgeschlossen werden." | — |
| „Die beidseits punktierten Vv. Femorales sind am Entlasstag inspektorisch und palpatorisch reizlos, die periphere Durchblutung, Sensibilität und Motorik waren allzeit intakt." | — |

| Feld | Label | Typ | Pflicht | Optionen / Beleg |
| --- | --- | --- | --- | --- |
| `vhf_typ` | Vorhofflimmern-Typ | select | ✔ | `Paroxysmales` · `Kurz-Persistierendes` · `Persistierendes` |
| `vhf_erstdiagnose` | Erstdiagnose | monthyear | ✔ | „Erstdiagnose XX/XX" |
| `ehra` | EHRA-Klasse | select `I`–`IV` | ✔ | „EHRA I-IV" |
| `cha2ds2vasc` | CHA₂DS₂-VASc | number 0–9 | ✔ | „CHA2DS2-VASc: X" |
| `hasbled` | HAS-BLED | number 0–9 | ✔ | „HAS-BLED: X" |
| `pvi_verfahren` | Ablationsverfahren | select | ✔ | `Kryo-Ballon` · `Radiofrequenzablation` · `Pulsed Field Ablation` |
| `pvi_datum` | Datum der PVI | date | ✔ | „am XX.XX.20XX" |
| `vorherige_ekv` | Vorausgegangene Kardioversion | checkbox | ✖ | Diagnosen-Zeile 3 |
| `vorherige_ekv_primaer_erfolgreich` | primär erfolgreich | checkbox | ✖ | „(Primär) erfolgreiche" |
| `vorherige_ekv_zeitpunkt` | Zeitpunkt | monthyear | ✖ | „XX/XX" |
| `aa_substanz` | Antiarrhythmikum | text | ✖ | „medikamentöse antiarrhythmische Therapie mit Substanz X" |
| `aa_von` / `aa_bis` | Therapie von / bis | monthyear | ✖ | „XX/XX – XX/XX" |
| `wv_datum` | Wiedervorstellung Datum | date | ✖ | „am XX.XX.20XX" |
| `wv_uhrzeit` | Wiedervorstellung Uhrzeit | time | ✖ | „um XX.XX Uhr" |

**Wiederholbar:** Diagnosen-Unterpunkte (Aktuell-Zeile, Vorbehandlungen) als
Liste; 🔴 im Prototyp nur als Freitext.

**Konditionale Logik**

| Bedingung | Wirkung | Beleg |
| --- | --- | --- |
| `cha2ds2vasc >= 2` | „ist eine orale Antikoagulation **dauerhaft** indiziert" | „dauerhaft (X ≥ 2)/ für drei Monate indiziert (X = 0-1)" |
| `cha2ds2vasc <= 1` | „ist eine orale Antikoagulation **für drei Monate** indiziert" | dito |
| `pvi_verfahren != Pulsed Field Ablation` | Satzteil „ergänzend ist eine PPI-Therapie in doppelter Standarddosis für vier Wochen nach PVI zu empfehlen" | „(nicht bei PFA)" |
| `pvi_verfahren != Pulsed Field Ablation` | Procedere-Zeile „PPI in doppelter Standarddosis für vier Wochen" | dito |
| `vorherige_ekv` | Diagnosen-Zeile 3 erscheint | — |
| `wv_datum` gesetzt | Procedere-Zeile Wiedervorstellung inkl. „bitte Einweisungsschein ausstellen" | — |

🟡 Sämtliche Bedingungen im Prototyp nicht abbildbar.
**Status:** 🟠 – im toten `templates.js` existiert `pvi_epu` mit zwei generischen
Sätzen; die Score-abhängige OAK-Dauer, die PFA-Ausnahme und der Punktionsstellen-Satz fehlen vollständig.

---

### 2.2 `epu_sonstige` — Sonstige elektrophysiologische Untersuchung

**Szenario:** AVNRT, AVRT/WPW oder typisches Vorhofflattern mit Ablation.
Die Vorlage enthält **drei getrennte Diagnosenblöcke**, die je nach Prozedur
ausgewählt werden.

| Feld | Label | Typ | Pflicht | Optionen / Beleg |
| --- | --- | --- | --- | --- |
| `epu_typ` | Prozedur | radio | ✔ | `AVNRT` · `AVRT/WPW` · `Vorhofflattern (CTI)` |
| `epu_datum` | Datum der EPU | date | ✔ | „am XX.XX.20XX" |
| `bahn_lokalisation` | Lokalisation akzessorische Bahn | select+frei | ✖ | „posterioren/anterioren/X" |
| `flattern_richtung` | Flatterrichtung | select | ✖ | `clockwise` · `counter-clockwise` |
| `cha2ds2vasc` | CHA₂DS₂-VASc | number | bedingt ✔ | nur bei Vorhofflattern |
| `hasbled` | HAS-BLED | number | bedingt ✔ | nur bei Vorhofflattern |
| `tee_erfolgt` | TEE-Thrombusausschluss erfolgt | checkbox | ✔ | „Nach dem Ausschluss … / Es erfolgte …" |

**Konditionale Logik**

| Bedingung | Wirkung |
| --- | --- |
| `epu_typ == AVNRT` | Diagnose „AV-Knoten-Reentrytachykardie" + „Modulation des slow-pathway am {Datum}"; Epikrise „mit erfolgreicher Modulation des slow-pathway bei AVNRT" |
| `epu_typ == AVRT/WPW` | Diagnose „AV-Reentry-Tachykardie/ WPW-Syndrom" + „Ablation einer {Lokalisation} akzessorischen Leitungsbahn am {Datum}" |
| `epu_typ == Vorhofflattern` | Diagnose „Typisches „{Richtung}" Vorhofflattern, CHA2DS2-VASc: X, HAS-BLED: X" + „Ablation des Cavotrikuspidalen Isthmus am {Datum}" |
| `epu_typ == Vorhofflattern` | zusätzlicher Epikrise-Absatz „Bei einem CHA2DS2-VASc-Score von X ist eine orale Antikoagulation … indiziert, bei erneuten Beschwerden bitten wir um Wiedervorstellung über unsere rhythmologische Ambulanz." (im Original mit „Nur Vorhofflattern:" markiert) |
| `epu_typ == Vorhofflattern` **und** `cha2ds2vasc >= 2` | „dauerhaft" |
| `epu_typ == Vorhofflattern` **und** `cha2ds2vasc <= 1` | „für vier Wochen" |
| `tee_erfolgt` | „Nach dem Ausschluss intracavitärer Thromben in einer transösophagealen Echokardiographie erfolgte …" statt „Es erfolgte …" |
| Eingangssatz | „mit symptomatischen paroxysmalen Tachykardien" (AVNRT/AVRT) bzw. „mit symptomatischem Vorhofflattern" |

**Status:** 🟠 – `templates.js` fasst alle drei Prozeduren in ein Dropdown ohne
prozedurspezifische Texte; die „Nur Vorhofflattern"-Passagen fehlen.

---

### 2.3 `kardioversion_stationaer` — Elektrische Kardioversion (stationär)

| Feld | Label | Typ | Pflicht | Optionen / Beleg |
| --- | --- | --- | --- | --- |
| `rhythmusstoerung` | Rhythmusstörung | select | ✔ | `Paroxysmales Vorhofflimmern` · `Kurz-Persistierendes Vorhofflimmern` · `Persistierendes Vorhofflimmern` · `Typisches Vorhofflattern` · `Atypisches Vorhofflattern` · `Fokal-Atriale Tachykardie` |
| `rezidiv` | Rezidiv | checkbox | ✖ | „(Rezidiv eines/r)" |
| `vhf_erstdiagnose` | Erstdiagnose | monthyear | bedingt | nur bei Vorhofflimmern |
| `ehra` | EHRA | select `I`–`IV` | bedingt | nur bei Vorhofflimmern |
| `cha2ds2vasc` | CHA₂DS₂-VASc | number | ✔ | |
| `hasbled` | HAS-BLED | number | ✔ | |
| `ekv_energie` | Energie (J) | number | ✔ | „mit XXXJ biphasisch" |
| `ekv_datum` | Datum der Kardioversion | date | ✔ | |
| `vorherige_ablation` | Vorausgegangene Ablation/PVI | checkbox | ✖ | Diagnosen-Zeile 2 |
| `vorherige_ablation_verfahren` | Verfahren | select | ✖ | `Kryo-Ballon` · `RF` |
| `vorherige_ablation_datum` | Datum | date | ✖ | |
| `wv_ort` | Wiedervorstellung | select | ✖ | `rhythmologische Sprechstunde` · `Station` |
| `wv_station` | Station | text | ✖ | „Station XX" |
| `wv_datum` | Datum | date | ✖ | |

**Konditionale Logik:** `rezidiv` → Präfix „(Rezidiv eines/r)"; Genus des
Präfixes richtet sich nach der gewählten Rhythmusstörung (eines
Vorhofflimmerns / einer Tachykardie) 🟡; `cha2ds2vasc >= 2` → „dauerhaft",
sonst „für vier Wochen"; EHRA/Erstdiagnose nur bei Vorhofflimmern.

**Statischer Kernsatz:** „Mit X wurden die weiteren Therapieoptionen eines
dauerhaften Rhythmuserhaltes (medikamentös vs. Interventionell) besprochen und
ein Termin zur Wiedervorstellung wie untenstehend vereinbart."

**Status:** 🟠 – `templates.js: cardioversion` erfindet die Formulierungen neu
(„TEE-basiertem Thrombusausschluss", „regelbasiert nach CHA2DS2-VASc"), statt
den Hausstandard zu verwenden.

---

### 2.4 `acs` — Akutes Koronarsyndrom

| Feld | Label | Typ | Pflicht | Optionen / Beleg |
| --- | --- | --- | --- | --- |
| `acs_typ` | ACS-Typ | select | ✔ | `STEMI` · `NSTEMI` · `Instabile AP` |
| `gefaesserkrankung` | Gefäßerkrankung | select `1`/`2`/`3` | ✔ | „koronarer X-Gefäßerkrankung" |
| `laesionsart` | Läsionsart | select | ✔ | `Verschluss` · `hochgradige Stenose` |
| `zielgefaess` | Zielgefäß | select+frei | ✔ | LAD · RCX · RCA · Hauptstamm · … |
| `zielgefaess_segment` | Segment | select | ✔ | `prox.` · `med.` · `dist.` |
| `stent_anzahl` | Anzahl DE-Stents | number ≥1 | ✔ | „Implantation X DE-Stents" |
| `pci_datum` | Datum der PCI | date | ✔ | |
| `ck_max` | CK max. (U/l) | number | bedingt | „CK max.: XXXX U/l (nur bei STEMI)" |
| `p2y12` | P2Y12-Inhibitor | select | ✔ | `Clopidogrel` · `Prasugrel` · `Ticagrelor` |
| `telemetrie_tage` | Telemetrie-Dauer (Tage) | number | ✖ | „über X Tage" |
| `telemetrie_befund` | Rhythmusstörungen | select | ✖ | `keine` · `folgende` (+ Freitext) |
| `echo_befund` | Echokardiographie | multiline | ✖ | „Echokardiographisch zeigt sich…." |
| `punktion_gefaess` | Punktionsstelle Gefäß | select | ✔ | `A. rad.` · `A. fem.` |
| `punktion_seite` | Seite | select | ✔ | `rechts` · `links` |
| `vorbehandlungen` | Kardiale Vorbehandlungen | **list** | ✖ | „Koronare Bypass-OP (LIMA – LAD, usw.) XX/XX (Klinikum XX)/ PCI/DES-Implantation usw." |
| `ahb_beantragt` | Kardiologische AHB beantragt | checkbox | ✖ | Procedere-Zeile 3 |

**Wiederholbar:** `vorbehandlungen` mit Unterfeldern
`art` (select: Bypass-OP / PCI / DES-Implantation), `details` (text, z. B.
„LIMA – LAD"), `zeitpunkt` (monthyear), `ort` (text). 🔴 Im Prototyp
unmöglich.

**Konditionale Logik:** `acs_typ == STEMI` → Diagnosen-Zeile „CK max.: {ck_max}
U/l"; `stent_anzahl == 1` → „eines DE-Stents" statt „X DE-Stents"
(Singular/Plural) 🟡; `telemetrie_befund` steuert „waren keine/folgende
Rhythmusstörungen auffällig"; `ahb_beantragt` schaltet die Procedere-Zeile.

**Konstante Empfehlung (nicht variabel!):** DAPT-Dauer ist bei ACS im Hausstandard
**12 Monate**, Ziel-LDL **< 55 mg/dl**. Der Prototyp macht die 12 Monate im
Procedere zu „(anpassbar)" – eine inhaltliche Abweichung von der Vorlage.

**Status:** 🟠 – erreichbares `acs_standard` enthält drei selbst formulierte
Sätze ohne Bezug zur Vorlage; `acs_pci` (tot) ist näher dran, lässt aber
Telemetrie, Echo, Risikofaktoren, Punktionsstelle, Vorbehandlungen und AHB aus.

---

### 2.5 `pci_elektiv` — Perkutane Koronarintervention

Wie 2.4, jedoch:

* Diagnose „Chronisches Koronarsyndrom bei X-Gefäßerkrankung"
* Eingangssatz „X wurde mit Verdacht auf Progress einer bekannten KHK stationär
  aufgenommen."
* **DAPT-Dauer ist variabel:** „für X Monate indiziert" → Feld `dapt_monate`
  (number, Pflicht) – im Gegensatz zu 2.4.
* Keine CK-Zeile, keine Telemetrie, keine AHB-Zeile, kein Echo-Satz.
* Punktionsstellen-Satz identisch (Kleinschreibung „rechts/links" wie im Original).

**Status:** 🟠 – `elective_pci` (tot) verwendet Ziel-LDL aus der Config und
Synonym-Rotation; der Hausstandardsatz wird nicht wörtlich wiedergegeben.

---

### 2.6 `aortenklappenstenose_tavi` — Aortenklappenstenose / TAVI

| Feld | Label | Typ | Pflicht | Beleg |
| --- | --- | --- | --- | --- |
| `koef` | KÖF (cm²) | number (Dezimal) | ✔ | „KÖF: 0,X cm²" |
| `pmean` | pmean (mmHg) | number | ✔ | „pmean XXmmHg" |
| `aufnahmegrund` | Aufnahmegrund | select | ✔ | `Belastungsdyspnoe` · `dekompensierte Herzinsuffizienz` |
| `indikationsgrund` | Indikationsgrund | select | ✔ | `der Symptome` · `der eingeschränkten Linksventrikulären Funktion` |
| `tavi_grund` | Begründung interventionell | select | ✔ | `des fortgeschrittenen Patientenalters` · `der ausgeprägten Komorbiditäten (Frailty-Syndrom)` |
| `khk_vorhanden` | Begleitende KHK | checkbox | ✖ | „Chronisches Koronarsyndrom bei X-Gefäßerkrankung" |
| `gefaesserkrankung` | Gefäßerkrankung | select `1`/`2`/`3` | bedingt | |
| `koro_befund` | Koronarbefund | multiline | ✖ | „Koronarangiographisch zeigt sich eine X-Gefäßerkrankung mit…." |
| `tavi_ct_datum` | TAVI-CT Datum | date | ✔ | „Ambulantes TAVI-CT am radiologischen Zentrum Rosenheim am XX.XX.20XX" |
| `entlass_az` | AZ bei Entlassung | select | ✔ | „in stabilem/gutem Allgemeinzustand" |

**Feste Einrichtungen (wörtlich aus der Vorlage, nicht erfinden):**
„Radiologisches Zentrum Rosenheim" (TAVI-CT), „Deutsches Herzzentrum München"
(Heart-Team-Vorstellung und ggf. TAVI), Terminmitteilung „durch unser
Sekretariat".

**Status:** 🟠 – `tavi_teer_opv` (tot) generalisiert auf TAVI/M-TEER/T-TEER/OP
und ersetzt die konkreten Kooperationspartner durch Platzhaltertexte; die
Terminmodul-Sätze sind frei erfunden.

---

### 2.7 `schrittmacher` — Schrittmacherimplantation

| Feld | Label | Typ | Pflicht | Beleg |
| --- | --- | --- | --- | --- |
| `indikation` | Indikation | select | ✔ | `SA-Block` · `AV-Block` · `Bradykardie-Tachykardie-Syndrom` |
| `block_grad` | Grad | select `I°`/`II°`/`III°` | bedingt | „SA-/AV-Block X°" |
| `kammer_anzahl` | Kammern | select `Ein`/`Zwei`/`Drei` | ✔ | „X-Kammer-Schrittmachers" |
| `sm_modus` | Modus | text | ✔ | „(Modus, …)" |
| `sm_firma` | Firma / Aggregat | text | ✔ | „Fa./ Aggregat" |
| `sm_sn` | Seriennummer | text | ✔ | „Schrittmachernummer (SN)" |
| `implantation_datum` | Implantationsdatum | date | ✔ | „am xx.xx." |
| `kontrolle_datum` | Erstkontrolle Datum | date | ✔ | „am xx.xx.24" |
| `kontrolle_uhrzeit` | Erstkontrolle Uhrzeit | time | ✔ | „xx.xx Uhr" |
| `oak_pause_tage` | OAK-Pause (Tage) | number | ✖ | „für X Tage nach Implantation pausiert" |
| `oak_wiederbeginn` | OAK-Wiederbeginn | date | ✖ | „Wiederbeginn OAK ab xx.xx" |

**Statisch:** „Postinterventionell lässt sich radiomorphologisch eine korrekte
Aggregats- und Sondenlage ohne Anhalt für Pneumothorax abgrenzen. Eine
abschließende Device-Kontrolle zeigt eine korrekte Funktion bei unauffälligen
Sondenmesswerten. Wir bitten um ambulante Wundkontrolle und Fadenzug in 8-10
Tagen."

**Konditional:** OAK-Absatz und Procedere-Zeile „Wiederbeginn OAK" nur, wenn
`oak_pause_tage` gesetzt.

**Status:** 🟠 – `pm_icd_crt` (tot) mischt PM/ICD/CRT in ein Template und
verkürzt die Befundsätze.

---

## 3. Vorlagen aus `Textbausteine_Kardio.docx`

Alle T-Vorlagen teilen dieselbe **Abschnittsgliederung**. Abschnitte ohne
eigenen Vorlagentext sind Freitext-Container, die der Anwender füllt bzw. mit
Bausteinen aus Abschnitt 4 bestückt:

| # | Abschnitt | Charakter |
| --- | --- | --- |
| 1 | Aktuelle Diagnosen | teils vorformuliert, teils Liste |
| 2 | Kardiovaskuläre Risikofaktoren | Auswahl aus Baustein |
| 3 | Relevante Vordiagnosen | Liste (Freitext) |
| 4 | Anamnese | Freitext + Baustein „vegetative Anamnese" |
| 5 | Körperlicher Untersuchungsbefund | Baustein (2 Varianten) |
| 6 | Befunde | Baustein-Sammlung (EKG, LZ-EKG, LZ-RR, Echo, …) |
| 7 | Therapie und Verlauf | vorformuliert – Kern jeder Vorlage |
| 8 | Therapieempfehlung | Freitext (Medikationsplan) |
| 9 | Procedere | vorformulierte Zeilen + freie Zeilen |

🔴 Der Prototyp kennt nur die Abschnitte 1, 7 (als „Epikrise") und 9.
**Sechs von neun Abschnitten gehen verloren.**

### 3.1 `koronarangiographie_elektiv`

| Feld | Typ | Pflicht | Beleg |
| --- | --- | --- | --- |
| `gefaesserkrankung` | select `1`/`2`/`3` | ✔ | „Koronare 1/2/3-Gefäßerkrankung" |
| `acvb_situation` | checkbox | ✖ | „(mit ACVB Situation, Jahr/Ort)" |
| `acvb_jahr` / `acvb_ort` | text | bedingt | dito |
| `zielgefaess` | select+frei | ✔ | „hochgradiger LAD/RCA/RCX-Stenose" |
| `intervention` | select | ✔ | `PTCA` · `DES-Implantation` |
| `aufnahmegrund_freitext` | multiline | ✖ | „zur elektiv geplanten Koronarangiographie bei … / bekannter koronarer … Erkrankung" |
| `koro_befund` | multiline | ✔ | „Koronarangiographisch zeigte sich , welche …" |
| `dapt_monate` | select `6`/`12` | ✔ | „für 6/12 Monate" |
| `p2y12` | select | ✔ | „Aspirin und Clopidogrel" |
| `punktion_seite` | select `linke`/`rechte` | ✔ | „Die linke/rechte Leisten-/Radialisregion" |
| `punktion_region` | select `Leisten-`/`Radialis-` | ✔ | dito |
| `echo_verlauf` | checkbox | ✖ | „Außerdem sollten regelmäßige echokardiographische Verlaufskontrollen erfolgen." |

⚠ **Abweichende Zielwerte beachten:** In `Textbausteine_Kardio.docx` lautet der
Zielwert durchgängig **LDL < 70 mg/dl**, in `Musterarztbriefe_Med._I.docx`
**Ziel-LDL < 55 mg/dl**. Beide Werte bleiben in ihrer jeweiligen Vorlage
unverändert stehen; es wird **nicht** vereinheitlicht. Ebenso steht hier
„Aspirin", in M „ASS" – auch das bleibt quellentreu.

**Status:** 🔴

### 3.2 `acs_langform`

| Feld | Typ | Pflicht | Beleg |
| --- | --- | --- | --- |
| `acs_typ` | select `NSTEMI`/`STEMI` | ✔ | „N/STEMI" |
| `wand` | select `Vorder-`/`Hinter-` | ✔ | „der Vorder-/Hinterwand" |
| `zielgefaess` | select | ✔ | „Verschluss der LAD/RCX/RCA" |
| `infarkt_datum` | date | ✔ | |
| `intervention` | select | ✔ | `PTCA` · `DES-Implantation` |
| `ck_max` | number | ✖ | „Die maximale CK-Auslenkung lag bei XX U/l" |
| `sofortige_uebernahme` | checkbox | ✖ | „Bei einem STEMI erfolgte die sofortige Übernahme ins Herzkatheterlabor." |
| `intensiv_verlegung` | checkbox | ✖ | „Der Patient wurde anschließend auf die Intensivstation verlegt." |
| `medikation_erweitert` | multiselect | ✖ | `Ramipril` · `Bisoprolol` · `Atorvastatin` |
| `reperfusionsarrhythmien` | checkbox | ✖ | „waren Reperfusionsarrhythmien erkennbar, welche im Verlauf rückläufig waren" |
| `lz_ekg_befund` | multiline | ✖ | „durchgehender Sinusrhythmus ohne höhergradige Rhythmusstörungen" |
| `echo_befund` | multiline | ✖ | „Echokardiographisch zeigte sich … ." |
| `lz_rr_dipper` | select `Dipper`/`Non-Dipper` | ✖ | „(im Sinne eines Dipper/Non-Dipper)" |
| `p2y12` | select | ✔ | „ASS und Ticagrelor" |
| `dapt_monate` | number, default 12 | ✔ | „für 12 Monate" |
| `ahb_beantragt` | checkbox | ✖ | „beantragten wir über unseren Sozialdienst eine kardiologische AHB" |

**Procedere (5 belegte Zeilen)**, jede einzeln zuschaltbar, u. a.
„Ausreizen der Herzinsuffizienzmedikation nach Patientenverträglichkeit".

**Status:** 🔴

### 3.3 `schrittmacher_langform`

Zusätzlich zu 2.7:

| Feld | Typ | Pflicht | Beleg |
| --- | --- | --- | --- |
| `sm_firma` | select+frei | ✔ | `St. Jude Medical` · `Medtronic` |
| `indikationen` | multiselect | ✔ | `symptomatischer AV-Block III° mit Kammerersatzrhythmus` · `Sick-Sinus-Syndrom` · `paroxysmales Vorhofflimmern` |
| `sss_frequenz` | number | bedingt | „mit Frequenzen bis xx/min" |
| `fahrverbot` | select | ✔ | `3` · `6` · `12` Monate · `lebenslang` |
| `kontrolle_datum` / `kontrolle_uhrzeit` | date/time | ✔ | |
| `oak_pause_tage` | number, default 5 | ✖ | „Für 5 Tage … pausieren" |

**Feste Kontaktangabe (wörtlich):** „RoMed Klinikum Rosenheim, Medizinische
Klinik I, Kardiologie, Tel. Chefarztsekreteriat 08031/365 3101" – die
Schreibweise „Chefarztsekreteriat" steht so im Dokument (im CRT-D-Baustein
dagegen „Chefarztsekretariat"). Beide Schreibweisen bleiben quellentreu erhalten.

**Statisch:** „Ein Aggregat-Ausweis und eine Infobroschüre wurden dem Patienten
ausgehändigt."

**Status:** 🔴

### 3.4 `crt_d`

| Feld | Typ | Pflicht | Beleg |
| --- | --- | --- | --- |
| `aggregat` | text | ✔ | „Quadra Assura/Jude Medical" |
| `sn` | text | ✔ | |
| `kardiomyopathie_dd` | multiselect | ✔ | `dilatativ` · `ischämisch` |
| `implantation_datum` | date | ✔ | |
| `kontrolle_datum` / `kontrolle_uhrzeit` | date/time | ✔ | |
| `remarcumarisierung_datum` | date | ✖ | „Beginn der Remarcumarisierung ab dem XX.08.2018" |

**Statisch:** Indikationssatz „bei hochgradig eingeschränkter linksventrikulärer
Pumpfunktion und Asynchronie bei einem breiten Linksschenkelblock".

**Status:** 🔴

### 3.5 `kardiale_dekompensation`

| Feld | Typ | Pflicht | Beleg |
| --- | --- | --- | --- |
| `grunderkrankung` | text | ✔ | „Dekompensierte Herzinsuffizienz bei XX" |
| `ntprobnp` | number | ✖ | „Das NT-pro-BNP lag bei XX." |
| `diurese_verlauf` | radio | ✔ | `gutes Ansprechen (forciert)` · `ungenügendes Ansprechen → Perfusor` |
| `entlassgewicht` | number | ✔ | „(Entlassgewicht: XX kg)" |
| `mobilisiert_kg` | number | bedingt | „Insgesamt konnte XX kg mobilisiert werden." |
| `umstellung_torasemid` | checkbox | ✖ | „Wir stellten im Verlauf auf Torasemid um." |
| `lvef_grad` | select | ✖ | `leicht`/`mittel`/`hochgradig` → „XXgradig eingeschränkte LVEF" |
| `echo_befund` | multiline | ✖ | |
| `troponin_auslenkung` | checkbox | ✖ | „Die dezente Troponin-T-Auslenkung ist im Rahmen der Dekompensation zu werten." |

**Konditional:** Der Absatz „Eine gesteigerte diuretische Therapie mit Furosemid
i.v. bewirkte ein ungenügendes Ansprechen, sodass eine Furosemid-Gabe mittels
Perfusore eingeleitet wurde. …" ersetzt bei `diurese_verlauf == perfusor` den
Standardsatz „Unter einer forcierten diuretischen Therapie konnten …".
Nur in der Perfusor-Variante erscheinen „Insgesamt konnte XX kg mobilisiert
werden." und „Wir stellten im Verlauf auf Torasemid um."

**Procedere (4 feste Zeilen):** Nierenretentions-/Elektrolytkontrollen ·
tägliche Gewichtskontrollen · Flüssigkeitszufuhr max. 1,5 L · Ausreizen der
Herzinsuffizienztherapie.

**Status:** 🔴

### 3.6 `taa_vorhofflimmern`

Die längste Vorlage – sie besteht aus **acht wahlweise zuschaltbaren
Verlaufsabsätzen**:

| Absatz-Schalter | Typ | Beleg (Kurzform) |
| --- | --- | --- |
| `erstereignis` | select `erstmalig aufgetretenen`/`erstmalig diagnostizierten` | Eingangssatz |
| `oak_begonnen` (+ `oak_substanz`, `cha2ds2vasc`) | checkbox | „Bei einem CHADS-VASc-Score von XX begannen wir eine orale Antikoagulation mit XX." |
| `lz_ekg` (+ `vhf_mittlere_frequenz`, `taa_max_frequenz`) | checkbox | „Im Langzeit-EKG konnte ein Vorhofflimmern mit mittlerer Frequenz von XX/min nachgewiesen werden …" |
| `frequenzkontrolle` (+ `frequenz_substanz`) | checkbox | „… weshalb wir … von einer Elektrokardioversion absahen und uns auf eine Frequenzkontrolle mittels Digitoxin/Bisoprolol/Amiodaron beschränkten." |
| `ekv_durchgefuehrt` (+ `ekv_energie`, `ekv_rezidiv`, `amiodaron_aufsaettigung_g`) | checkbox | „Nach Ausschluss intracavitärer Thromben erfolgte die komplikationslose Elektrokardioversion mittels XX Joule …" |
| `koro_erfolgt` + `cmrt_erfolgt` | checkbox | „Daher erfolgte zum Ausschluss einer Myokardischämie eine Koronarangiographie. … Zur besseren Beurteilung … eine Cardio-MRT-Untersuchung." |
| `bd_eskalation` | checkbox | „Aufgrund von erhöhten Werten in der Langzeit-Blutdruckuntersuchung eskalierten wir die medikamentöse Blutdrucktherapie." |
| `diabetesberatung` | checkbox | „Bei initial erhöhten Blutzuckerwerten erfolgte eine Diabetes- und Ernährungsberatung." |

Der Amiodaron-Absatz zieht zwingend den Monitoring-Satz nach sich (EKG QTc
< 500 ms, Schilddrüsen-/Leber-/Lungenfunktion, Augenarzt).

**Status:** 🔴 – ohne konditionale Absätze in keiner Form abbildbar.

### 3.7 `lungenarterienembolie`

| Feld | Typ | Pflicht | Beleg |
| --- | --- | --- | --- |
| `lae_lokalisation` | select | ✔ | „Beidseitige Lungenarterienembolie" |
| `erstdiagnose` | checkbox | ✖ | „(ED)" |
| `reitender_thrombus_seite` | select `rechten`/`linken` | ✖ | „reitendem Thrombus in der rechten/linken A. pulmonalis" |
| `partialinsuffizienz` | checkbox | ✖ | „Respiratorische Partialinsuffizienz" |
| `ueberwachung_ort` | select `internistische Intensivstation`/`CPU` | ✖ | |
| `echo_befund` | multiline | ✖ | „Echokardiographisch fand sich eine " |
| `tvt_ausgeschlossen` | checkbox | ✖ | „Eine tiefe Beinvenenthrombose konnte sonographisch ausgeschlossen werden." |
| `oak_substanz` | select+frei | ✔ | `Apixaban` (Belegwert) |
| `ereignis_typ` | select `unprovoziert`/`provoziert` | ✔ | „Bei einem unprovozierten Ereignis" |
| `oak_monate` | select `3`/`6` | ✔ | „für insgesamt 3/6 Monate" |
| `kompressionsstruempfe` | checkbox | ✖ | „Antithrombosestrümpfe der Klasse II wurden verordnet." |

**Status:** 🟠 – `lae` (tot) formuliert alles frei neu („Kompressionsstrümpfe
Klasse II" statt „Antithrombosestrümpfe der Klasse II") und lässt den gesamten
Verlauf weg.

### 3.8 `hypertensive_krise`

| Feld | Typ | Pflicht | Beleg |
| --- | --- | --- | --- |
| `rr_max` | number | ✔ | „Hypertensive Krise bis max. XX mmHg" |
| `akuttherapie` | text | ✔ | „Nach initialer Blutdrucksenkung mit XX" |
| `therapie_fortgefuehrt` | checkbox | ✖ | „Auf eine weitere antihypertensive Therapie verzichteten wir deshalb vorerst." |
| `lz_rr_befund` | select | ✔ | „tagsüber leicht hypertone Durchschnittswerte" |
| `abklaerung_cushing` | checkbox | ✖ | Cortisol/ACTH, Dexamethasonhemmtest |
| `abklaerung_phaeo` | checkbox | ✖ | Metanephrine im Plasma |
| `abklaerung_nierenarterie` | checkbox | ✖ | Duplexsonographie, ggf. MRT-Angiographie |
| `abklaerung_hyperaldo` | checkbox | ✖ | Aldosteron/Renin, ARQ erhöht → Kochsalzbelastungstest |

Jeder der vier Abklärungsschalter aktiviert einen vollständigen, wörtlich
übernommenen Absatz. 🔴

### 3.9 `klappenoperation`

| Feld | Typ | Pflicht | Beleg |
| --- | --- | --- | --- |
| `klappe` | select | ✔ | `Aortenklappenstenose` (Belegwert) |
| `koef` / `ef_prozent` | number | ✔ | „Echokardiographisch KÖF … cm2, EF …%" |
| `lv_funktion` / `diast_funktion` | text | ✖ | „… LV-Funktion, … diastolische Funktion" |
| `aufnahmegrund` | text | ✔ | „aufgrund von Schwindel und präsynkopalen Ereignissen" |
| `auskultation` | checkbox | ✖ | „Systolikum mit Punktum maximum im 2.ICR parasternal rechts ohne eindeutige Fortleitung" |
| `aufnahme_extern_datum` / `op_datum` | date | ✔ | „Aufnahmetermin in der Schön Klinik Vogtareuth am XX zur Klappenoperation am XX" |
| `praeop_nnh` / `praeop_abdomen` / `praeop_lufu` / `praeop_zahnarzt` | checkbox | ✖ | vier einzeln belegte Vorbereitungssätze |

**Fester Kooperationspartner:** „Schön Klinik Vogtareuth". 🔴

### 3.10 `bypass_op`

Analog 3.9, Diagnose „Schwere koronare 1/2/3-Gefäßerkrankung (mit ACVB
Situation, Jahr/Ort) mit hochgradiger LAD/RCA/RCX-Stenose mit Bypass-Indikation",
zusätzlich `lvef_grad`, Punktionsstellen-Satz, ohne NNH-/Zahnarzt-Sätze. 🔴

### 3.11 `kardioversion_ambulant`

| Feld | Typ | Pflicht | Beleg |
| --- | --- | --- | --- |
| `ekv_erfolg` | select `Erfolgreiche`/`Frustrane` | ✔ | „Erfolgreiche/Frustrane elektrische Kardioversion" |
| `ekv_anzahl` | number, default 1 | ✔ | „mit 1x XX J" |
| `ekv_energie` | number | ✔ | |
| `vhf_typ` | select | ✔ | `persistierendem Vorhofflimmern` |
| `cha2ds2vasc` | number | ✔ | „CHADS-VASc-Score XX" |
| `oak_substanz` | text | ✔ | „OAK mit XX" |

**Statisch:** „Am selben Tag konnten wir den Patienten in stabilem und
beschwerdefreiem Zustand wieder in Ihre geschätzte ambulante ärztliche
Weiterbehandlung entlassen …" (Tagesklinik – abweichende Entlassformel!) 🔴

### 3.12 `epu_bei_vhf`

Enthält als einzige T-Vorlage einen **vorformulierten Anamnese-Absatz**:
„Die Aufnahme erfolgte zur Pulmonalvenenisolation (Kryoablation). Herr .. klagt
über eine einschränkende Belastbarkeit und Belastungsdyspnoe durch das bekannte
Vorhofflimmern beziehungsweise im Rahmen seiner hypertensiven Herzerkrankung.
Bereits im letzten Aufenthalt war die PVI geplant, wurde nach der
Koronarangiografie mit DES Implantation auf einen späteren Termin verschoben."

Der körperliche Untersuchungsbefund weicht ab: **„arrhythmisch"** statt
„rhythmisch". Felder: `vhf_typ`, `ehra`, `cha2ds2vasc`, `aktueller_rhythmus`
(select `Vorhofflimmern`/`Sinusrhythmus`), `epu_datum`, `ablation_art`,
`punktion_seite`. 🔴

### 3.13 `copd_exazerbation`

| Feld | Typ | Pflicht | Beleg |
| --- | --- | --- | --- |
| `gold_stadium` | select `I`–`IV`, mehrfach | ✔ | „COPD GOLD II-III" |
| `fev1_liter` / `fev1_prozent` | number | ✔ | „aktuelle FEV1 1,33L (50,2%)" |
| `emphysem` | checkbox | ✖ | „zentrilobuläres Lungenemphysem" |
| `o2_nacht_lmin` | number | ✖ | „nächtliche O2-Substitution mit 3 l O2/min, tagsüber keine Sauerstofftherapie" |
| `antibiose` | text | ✔ | `Ampicillin/Sulbactam` (Belegwert) |
| `blutkulturen_negativ` | checkbox | ✖ | „kein Keimwachstum" |
| `kortison_dosis_aktuell` / `kortison_zieldosis` | number | ✖ | „auf eine Tagesdosis von 20mg reduziert, wir bitten um weitere Reduktion bis 10mg" |
| `torasemid_reduziert` | checkbox | ✖ | |
| `mobilisation_hilfsmittel` | text | ✖ | „am Rollator" |
| `ahb_ort` / `ahb_datum` | text/date | ✖ | „Anschlussheilbehandlung in Schönau … ab 17.09.2018" |

🔴 – vollständig außerhalb des bisherigen Kardio-Fokus, aber im Quelldokument
enthalten und daher zu übernehmen.

### 3.14 `pneumonie`

Diagnosen: „Schwere septische Pneumonie im rechten Unterlappen,
community-aquired" (Schreibweise wörtlich), „Z.n. Pneumonie im Herbst 2018",
„Akutes Nierenversagen dd chronische Niereninsuffizienz, Verlaufskontrolle
empfohlen", „Allergien: Penicillin".
Felder: `lokalisation`, `erworben` (select `community-aquired`/`nosokomial`),
`antibiose` (multiselect `Clarithromycin`/`Ceftriaxon`), `antibiose_tage`,
`ventilationsstoerung`, `pleuraerguss` (checkbox), `allergien` (text). 🔴

### 3.15 `lungenkarzinom_staging`

Diagnose wörtlich: „Gering differenziertes Adenokarzinom des rechten
Lungenoberlappenostiums (ED 06/2019), G3, cT4N3M1a Stadium IV A nach UICC8".
Felder: `histologie`, `lokalisation`, `ed_monat`, `grading`, `tnm`, `uicc`,
`pdl1_prozent`, `pleuraerguss_malign`, `metastasen` (**list**),
`tumormarker` (**list** mit `name`/`wert`/`einheit`/`referenz`),
`punktion_datum`, `punktion_menge_ml`, `bronchoskopie_befund`. 🔴

### 3.16 `todesfall_palliativ`

Sensible Sonderform mit nur zwei Abschnitten (Zusammenfassung und Verlauf).
Einleitung wörtlich: „Mit Bedauern müssen wir Ihnen vom Tode unserer
gemeinsamen {Patienten/Patientin}, {Anrede Vorname Nachname} berichten."
Abschluss: „Frau May verstarb hierunter friedlich am 23.11.18. Wir bedauern
diesen Verlauf."
Felder: `vorstellung_datum`, `vorstellung_grund`, `befunde_verlauf` (multiline),
`antibiose_initial`, `antibiose_eskalation`, `infektfokus`,
`therapielimitation` (checkbox), `todesdatum` (date). 🔴

---

## 4. Bausteinbibliothek (`Textbausteine_Kardio.docx`, Blöcke ohne eigenen Brief)

Diese 21 Blöcke sind **keine** vollständigen Briefe, sondern wiederverwendbare
Absätze. Sie werden als eigene Bibliothek geführt und lassen sich in jeden
Abschnitt einfügen.

| ID | Baustein | Felder (Auswahl) | Typ |
| --- | --- | --- | --- |
| `veg_anamnese` | Vegetative Anamnese (Volltext, 6 Sätze) | — | statisch |
| `ku_ausfuehrlich` | Körperlicher Untersuchungsbefund, ausführlich (Cor/Pulmo/Abdomen) | `alter`, `groesse_cm`, `gewicht_kg` | text+number |
| `ku_kurz` | Körperlicher Untersuchungsbefund, Kurzform | dito, `rhythmus` (`rhythmisch`/`arrhythmisch`) | select |
| `lz_rr` | Langzeit-RR | `datum`, `gesamt_sys/dia`, `max_sys`, `max_dia`, `tag_sys/dia`, `tag_ueber135`, `tag_ueber85`, `nacht_sys/dia`, `nacht_ueber125`, `nacht_ueber80`, `dipping` | date/number/select |
| `lz_ekg` | Langzeit-EKG (2 belegte Varianten) | `datum`, `grundrhythmus`, `hf_mittel`, `hf_min`, `hf_max` | date/select/number |
| `ekg_aufnahme` | EKG bei Aufnahme | `rhythmus`, `hf`, `lagetyp`, `rs_umschlag_von/bis` | select/number |
| `belastungs_ekg` | Belastungs-EKG | `datum`, `abbruchgrund`, `watt`, `hf_max`, `rr_max`, `bewertung` | date/text/number/select |
| `lufu` | Lungenfunktionsdiagnostik | `fev1_l`, `fev1_pct`, `fev1_vc`, `mef50_l`, `mef50_pct`, `reff`, `tlc_l`, `tlc_pct`, `rv_tlc`, `obstruktion`, `blaehung`, `restriktion` | number/select |
| `bga` | Blutgasanalyse | `o2_lmin`, `ph`, `pco2`, `po2`, `be`, `hco3`, `sao2`, `beurteilung` | number/multiline |
| `abdomensono` | Abdomensonographie (2 Varianten: Kurztabelle + Fließtext) | 9 Organfelder | multiline |
| `ukg` | UKG-Standardbefund (Normalbefund, 6 Zeilen) | — | statisch |
| `tte` / `tee` / `koro` / `rx_thorax` / `rx_nnh` / `duplex_carotis` / `schellong` | Befundüberschriften mit Datum | `datum`, `befund` | date/multiline |
| `aszitespunktion` | Aszitespunktion | `menge_l`, `albumin_ml` | number |
| `pleurapunktion` | Sonographie Pleura mit Punktion | `seite`, `menge_ml`, `aspekt` | select/number/text |
| `zvk_anlage` | ZVK-Anlage | `seite`, `lumina` | select/number |
| `thoraxdrainage` | Thoraxdrainageanlage | `seite`, `groesse_cha`, `menge_ml` | select/number |
| `procedere_bausteine` | 7 freistehende Procedere-Zeilen (Nierenretention, Ziel-LDL < 70, Kontrollkoronarangiographie, HK-Termin, Heparin-Bridging, Amiodaron-Monitoring, Prednisolon-Ausschleichschema) | je nach Zeile | gemischt |

🔴 Für all das existiert im Prototyp **kein** Konzept – weder Speicherung noch
Einfügemechanismus.

---

## 5. Zusammenfassung des Handlungsbedarfs

| Anforderung | Prototyp | Notwendige Engine-Fähigkeit |
| --- | --- | --- |
| 23 Vorlagen | 1 erreichbar (+8 tot) | Datenmodell, Vorlagenübernahme |
| bis zu 9 Abschnitte je Brief | 3 feste | frei definierbare, sortierbare Abschnitte |
| 11 Feldtypen | 4 funktionierende | vollständiges Feldtyp-Rendering |
| Konditionale Absätze (≈70 Belegstellen) | keine | `{{#if}} / {{else}} / {{#unless}}` + sicherer Ausdrucksparser |
| Genusabhängige Formulierungen | keine | abgeleitete Variablen aus `anrede` |
| Singular/Plural | keine | Bedingung auf Zahlenfeldern |
| Wiederholgruppen (Diagnosen, Stents, Vorbehandlungen, Metastasen, Tumormarker, Medikation) | keine | `{{#each}}` + Listen-UI mit Hinzufügen/Entfernen/Sortieren |
| Saubere Interpunktion bei leeren Optionalwerten | keine | Cleanup-Stufe nach dem Rendern |
| Bausteinbibliothek (21 Blöcke) | keine | eigene Bibliothek + Einfügefunktion |
| Manuelle Nachbearbeitung des Briefs | Felder `readonly` | editierbare Ausgabe + Dirty-Tracking |
| Editor: anlegen/duplizieren/löschen/exportieren | nur überschreiben | vollständiges CRUD + Validierung |
| XSS-Sicherheit | `innerHTML` mit Daten | DOM-API + CSP |
| Tests | keine | `node:test`-Suite |
