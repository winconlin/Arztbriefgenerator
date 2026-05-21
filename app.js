const SYNONYMS = {
  showed: ["zeigte sich", "imponierte", "stellte sich dar", "fand sich"],
  admitted: ["wurde stationär aufgenommen", "stellte sich stationär vor"],
  uncomplicated: ["komplikationslos", "ohne prozedurbezogene Komplikationen"],
};

function pick(words, mode = "konservativ") {
  if (!Array.isArray(words) || words.length === 0) return "";
  if (mode === "konservativ") return words[0];
  const i = Math.floor(Math.random() * words.length);
  return words[i];
}


function sexDischarge(title) {
  return title === "Herr" ? "Herrn" : "Frau";
}

function oacDuration(score, low, high) {
  return Number(score) >= 2 ? high : low;
}

function patientSetting(name) {
  return name && name.trim() ? name.trim() : "Der Patient";
}

const scenarios = [
  {
    id: "acs_pci",
    title: "ACS-PCI (hausstandard)",
    fields: [
      { key: "patientTitle", label: "Anrede", type: "select", options: ["Herr", "Frau"], default: "Herr" },
      { key: "patient", label: "Patient", type: "text", default: "Mustermann" },
      { key: "acsType", label: "ACS-Typ", type: "select", options: ["STEMI", "NSTEMI", "Instabile AP"], default: "NSTEMI" },
      { key: "vesselDisease", label: "1/2/3-Gefäßerkrankung", type: "select", options: ["1", "2", "3"], default: "2" },
      { key: "lesion", label: "Läsion", type: "select", options: ["hochgradige Stenose", "Verschluss"], default: "hochgradige Stenose" },
      { key: "vessel", label: "Zielgefäß", type: "select", options: ["LAD", "RCA", "RCX"], default: "LAD" },
      { key: "stentCount", label: "DE-Stents", type: "number", default: "1" },
      { key: "telemetryDays", label: "Telemetrie (Tage)", type: "number", default: "2" },
      { key: "rhythm", label: "Rhythmusereignisse", type: "text", default: "keine höhergradigen Rhythmusstörungen" },
      { key: "echo", label: "Echo", type: "text", default: "leichtgradig eingeschränkte LV-Funktion" },
      { key: "ck", label: "CK max (bei STEMI)", type: "text", default: "" },
      { key: "p2y12", label: "P2Y12", type: "select", options: ["Clopidogrel", "Prasugrel", "Ticagrelor"], default: "Ticagrelor" },
      { key: "access", label: "Punktionsstelle", type: "text", default: "A. radialis rechts" },
      { key: "ldl", label: "LDL-Ziel", type: "text", default: "<55 mg/dl" },
      { key: "date", label: "Entlassdatum", type: "text", default: "21.05.2026" }
    ],
    build: (d) => {
      const ckSentence = d.acsType === "STEMI" && d.ck ? ` Die maximale CK-Auslenkung lag bei ${d.ck}.` : "";
      return {
        diagnosen: `${d.acsType} bei koronarer ${d.vesselDisease}-Gefäßerkrankung mit ${d.lesion} der ${d.vessel}.
- Aktuell: DE-Stent-PCI (${d.stentCount} Stent) der ${d.vessel}.`,
        epikrise: `${d.patientTitle} ${d.patient} wurde mit akutem Koronarsyndrom auf unsere Chest-Pain-Unit aufgenommen. Koronarangiographisch imponierte eine koronare ${d.vesselDisease}-Gefäßerkrankung mit ${d.lesion} der ${d.vessel}, welche in gleicher Sitzung komplikationslos mit PCI und Implantation von ${d.stentCount} DE-Stent(s) rekanalisiert wurde.${ckSentence} Während der telemetrischen EKG-Überwachung über ${d.telemetryDays} Tage waren ${d.rhythm} auffällig. Echokardiographisch zeigte sich ${d.echo}. Eine duale Thrombozytenaggregationshemmung mit ASS und ${d.p2y12} ist für 12 Monate indiziert, anschließend eine lebensbegleitende Monotherapie. Die punktierte ${d.access} präsentierte sich am Entlasstag klinisch reizlos; die periphere Durchblutung, Sensibilität und Motorik waren allzeit intakt. Wir entlassen ${sexDischarge(d.patientTitle)} ${d.patient} am ${d.date} in gutem Allgemeinzustand in sein/ihr häusliches Umfeld und die weitere fachärztliche Betreuung.`,
        procedere: `- Duale Thrombozytenaggregationshemmung mit ASS und ${d.p2y12} für 12 Monate, anschließend Monotherapie
- Optimale Einstellung der kardiovaskulären Risikofaktoren, Ziel-LDL ${d.ldl}
- Kardiologische Anbindung mit regelmäßigen echokardiographischen Verlaufskontrollen`
      };
    }
  },
  {
    id: "elective_pci",
    title: "Elektive Koronarangiographie / PCI (hausstandard)",
    fields: [
      { key: "patient", label: "Patient", type: "text", default: "Der Patient" },
      { key: "vesselDisease", label: "1/2/3-Gefäßerkrankung", type: "select", options: ["1", "2", "3"], default: "2" },
      { key: "acvb", label: "ACVB-Situation", type: "text", default: "keine" },
      { key: "lesion", label: "Koronarbefund", type: "text", default: "hochgradige LAD-Stenose" },
      { key: "intervention", label: "Intervention", type: "text", default: "PTCA/DES-Implantation" },
      { key: "p2y12", label: "P2Y12", type: "select", options: ["Clopidogrel", "Prasugrel", "Ticagrelor"], default: "Clopidogrel" },
      { key: "daptMonths", label: "DAPT-Monate", type: "number", default: "6" },
      { key: "access", label: "Punktionsstelle", type: "text", default: "A. radialis rechts" },
      { key: "ldl", label: "LDL-Ziel", type: "text", default: "<55 mg/dl" },
      { key: "date", label: "Entlassdatum", type: "text", default: "21.05.2026" }
    ],
    build: (d) => ({
      diagnosen: `Koronare ${d.vesselDisease}-Gefäßerkrankung${d.acvb !== "keine" ? ` (ACVB: ${d.acvb})` : ""} mit ${d.lesion}.
- Aktuell: ${d.intervention}.`,
      epikrise: `${patientSetting(d.patient)} wurde zur elektiv geplanten Koronarangiographie stationär aufgenommen. Koronarangiographisch fand sich eine koronare ${d.vesselDisease}-Gefäßerkrankung mit ${d.lesion}, welche in gleicher Sitzung mittels ${d.intervention} versorgt wurde. Der postinterventionelle Verlauf gestaltete sich komplikationslos. Aufgrund der Stentimplantation empfehlen wir eine duale Plättchenhemmung mit ASS und ${d.p2y12} für ${d.daptMonths} Monate, anschließend eine lebenslange Monotherapie. Die punktierte ${d.access} zeigte sich am Entlasstag reizlos bei intakter peripherer DMS. Am ${d.date} konnten wir den Patienten in stabilem und beschwerdefreiem Zustand in Ihre geschätzte ambulante ärztliche Weiterbehandlung entlassen und stehen für Rückfragen gerne zur Verfügung.`,
      procedere: `- DAPT mit ASS und ${d.p2y12} für ${d.daptMonths} Monate, anschließend Monotherapie
- Optimale Risikofaktoreinstellung, Ziel-LDL ${d.ldl}
- Verlaufskontrollen inklusive Echokardiographie`
    })
  },
  {
    id: "device",
    title: "Device (PM/ICD/CRT-P/CRT-D/LifeVest)",
    fields: [
      { key: "patient", label: "Patient", type: "text", default: "Der Patient" },
      { key: "deviceType", label: "Device-Typ", type: "select", options: ["1-Kammer-Schrittmacher", "2-Kammer-Schrittmacher", "ICD", "CRT-P", "CRT-D", "LifeVest"], default: "CRT-D" },
      { key: "maker", label: "Firma/Aggregat", type: "text", default: "St. Jude Medical / Quadra Assura" },
      { key: "mode", label: "Modus", type: "text", default: "DDD" },
      { key: "sn", label: "SN", type: "text", default: "XX" },
      { key: "indication", label: "Indikation", type: "text", default: "symptomatischer AV-Block III° / Kardiomyopathie" },
      { key: "followup", label: "Kontrolltermin", type: "text", default: "03.06.2026, 10:00 Uhr, Device-Ambulanz" },
      { key: "date", label: "Entlassdatum", type: "text", default: "21.05.2026" }
    ],
    build: (d) => ({
      diagnosen: `Implantation eines ${d.deviceType}-Systems (Firma/Aggregat: ${d.maker}, Modus: ${d.mode}, SN: ${d.sn}) bei ${d.indication}.`,
      epikrise: `${patientSetting(d.patient)} wurde zur elektiven Device-Implantation stationär aufgenommen. Am Aufnahmetag erfolgte die komplikationslose Implantation eines ${d.deviceType}-Systems. Radiomorphologisch zeigte sich im Röntgen-Thorax eine regelrechte Aggregat- und Sondenlage ohne Hinweis auf Pneumothorax. In der abschließenden Device-Kontrolle fand sich eine regelrechte Funktion mit unauffälligen Sondenmesswerten. Das Nahtmaterial soll bei regelmäßiger Wundkontrolle nach 8–10 Tagen entfernt werden. Ein Aggregatausweis wurde ausgehändigt. Wir entlassen den Patienten am ${d.date} in kardiopulmonal stabilem Zustand in die ambulante Weiterbehandlung.`,
      procedere: `- Regelmäßige Wundkontrollen, Fadenzug in 8–10 Tagen
- Wiedervorstellung zur Device-Erstkontrolle am ${d.followup}
- Bei OAK: Wiederbeginn nach individuellem Blutungsrisiko`
    })
  },
  {
    id: "valve",
    title: "Klappe (TAVI/OP/M-TEER/T-TEER)",
    fields: [
      { key: "patient", label: "Patient", type: "text", default: "Der Patient" },
      { key: "path", label: "Pfad", type: "select", options: ["TAVI", "Operativer Klappenersatz", "M-TEER", "T-TEER"], default: "TAVI" },
      { key: "dx", label: "Diagnose", type: "text", default: "hochgradige Aortenklappenstenose" },
      { key: "koef", label: "KÖF", type: "text", default: "0,8 cm²" },
      { key: "pmean", label: "pmean", type: "text", default: "45 mmHg" },
      { key: "opv", label: "OPV-Befunde", type: "text", default: "kein Anhalt für Kontraindikationen" },
      { key: "date", label: "Entlass-/Verlegungsdatum", type: "text", default: "21.05.2026" }
    ],
    build: (d) => ({
      diagnosen: `${d.dx} mit Indikation zu ${d.path}; KÖF ${d.koef}, pmean ${d.pmean}.`,
      epikrise: `${patientSetting(d.patient)} stellte sich mit symptomatischem Klappenvitium stationär vor. Echokardiographisch imponierte ${d.dx} (KÖF ${d.koef}, pmean ${d.pmean}). Nach interdisziplinärer Evaluation wurde die Indikation zu ${d.path} gestellt. Die präoperative bzw. präinterventionelle Vorbereitung erfolgte gemäß OPV-Standard; es ergaben sich ${d.opv}. Der weitere Verlauf gestaltete sich stabil, sodass der Patient am ${d.date} in gutem Allgemeinzustand in die weitere fachärztliche Betreuung bzw. zur Weiterbehandlung entlassen/verlegt werden konnte.`,
      procedere: `- Weiteres Procedere gemäß ${d.path}-Pfad
- Terminierung über Heart-Team / Zentrum
- Fortführung der leitliniengerechten Begleittherapie`
    })
  },
  {
    id: "lae",
    title: "Lungenarterienembolie",
    fields: [
      { key: "patient", label: "Patient", type: "text", default: "Der Patient" },
      { key: "distribution", label: "Lokalisation", type: "select", options: ["beidseitige", "rechtsseitige", "linksseitige"], default: "beidseitige" },
      { key: "thrombus", label: "Reitender Thrombus", type: "select", options: ["nein", "rechts", "links"], default: "nein" },
      { key: "resp", label: "Respiratorische Situation", type: "text", default: "respiratorische Partialinsuffizienz" },
      { key: "thrombectomy", label: "Thrombektomie", type: "select", options: ["nein", "ja"], default: "nein" },
      { key: "anticoag", label: "Antikoagulation", type: "text", default: "Heparinperfusor, NMH, anschließend Apixaban" },
      { key: "duration", label: "OAK-Dauer", type: "text", default: "3–6 Monate" },
      { key: "date", label: "Entlassdatum", type: "text", default: "21.05.2026" }
    ],
    build: (d) => {
      const thrombus = d.thrombus === "nein" ? "" : ` mit reitendem Thrombus in der ${d.thrombus}en A. pulmonalis`;
      const thrombectomyText = d.thrombectomy === "ja" ? "Aufgrund der Risikokonstellation erfolgte ergänzend eine interventionelle Thrombektomie." : "Eine interventionelle Thrombektomie war nicht erforderlich.";
      return {
        diagnosen: `${d.distribution} Lungenarterienembolie${thrombus} bei ${d.resp}.`,
        epikrise: `${patientSetting(d.patient)} wurde bei progredienter Dyspnoe stationär aufgenommen. In der CT-Angiographie des Thorax zeigte sich eine ${d.distribution} Lungenarterienembolie${thrombus}. ${thrombectomyText} Zur engmaschigen Überwachung erfolgte initial die intensivierte Monitorüberwachung. Nach initialer Heparinisierung wurde die Antikoagulation stufenweise auf ${d.anticoag} umgestellt. Der klinische Verlauf war stabil, sodass wir den Patienten am ${d.date} in gutem Allgemeinzustand in die ambulante Weiterbehandlung entlassen konnten.`,
        procedere: `- Fortführung der Antikoagulation (${d.anticoag})
- Empfohlene OAK-Dauer: ${d.duration}
- Klinische und ggf. angiologische Verlaufskontrollen`
      };
    }
  },
  {
    id: "heart_failure",
    title: "Kardiale Dekompensation",
    fields: [
      { key: "patient", label: "Patient", type: "text", default: "Der Patient" },
      { key: "cause", label: "Grunddiagnose", type: "text", default: "Herzinsuffizienz" },
      { key: "ntprobnp", label: "NT-pro-BNP", type: "text", default: "4500 pg/ml" },
      { key: "diuresis", label: "Diureseverlauf", type: "text", default: "forcierte diuretische Therapie mit guter Negativbilanz" },
      { key: "weight", label: "Gewichtsmobilisation", type: "text", default: "3 kg" },
      { key: "echo", label: "Echo", type: "text", default: "mittelgradig eingeschränkte LVEF" },
      { key: "date", label: "Entlassdatum", type: "text", default: "21.05.2026" }
    ],
    build: (d) => ({
      diagnosen: `Kardiale Dekompensation bei ${d.cause}.`,
      epikrise: `${patientSetting(d.patient)} wurde bei kardialer Dekompensation und Dyspnoe stationär aufgenommen. Klinisch und radiologisch imponierten Zeichen der Volumenüberlastung. Das NT-pro-BNP lag bei ${d.ntprobnp}. Unter ${d.diuresis} konnte eine deutliche Beschwerdebesserung und suffiziente Negativbilanz erreicht werden (mobilisiertes Gewicht: ${d.weight}). Echokardiographisch zeigte sich ${d.echo}. Im weiteren Verlauf stabilisierte sich die kardiorespiratorische Situation, sodass die Entlassung am ${d.date} in gutem Allgemeinzustand erfolgen konnte.`,
      procedere: `- Tägliche Gewichtskontrollen
- Flüssigkeitszufuhr max. 1,5 l/Tag
- Regelmäßige Elektrolyt- und Nierenfunktionskontrollen
- Ausreizen der leitliniengerechten Herzinsuffizienztherapie`
    })
  },
  {
    id: "taa_vhf",
    title: "TAA bei Vorhofflimmern",
    fields: [
      { key: "patient", label: "Patient", type: "text", default: "Der Patient" },
      { key: "chadsvasc", label: "CHA2DS2-VASc", type: "number", default: "2" },
      { key: "oak", label: "OAK", type: "text", default: "Apixaban" },
      { key: "lzekg", label: "LZ-EKG", type: "text", default: "Vorhofflimmern mit mittlerer Frequenz 110/min, TAA bis 160/min" },
      { key: "strategy", label: "Strategie", type: "text", default: "Frequenzkontrolle" },
      { key: "date", label: "Entlassdatum", type: "text", default: "21.05.2026" }
    ],
    build: (d) => ({
      diagnosen: `Tachyarrhythmisches Vorhofflimmern bei CHA2DS2-VASc-Score ${d.chadsvasc}.`,
      epikrise: `${patientSetting(d.patient)} wurde bei tachyarrhythmischem Vorhofflimmern stationär aufgenommen. Bei einem CHA2DS2-VASc-Score von ${d.chadsvasc} wurde eine orale Antikoagulation mit ${d.oak} initiiert. Im Langzeit-EKG zeigte sich ${d.lzekg}. Nach Evaluation wurde eine ${d.strategy} etabliert. Der weitere Verlauf war hämodynamisch stabil; der Patient konnte am ${d.date} in gutem Allgemeinzustand in die ambulante Weiterbehandlung entlassen werden.`,
      procedere: `- Fortführung der oralen Antikoagulation mit ${d.oak}
- Rhythmologische Verlaufskontrollen
- Echokardiographische Verlaufsbeurteilungen`
    })
  },
  {
    id: "cardioversion",
    title: "Elektrische Kardioversion",
    fields: [
      { key: "patientTitle", label: "Anrede", type: "select", options: ["Herr", "Frau"], default: "Herr" },
      { key: "patient", label: "Patient", type: "text", default: "Mustermann" },
      { key: "arrhythmia", label: "Rhythmusdiagnose", type: "text", default: "persistierendes Vorhofflimmern" },
      { key: "ehra", label: "EHRA", type: "text", default: "III" },
      { key: "chadsvasc", label: "CHA2DS2-VASc", type: "number", default: "2" },
      { key: "hasbled", label: "HAS-BLED", type: "number", default: "1" },
      { key: "joule", label: "Energie", type: "text", default: "200 J biphasisch" },
      { key: "result", label: "Ergebnis", type: "select", options: ["erfolgreich", "frustran"], default: "erfolgreich" },
      { key: "oak", label: "OAK", type: "text", default: "Apixaban" },
      { key: "date", label: "Entlassdatum", type: "text", default: "21.05.2026" }
    ],
    build: (d) => {
      const duration = oacDuration(d.chadsvasc, "für vier Wochen", "dauerhaft");
      const outcome = d.result === "erfolgreich" ? "anhaltend ein normfrequenter Sinusrhythmus" : "persistierend Vorhofflimmern";
      return {
        diagnosen: `${d.arrhythmia}, EHRA ${d.ehra}, CHA2DS2-VASc ${d.chadsvasc}, HAS-BLED ${d.hasbled}.
- Aktuell: ${d.result}e elektrische Kardioversion mit ${d.joule}.`,
        epikrise: `${d.patientTitle} ${d.patient} stellte sich mit symptomatischem ${d.arrhythmia} stationär vor. Nach dem Ausschluss intracavitärer Thromben in einer transösophagealen Echokardiographie erfolgte ${d.result === "erfolgreich" ? "komplikationslos" : "unter adäquatem Schockprotokoll"} die elektrische Kardioversion mit ${d.joule}. Im weiteren Verlauf zeigte sich ${outcome}. Bei einem CHA2DS2-VASc-Score von ${d.chadsvasc} ist eine orale Antikoagulation ${duration} indiziert. Wir entlassen ${sexDischarge(d.patientTitle)} ${d.patient} am ${d.date} in gutem Allgemeinzustand in die weitere fachärztliche Betreuung.`,
        procedere: `- Fortführung der OAK mit ${d.oak} ${duration}
- Rhythmologische Wiedervorstellung`
      };
    }
  },
  {
    id: "pvi",
    title: "Pulmonalvenenisolation (EPU bei VHF)",
    fields: [
      { key: "patientTitle", label: "Anrede", type: "select", options: ["Herr", "Frau"], default: "Herr" },
      { key: "patient", label: "Patient", type: "text", default: "Mustermann" },
      { key: "afType", label: "VHF-Typ", type: "select", options: ["Paroxysmal", "Persistierend", "Kurz-persistierend"], default: "Persistierend" },
      { key: "ehra", label: "EHRA", type: "text", default: "III" },
      { key: "chadsvasc", label: "CHA2DS2-VASc", type: "number", default: "1" },
      { key: "hasbled", label: "HAS-BLED", type: "number", default: "1" },
      { key: "method", label: "Methode", type: "select", options: ["Kryo-Ballon", "Radiofrequenzablation", "Pulsed Field Ablation"], default: "Kryo-Ballon" },
      { key: "groinSide", label: "Punktionsseite", type: "select", options: ["links", "rechts", "beidseits"], default: "beidseits" },
      { key: "date", label: "Entlassdatum", type: "text", default: "21.05.2026" }
    ],
    build: (d) => {
      const duration = oacDuration(d.chadsvasc, "für drei Monate", "dauerhaft");
      const ppiSentence = d.method === "Pulsed Field Ablation" ? "" : " Ergänzend ist eine PPI-Therapie in doppelter Standarddosis für vier Wochen nach PVI zu empfehlen.";
      const groinSentence = d.groinSide === "beidseits"
        ? "Die beidseits punktierten Vv. femorales sind am Entlasstag inspektorisch und palpatorisch reizlos; die periphere Durchblutung, Sensibilität und Motorik waren allzeit intakt."
        : `Die punktierte V. femoralis ${d.groinSide} ist am Entlasstag inspektorisch und palpatorisch reizlos; die periphere Durchblutung, Sensibilität und Motorik waren allzeit intakt.`;
      return {
        diagnosen: `${d.afType}es Vorhofflimmern, EHRA ${d.ehra}, CHA2DS2-VASc ${d.chadsvasc}, HAS-BLED ${d.hasbled}.
- Aktuell: erfolgreiche Pulmonalvenenisolation mittels ${d.method}.`,
        epikrise: `${d.patientTitle} ${d.patient} stellte sich mit symptomatischem ${d.afType.toLowerCase()}em Vorhofflimmern stationär vor. Nach dem Ausschluss intracavitärer Thromben in einer transösophagealen Echokardiographie erfolgte komplikationslos die elektrophysiologische Untersuchung mit erfolgreicher Isolation aller Pulmonalvenen mittels ${d.method}. Der weitere Aufenthalt gestaltete sich unauffällig, in seriellen echokardiographischen Kontrollen konnte postinterventionell ein Perikarderguss ausgeschlossen werden. Bei einem CHA2DS2-VASc-Score von ${d.chadsvasc} ist eine orale Antikoagulation ${duration} indiziert.${ppiSentence} ${groinSentence} Wir entlassen ${sexDischarge(d.patientTitle)} ${d.patient} am ${d.date} in gutem Allgemeinzustand in sein/ihr häusliches Umfeld und die weitere fachärztliche Betreuung.`,
        procedere: `- Fortführung der oralen Antikoagulation ${duration}
- Wiedervorstellung in unserer rhythmologischen Sprechstunde (bitte Einweisungsschein ausstellen)${d.method === "Pulsed Field Ablation" ? "" : "\n- PPI in doppelter Standarddosis für vier Wochen"}`
      };
    }
  },
  {
    id: "epu_other",
    title: "Sonstige EPU (AVNRT/AVRT/WPW/CTI)",
    fields: [
      { key: "patient", label: "Patient", type: "text", default: "Der Patient" },
      { key: "entity", label: "Entität", type: "select", options: ["AVNRT", "AVRT/WPW", "Typisches Vorhofflattern"], default: "AVNRT" },
      { key: "procedure", label: "Prozedur", type: "text", default: "Modulation des slow-pathway" },
      { key: "chadsvasc", label: "CHA2DS2-VASc (bei Flattern)", type: "number", default: "1" },
      { key: "groin", label: "Leistenstatus", type: "text", default: "reizlos, DMS intakt" },
      { key: "date", label: "Entlassdatum", type: "text", default: "21.05.2026" }
    ],
    build: (d) => {
      const flutter = d.entity === "Typisches Vorhofflattern";
      const oakText = flutter ? oacDuration(d.chadsvasc, "für vier Wochen", "dauerhaft") : "nicht regelhaft erforderlich";
      return {
        diagnosen: `${d.entity}.
- Aktuell: ${d.procedure}.`,
        epikrise: `${patientSetting(d.patient)} wurde mit symptomatischen paroxysmalen Tachykardien stationär aufgenommen. Es erfolgte komplikationslos die elektrophysiologische Untersuchung mit ${d.procedure}. Der weitere Verlauf gestaltete sich unauffällig; in der postinterventionellen echokardiographischen Kontrolle zeigte sich kein Perikarderguss. Die Punktionsstelle war am Entlasstag ${d.groin}. Wir entlassen den Patienten am ${d.date} in stabilem Allgemeinzustand in die weitere ambulante Betreuung.`,
        procedere: `${flutter ? `- Orale Antikoagulation ${oakText}` : "- Keine spezifische OAK-Indikation aus der EPU allein"}
- Wiedervorstellung bei erneuten Beschwerden in der rhythmologischen Ambulanz`
      };
    }
  },
  {
    id: "hypertensive_crisis",
    title: "Hypertensive Krise",
    fields: [
      { key: "patient", label: "Patient", type: "text", default: "Der Patient" },
      { key: "maxBP", label: "Maximaler Blutdruck", type: "text", default: "220/110 mmHg" },
      { key: "acuteTherapy", label: "Initiale Blutdrucksenkung", type: "text", default: "Urapidil" },
      { key: "lzrr", label: "LZ-RR", type: "text", default: "tagsüber leicht hypertone Mittelwerte" },
      { key: "secondary", label: "Sekundärdiagnostik", type: "text", default: "Cushing- und Phäochromozytomdiagnostik unauffällig; ARR erhöht" },
      { key: "next", label: "Weiteres Procedere", type: "text", default: "Kochsalzbelastungstest empfohlen" },
      { key: "date", label: "Entlassdatum", type: "text", default: "21.05.2026" }
    ],
    build: (d) => ({
      diagnosen: `Hypertensive Krise bis maximal ${d.maxBP}.`,
      epikrise: `${patientSetting(d.patient)} wurde bei hypertensiver Entgleisung stationär aufgenommen. Nach initialer Blutdrucksenkung mit ${d.acuteTherapy} zeigten sich in den engmaschigen Verlaufskontrollen normotone Werte. Im Langzeit-RR fanden sich ${d.lzrr}. Zur Abklärung sekundärer Ursachen erfolgte eine erweiterte Diagnostik (${d.secondary}). Wir empfehlen eine zeitnahe erneute Blutdruckverlaufsdiagnostik sowie die stufenweise antihypertensive Therapieanpassung. Entlassung am ${d.date} in stabilem Allgemeinzustand.`,
      procedere: `- Erneute LZ-RR-Kontrolle in 4 Wochen
- Abhängig vom Verlauf antihypertensive Therapieanpassung
- Weiterführende Abklärung: ${d.next}`
    })
  },
  {
    id: "bypass_op",
    title: "Bypass-OP Vorbereitung",
    fields: [
      { key: "patient", label: "Patient", type: "text", default: "Der Patient" },
      { key: "vesselDisease", label: "Gefäßerkrankung", type: "select", options: ["1", "2", "3"], default: "3" },
      { key: "lesion", label: "Koronarbefund", type: "text", default: "hochgradige LAD/RCX/RCA-Stenosen" },
      { key: "lvef", label: "LVEF", type: "text", default: "mittelgradig eingeschränkt" },
      { key: "opv", label: "Prä-OP-Befunde", type: "text", default: "Rö-Thx, Abdomen-Sono und Lufu ohne Kontraindikationen" },
      { key: "hospital", label: "Zielklinik", type: "text", default: "Schön Klinik Vogtareuth" },
      { key: "opDate", label: "OP-Datum", type: "text", default: "27.05.2026" },
      { key: "date", label: "Verlegungsdatum", type: "text", default: "21.05.2026" }
    ],
    build: (d) => ({
      diagnosen: `Schwere koronare ${d.vesselDisease}-Gefäßerkrankung mit ${d.lesion} und Indikation zur operativen Bypass-Versorgung.`,
      epikrise: `${patientSetting(d.patient)} wurde zur elektiven Koronarangiographie stationär aufgenommen. Koronarangiographisch zeigte sich eine schwere koronare ${d.vesselDisease}-Gefäßerkrankung mit ${d.lesion} und hieraus resultierender Indikation zur operativen Bypass-Versorgung. Echokardiographisch fand sich eine ${d.lvef} linksventrikuläre Funktion. Die präoperativen Vorbereitungsuntersuchungen ergaben ${d.opv}. Wir verlegen den Patienten am ${d.date} in die ${d.hospital} zur geplanten Bypass-Operation am ${d.opDate}.`,
      procedere: `- Aufnahmetermin in ${d.hospital}
- Bypass-Operation geplant am ${d.opDate}`
    })
  }
];


