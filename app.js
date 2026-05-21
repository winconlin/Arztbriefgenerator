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

const scenarios = [
  {
    id: "acs_pci",
    title: "ACS-PCI (template-nah)",
    fields: [
      { key: "style", label: "Sprachstil", type: "select", options: ["konservativ", "variabel"], default: "konservativ" },
      { key: "patient", label: "Patient (Name/Kürzel)", type: "text", required: true, default: "Der Patient" },
      { key: "acsType", label: "ACS-Typ", type: "select", required: true, options: ["STEMI", "NSTEMI", "Instabile AP"], default: "NSTEMI" },
      { key: "wall", label: "Vorder-/Hinterwand", type: "select", options: ["Vorderwand", "Hinterwand", "nicht zutreffend"], default: "nicht zutreffend" },
      { key: "vesselDisease", label: "1/2/3-Gefäßerkrankung", type: "select", options: ["1", "2", "3"], default: "2" },
      { key: "lesion", label: "Läsion", type: "select", options: ["hochgradige Stenose", "Verschluss"], default: "hochgradige Stenose" },
      { key: "vessel", label: "Gefäß", type: "select", options: ["LAD", "RCA", "RCX"], default: "LAD" },
      { key: "stentCount", label: "Anzahl DE-Stents", type: "number", default: "1" },
      { key: "telemetryDays", label: "Telemetrie (Tage)", type: "number", default: "2" },
      { key: "rhythm", label: "Rhythmusstörungen", type: "text", default: "keine höhergradigen Rhythmusstörungen" },
      { key: "ck", label: "CK max (nur STEMI)", type: "text", default: "" },
      { key: "echo", label: "Echo-Kurzbefund", type: "text", default: "leichtgradig eingeschränkte LV-Funktion" },
      { key: "p2y12", label: "P2Y12", type: "select", options: ["Clopidogrel", "Prasugrel", "Ticagrelor"], default: "Ticagrelor" },
      { key: "daptMonths", label: "DAPT Monate", type: "number", default: "12" },
      { key: "ldl", label: "LDL-Ziel", type: "text", default: "<55 mg/dl" },
      { key: "access", label: "Punktierte Arterie", type: "text", default: "A. radialis rechts" },
      { key: "ahb", label: "AHB beantragt", type: "select", options: ["ja", "nein"], default: "nein" },
      { key: "date", label: "Entlassdatum (TT.MM.JJJJ)", type: "text", default: "20.05.2026" }
    ],
    build: (d) => {
      const wallText = d.wall === "nicht zutreffend" ? "" : ` der ${d.wall}`;
      const ckText = d.acsType === "STEMI" && d.ck ? ` Die maximale CK-Auslenkung lag bei ${d.ck}.` : "";
      const ahbText = d.ahb === "ja" ? " Eine kardiologische AHB wurde beantragt, der Terminbescheid erfolgt postalisch." : "";
      return {
        diagnosen: `${d.acsType}${wallText} bei koronarer ${d.vesselDisease}-Gefäßerkrankung mit ${d.lesion} der ${d.vessel}.\n- Aktuell: DE-Stent-PCI (${d.stentCount} Stent) der ${d.vessel}.`,
        epikrise: `${d.patient} ${pick(SYNONYMS.admitted, d.style)} mit akutem Koronarsyndrom. Koronarangiographisch ${pick(SYNONYMS.showed, d.style)} eine koronare ${d.vesselDisease}-Gefäßerkrankung mit ${d.lesion} der ${d.vessel}, welche in gleicher Sitzung ${pick(SYNONYMS.uncomplicated, d.style)} mittels PCI und DE-Stent-Implantation rekanalisiert wurde.${ckText} Während der telemetrischen Überwachung über ${d.telemetryDays} Tage waren ${d.rhythm} auffällig. Echokardiographisch ${pick(SYNONYMS.showed, d.style)} ${d.echo}. Aufgrund der Stentimplantation empfehlen wir eine duale Thrombozytenaggregationshemmung mit ASS und ${d.p2y12} für ${d.daptMonths} Monate, anschließend lebensbegleitende Monotherapie. Die punktierte ${d.access} präsentierte sich am Entlasstag klinisch reizlos bei intakter peripherer DMS.${ahbText} Entlassung am ${d.date} in stabilem Allgemeinzustand.`,
        procedere: `- DAPT mit ASS und ${d.p2y12} für ${d.daptMonths} Monate, anschließend Monotherapie\n- Optimale Einstellung kardiovaskulärer Risikofaktoren, Ziel-LDL ${d.ldl}\n- Kardiologische Anbindung mit regelmäßigen echokardiographischen Verlaufskontrollen${d.ahb === "ja" ? "\n- AHB ist beantragt; Terminmitteilung erfolgt postalisch" : ""}`
      };
    }
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
      { key: "xray", label: "Rö-Thx", type: "text", default: "korrekte Sonden-/Aggregatlage, kein Pneumothorax" },
      { key: "check", label: "Device-Kontrolle", type: "text", default: "regelrechte Funktion, unauffällige Sondenmesswerte" },
      { key: "oacPause", label: "OAK pausieren (Tage)", type: "text", default: "5" },
      { key: "followup", label: "Erstkontrolle (Datum/Uhrzeit/Ort)", type: "text", default: "03.06.2026, 10:00, Device-Ambulanz" },
      { key: "date", label: "Entlassdatum", type: "text", default: "20.05.2026" }
    ],
    build: (d) => ({
      diagnosen: `Implantation eines ${d.deviceType}-Systems (Firma/Aggregat: ${d.maker}, Modus: ${d.mode}, SN: ${d.sn}) bei ${d.indication}.`,
      epikrise: `${d.patient} wurde zur elektiven Implantation eines ${d.deviceType} stationär aufgenommen. Die Implantation erfolgte komplikationslos. Radiomorphologisch ergab sich im Röntgen-Thorax ${d.xray}. In der abschließenden Schrittmacher-/Defibrillatorkontrolle zeigte sich ${d.check}. Ein Aggregat-Ausweis und eine Infobroschüre wurden ausgehändigt. Das Nahtmaterial soll bei regelmäßiger Wundkontrolle in 8–10 Tagen entfernt werden. Die orale Antikoagulation soll für ${d.oacPause} Tage pausiert werden. Entlassung am ${d.date} in kardiopulmonal stabilem Zustand.`,
      procedere: `- Regelmäßige Wundkontrollen, Fadenzug in 8–10 Tagen\n- OAK-Pause für ${d.oacPause} Tage nach Implantation\n- Wiedervorstellung zur Device-Erstkontrolle: ${d.followup} (Überweisung erforderlich: ja)`
    })
  },
  {
    id: "valve",
    title: "Klappe (TAVI/OP/M-TEER/T-TEER) mit OPV",
    fields: [
      { key: "patient", label: "Patient", type: "text", default: "Der Patient" },
      { key: "path", label: "Pfad", type: "select", options: ["TAVI", "Operativer Klappenersatz", "M-TEER", "T-TEER"], default: "TAVI" },
      { key: "dx", label: "Diagnose", type: "text", default: "hochgradige Aortenklappenstenose" },
      { key: "koef", label: "KÖF", type: "text", default: "0,8 cm²" },
      { key: "pmean", label: "pmean", type: "text", default: "45 mmHg" },
      { key: "opv", label: "OPV-Befunde", type: "text", default: "Coro vorhanden, TTE erfolgt, verfahrensabhängig TEE; keine Kontraindikationen" },
      { key: "ctDate", label: "TAVI-CT", type: "text", default: "28.05.2026, 09:00 Uhr" },
      { key: "heartTeam", label: "Heart-Team", type: "text", default: "Termin wird durch Sekretariat vereinbart" },
      { key: "date", label: "Entlass-/Verlegungsdatum", type: "text", default: "20.05.2026" }
    ],
    build: (d) => ({
      diagnosen: `${d.dx} mit Indikation zu ${d.path}. Echokardiographisch KÖF ${d.koef}, pmean ${d.pmean}.`,
      epikrise: `${d.patient} wurde bei symptomatischem Klappenvitium stationär aufgenommen. Echokardiographisch zeigte sich ${d.dx} (KÖF ${d.koef}, pmean ${d.pmean}). Nach interdisziplinärer Bewertung wurde die Indikation zu ${d.path} gestellt. Die präoperative/-interventionelle Vorbereitung erfolgte gemäß OPV-Standard: ${d.opv}. Entlassung/Verlegung am ${d.date} in stabilem Allgemeinzustand.`,
      procedere: `- Weiteres Procedere gemäß Pfad: ${d.path}\n- TAVI-CT/Interventionsplanung: ${d.ctDate}\n- Heart-Team-/Zentrumstermin: ${d.heartTeam}`
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
      { key: "anticoag", label: "Antikoagulation", type: "text", default: "initial Heparinperfusor, dann NMH, anschließend Apixaban" },
      { key: "duration", label: "OAK-Dauer", type: "text", default: "3–6 Monate (bei unprovoziertem Ereignis)" },
      { key: "date", label: "Entlassdatum", type: "text", default: "20.05.2026" }
    ],
    build: (d) => {
      const thrombus = d.thrombus === "nein" ? "" : ` mit reitendem Thrombus in der ${d.thrombus}en A. pulmonalis`;
      const thrombectomyText = d.thrombectomy === "ja"
        ? "Bei passender Risikokonstellation erfolgte ergänzend eine interventionelle Thrombektomie."
        : "Eine interventionelle Thrombektomie war nicht erforderlich.";
      return {
        diagnosen: `${d.distribution} Lungenarterienembolie${thrombus}; ${d.resp}.`,
        epikrise: `${d.patient} wurde bei zunehmender Dyspnoe stationär aufgenommen. Im Thorax-CT konnte eine ${d.distribution} Lungenarterienembolie${thrombus} nachgewiesen werden. ${thrombectomyText} Nach initialer Heparinisierung erfolgte die stufenweise Umstellung der Antikoagulation (${d.anticoag}). Entlassung am ${d.date} in stabilem Allgemeinzustand.`,
        procedere: `- Fortführung der Antikoagulation: ${d.anticoag}\n- Empfohlene OAK-Gesamtdauer: ${d.duration}\n- Klinische Verlaufskontrollen und Kompressionstherapie Klasse II`
      };
    }
  }
  ,
  {
    id: "elective_pci",
    title: "Elektive Koronarangiographie / PCI",
    fields: [
      { key: "patient", label: "Patient", type: "text", default: "Der Patient" },
      { key: "vesselDisease", label: "1/2/3-Gefäßerkrankung", type: "select", options: ["1", "2", "3"], default: "2" },
      { key: "withBypass", label: "ACVB-Situation", type: "text", default: "keine" },
      { key: "lesion", label: "Hochgradige Läsion", type: "text", default: "LAD-Stenose" },
      { key: "intervention", label: "Intervention", type: "text", default: "PTCA/DES-Implantation" },
      { key: "p2y12", label: "P2Y12", type: "select", options: ["Clopidogrel", "Prasugrel", "Ticagrelor"], default: "Clopidogrel" },
      { key: "daptMonths", label: "DAPT Monate", type: "number", default: "6" },
      { key: "ldl", label: "LDL-Ziel", type: "text", default: "<55 mg/dl" },
      { key: "access", label: "Punktionsstelle", type: "text", default: "A. radialis rechts" },
      { key: "date", label: "Entlassdatum", type: "text", default: "20.05.2026" }
    ],
    build: (d) => ({
      diagnosen: `Koronare ${d.vesselDisease}-Gefäßerkrankung${d.withBypass !== "keine" ? ` (mit ACVB-Situation: ${d.withBypass})` : ""} mit hochgradiger ${d.lesion}.
- Aktuell: ${d.intervention}.`,
      epikrise: `${d.patient} wurde zur elektiv geplanten Koronarangiographie stationär aufgenommen. Koronarangiographisch zeigte sich eine koronare ${d.vesselDisease}-Gefäßerkrankung mit hochgradiger ${d.lesion}, welche in gleicher Sitzung mittels ${d.intervention} versorgt wurde. Der postinterventionelle Verlauf gestaltete sich komplikationslos. Aufgrund der Stentimplantation empfehlen wir eine duale Plättchenhemmung mit ASS und ${d.p2y12} für ${d.daptMonths} Monate, anschließend eine lebensbegleitende Monotherapie. Die punktierte ${d.access} war am Entlasstag klinisch reizlos bei intakter DMS. Entlassung am ${d.date} in stabilem und beschwerdefreiem Zustand.`,
      procedere: `- DAPT mit ASS und ${d.p2y12} für ${d.daptMonths} Monate, anschließend Monotherapie
- Konsequente Einstellung kardiovaskulärer Risikofaktoren, Ziel-LDL ${d.ldl}
- Echokardiographische Verlaufskontrollen`
    })
  },
  {
    id: "heart_failure",
    title: "Kardiale Dekompensation",
    fields: [
      { key: "patient", label: "Patient", type: "text", default: "Der Patient" },
      { key: "cause", label: "Ursache", type: "text", default: "dekompensierte Herzinsuffizienz" },
      { key: "ntprobnp", label: "NT-pro-BNP", type: "text", default: "4500 pg/ml" },
      { key: "diuresis", label: "Diurese-Verlauf", type: "text", default: "forcierte diuretische Therapie, Umstellung auf Torasemid" },
      { key: "weight", label: "Mobilisiertes Gewicht", type: "text", default: "3 kg" },
      { key: "echo", label: "Echo", type: "text", default: "mittelgradig eingeschränkte LVEF" },
      { key: "troponin", label: "Troponin-Bewertung", type: "text", default: "dezente Troponin-Auslenkung im Rahmen der Dekompensation" },
      { key: "date", label: "Entlassdatum", type: "text", default: "20.05.2026" }
    ],
    build: (d) => ({
      diagnosen: `Dekompensierte Herzinsuffizienz bei ${d.cause}.`,
      epikrise: `${d.patient} wurde bei kardialer Dekompensation mit Dyspnoe stationär aufgenommen. Klinisch und radiologisch imponierten kardiale Stauungszeichen. Das NT-pro-BNP lag bei ${d.ntprobnp}. Unter ${d.diuresis} konnte eine deutliche Beschwerdebesserung mit Negativbilanz erzielt werden (insgesamt mobilisiert: ${d.weight}). Echokardiographisch zeigte sich ${d.echo}. Die ${d.troponin}. Entlassung am ${d.date} in stabilem Allgemeinzustand.`,
      procedere: `- Regelmäßige Nierenretentionsparameter- und Elektrolytkontrollen unter Diuretikatherapie
- Tägliche Gewichtskontrollen
- Flüssigkeitszufuhr max. 1,5 l/Tag
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
      { key: "lzekg", label: "LZ-EKG", type: "text", default: "Vorhofflimmern, mittlere Frequenz 110/min, TAA-Episoden bis 160/min" },
      { key: "strategy", label: "Strategie", type: "text", default: "Frequenzkontrolle" },
      { key: "cardioversion", label: "Kardioversion", type: "text", default: "nach TEE durchgeführt, jedoch frühes Rezidiv" },
      { key: "amio", label: "Amiodaron", type: "text", default: "Rhythmuskontrolle nach Aufsättigung" },
      { key: "date", label: "Entlassdatum", type: "text", default: "20.05.2026" }
    ],
    build: (d) => ({
      diagnosen: `Tachyarrhythmisches Vorhofflimmern bei CHA2DS2-VASc-Score ${d.chadsvasc}.`,
      epikrise: `${d.patient} wurde bei erstmalig diagnostiziertem tachyarrhythmischem Vorhofflimmern stationär aufgenommen. Bei einem CHA2DS2-VASc-Score von ${d.chadsvasc} wurde eine orale Antikoagulation mit ${d.oak} begonnen. Im Langzeit-EKG zeigte sich ${d.lzekg}. Im weiteren Verlauf wurde eine ${d.strategy} etabliert; ${d.cardioversion}. Zur Rhythmusstabilisierung erfolgte ${d.amio}. Entlassung am ${d.date} in gutem Allgemeinzustand.`,
      procedere: `- Fortführung der oralen Antikoagulation mit ${d.oak}
- Regelmäßige rhythmologische und echokardiographische Verlaufskontrollen
- Bei Amiodaron: Verlaufskontrollen von QTc, Schilddrüsen-, Leber- und Lungenfunktion`
    })
  },
  {
    id: "cardioversion",
    title: "Elektrische Kardioversion",
    fields: [
      { key: "patient", label: "Patient", type: "text", default: "Der Patient" },
      { key: "arrhythmia", label: "Rhythmusdiagnose", type: "text", default: "persistierendes Vorhofflimmern" },
      { key: "ehra", label: "EHRA", type: "text", default: "III" },
      { key: "chadsvasc", label: "CHA2DS2-VASc", type: "number", default: "2" },
      { key: "hasbled", label: "HAS-BLED", type: "number", default: "1" },
      { key: "joule", label: "Kardioversion (Joule)", type: "text", default: "200 J biphasisch" },
      { key: "result", label: "Ergebnis", type: "select", options: ["erfolgreich", "frustran"], default: "erfolgreich" },
      { key: "oak", label: "OAK", type: "text", default: "Apixaban" },
      { key: "date", label: "Entlassdatum", type: "text", default: "20.05.2026" }
    ],
    build: (d) => {
      const oakDuration = Number(d.chadsvasc) >= 2 ? "dauerhaft" : "für vier Wochen";
      return {
        diagnosen: `${d.arrhythmia}, EHRA ${d.ehra}, CHA2DS2-VASc ${d.chadsvasc}, HAS-BLED ${d.hasbled}.
- Aktuell: ${d.result}e elektrische Kardioversion mit ${d.joule}.`,
        epikrise: `${d.patient} stellte sich mit symptomatischem ${d.arrhythmia} stationär vor. Nach Ausschluss intracavitärer Thromben in der TEE erfolgte ${d.result === "erfolgreich" ? "komplikationslos" : "unter adäquatem Schockprotokoll"} die elektrische Kardioversion mit ${d.joule}. Im weiteren Verlauf zeigte sich ${d.result === "erfolgreich" ? "ein normfrequenter Sinusrhythmus" : "weiterhin Vorhofflimmern"}. Bei CHA2DS2-VASc ${d.chadsvasc} ist eine orale Antikoagulation ${oakDuration} indiziert. Entlassung am ${d.date} in stabilem Allgemeinzustand.`,
        procedere: `- Fortführung OAK mit ${d.oak} ${oakDuration}
- Rhythmologische Wiedervorstellung in der Sprechstunde`
      };
    }
  },
  {
    id: "pvi",
    title: "Pulmonalvenenisolation (EPU bei VHF)",
    fields: [
      { key: "patient", label: "Patient", type: "text", default: "Der Patient" },
      { key: "afType", label: "VHF-Typ", type: "select", options: ["Paroxysmal", "Persistierend", "Kurz-persistierend"], default: "Persistierend" },
      { key: "ehra", label: "EHRA", type: "text", default: "III" },
      { key: "chadsvasc", label: "CHA2DS2-VASc", type: "number", default: "1" },
      { key: "hasbled", label: "HAS-BLED", type: "number", default: "1" },
      { key: "method", label: "Methode", type: "select", options: ["Kryo-Ballon", "Radiofrequenz", "Pulsed Field Ablation"], default: "Kryo-Ballon" },
      { key: "result", label: "Ergebnis", type: "text", default: "erfolgreiche Isolation aller Pulmonalvenen" },
      { key: "groin", label: "Leistenstatus", type: "text", default: "beidseits reizlos, DMS intakt" },
      { key: "date", label: "Entlassdatum", type: "text", default: "20.05.2026" }
    ],
    build: (d) => {
      const oakDuration = Number(d.chadsvasc) >= 2 ? "dauerhaft" : "für drei Monate";
      const ppi = d.method === "Pulsed Field Ablation" ? "" : " Ergänzend wird eine PPI-Therapie in doppelter Standarddosis für vier Wochen empfohlen.";
      return {
        diagnosen: `${d.afType}es Vorhofflimmern, EHRA ${d.ehra}, CHA2DS2-VASc ${d.chadsvasc}, HAS-BLED ${d.hasbled}.
- Aktuell: EPU mit ${d.method}, ${d.result}.`,
        epikrise: `${d.patient} wurde zur Pulmonalvenenisolation stationär aufgenommen. Nach Ausschluss intracavitärer Thromben in der TEE erfolgte komplikationslos die elektrophysiologische Untersuchung mit ${d.method} und ${d.result}. In seriellen echokardiographischen Kontrollen ergab sich postinterventionell kein Perikarderguss. Die punktierten Vv. femorales waren am Entlasstag ${d.groin}.${ppi} Entlassung am ${d.date} in gutem Allgemeinzustand.`,
        procedere: `- Fortführung der oralen Antikoagulation ${oakDuration}
- Wiedervorstellung in der rhythmologischen Sprechstunde (mit Einweisung)${ppi ? "\n- PPI in doppelter Standarddosis für vier Wochen" : ""}`
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
      { key: "date", label: "Entlassdatum", type: "text", default: "20.05.2026" }
    ],
    build: (d) => {
      const flutter = d.entity === "Typisches Vorhofflattern";
      const oakText = flutter ? (Number(d.chadsvasc) >= 2 ? "dauerhaft" : "für vier Wochen") : "nicht regelhaft erforderlich";
      return {
        diagnosen: `${d.entity}.
- Aktuell: ${d.procedure}.`,
        epikrise: `${d.patient} wurde mit symptomatischen paroxysmalen Tachykardien stationär aufgenommen. Es erfolgte komplikationslos die elektrophysiologische Untersuchung mit ${d.procedure}. Postinterventionell zeigte sich kein Perikarderguss; die Punktionsstelle war ${d.groin}. Entlassung am ${d.date} in stabilem Allgemeinzustand.`,
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
      { key: "date", label: "Entlassdatum", type: "text", default: "20.05.2026" }
    ],
    build: (d) => ({
      diagnosen: `Hypertensive Krise bis maximal ${d.maxBP}.`,
      epikrise: `${d.patient} wurde bei hypertensiver Entgleisung stationär aufgenommen. Nach initialer Blutdrucksenkung mit ${d.acuteTherapy} zeigten sich im Verlauf normotone Werte. In der Langzeit-RR-Messung fanden sich ${d.lzrr}. Zur Abklärung einer sekundären Hypertonie erfolgte eine erweiterte Diagnostik (${d.secondary}). Entlassung am ${d.date} in stabilem Allgemeinzustand.`,
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
      { key: "date", label: "Verlegungsdatum", type: "text", default: "20.05.2026" }
    ],
    build: (d) => ({
      diagnosen: `Schwere koronare ${d.vesselDisease}-Gefäßerkrankung mit ${d.lesion} und Indikation zur operativen Bypass-Versorgung.`,
      epikrise: `${d.patient} wurde zur elektiven Koronarangiographie stationär aufgenommen. Koronarangiographisch zeigte sich eine schwere koronare ${d.vesselDisease}-Gefäßerkrankung mit ${d.lesion} und hieraus resultierender Bypass-Indikation. Echokardiographisch fand sich eine ${d.lvef} linksventrikuläre Funktion. Die präoperativen Untersuchungen ergaben ${d.opv}. Verlegung am ${d.date} in die ${d.hospital} zur Bypass-Operation am ${d.opDate}.`,
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