const scenarioSelect = document.getElementById("scenario");
const fieldForm = document.getElementById("field-form");
const matrixNode = document.getElementById("matrix");

scenarios.forEach((s) => {
  const opt = document.createElement("option");
  opt.value = s.id;
  opt.textContent = s.title;
  scenarioSelect.appendChild(opt);
});

function renderForm() {
  const scenario = scenarios.find((s) => s.id === scenarioSelect.value);
  fieldForm.innerHTML = '<div class="form-grid"></div>';
  const grid = fieldForm.firstElementChild;

  scenario.fields.forEach((f) => {
    const wrap = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = `${f.label}${f.required ? " *" : ""}`;
    label.htmlFor = f.key;
    wrap.appendChild(label);

    let input;
    if (f.type === "select") {
      input = document.createElement("select");
      f.options.forEach((o) => {
        const op = document.createElement("option");
        op.value = o;
        op.textContent = o;
        input.appendChild(op);
      });
    } else {
      input = document.createElement("input");
      input.type = f.type === "number" ? "number" : "text";
    }
    input.id = f.key;
    input.name = f.key;
    input.value = f.default || "";
    wrap.appendChild(input);
    grid.appendChild(wrap);
  });

  renderMatrix(scenario);
  generateText();
}

function renderMatrix(scenario) {
  const rows = scenario.fields
    .map((f) => `<tr><td>${f.key}</td><td>${f.label}</td><td>${f.type}</td><td>${f.required ? "Ja" : "Nein"}</td><td>${f.default || ""}</td></tr>`)
    .join("");
  matrixNode.innerHTML = `<table><thead><tr><th>Key</th><th>Label</th><th>Typ</th><th>Pflicht</th><th>Default</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function collectData(scenario) {
  const data = {};
  scenario.fields.forEach((f) => {
    data[f.key] = document.getElementById(f.key).value.trim();
  });
  return data;
}

function generateText() {
  const scenario = scenarios.find((s) => s.id === scenarioSelect.value);
  const data = collectData(scenario);
  const out = scenario.build(data);
  document.getElementById("diagnosen").value = out.diagnosen;
  document.getElementById("epikrise").value = out.epikrise;
  document.getElementById("procedere").value = out.procedere;
}

scenarioSelect.addEventListener("change", renderForm);
document.getElementById("generate").addEventListener("click", generateText);
fieldForm.addEventListener("input", generateText);

document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const id = btn.getAttribute("data-copy");
    await navigator.clipboard.writeText(document.getElementById(id).value);
  });
});

document.getElementById("copy-all").addEventListener("click", async () => {
  const text = ["Aktuelle Diagnosen", document.getElementById("diagnosen").value, "", "Epikrise", document.getElementById("epikrise").value, "", "Procedere", document.getElementById("procedere").value].join("\n");
  await navigator.clipboard.writeText(text);
});

scenarioSelect.value = scenarios[0].id;
renderForm();
