const templates = [
  {
    id: "acs_pci",
    label: "ACS mit PCI",
    fields: [
      { key: "acsType", label: "ACS-Typ", type: "select", options: ["STEMI", "NSTEMI", "Instabile AP"], default: "NSTEMI" },
      { key: "vesselDisease", label: "Gefäßerkrankung", type: "select", options: ["1", "2", "3"], default: "2" },
      { key: "targetVessel", label: "Zielgefäß", type: "text", default: "RCA" },
      { key: "stents", label: "Anzahl DES", type: "number", default: "1" },
      { key: "daptMonths", label: "DAPT Monate", type: "number", default: "12" },
      { key: "p2y12", label: "P2Y12", type: "select", options: ["Ticagrelor", "Clopidogrel", "Prasugrel"], default: "Ticagrelor" },
      { key: "ldlTarget", label: "LDL-Ziel mg/dl", type: "select", options: ["55", "70"], default: "55" },
      { key: "date", label: "Datum", type: "text", default: "20.05.2026" }
    ]
  },
  {
    id: "device",
    label: "Device (PM/ICD/CRT-P/CRT-D/LifeVest)",
    fields: [
      { key: "deviceType", label: "Device-Typ", type: "select", options: ["1-Kammer-PM", "2-Kammer-PM", "ICD", "CRT-P", "CRT-D", "LifeVest"], default: "CRT-D" },
      { key: "vendor", label: "Firma/Aggregat", type: "text", default: "St. Jude / Quadra Assura" },
      { key: "sn", label: "Seriennummer", type: "text", default: "XX" },
      { key: "indication", label: "Indikation", type: "text", default: "Kardiomyopathie mit hochgradig reduzierter LVEF" },
      { key: "followDate", label: "Kontrolltermin", type: "text", default: "30.05.2026 09:00" }
    ]
  },
  {
    id: "valve",
    label: "Klappenvitium (TAVI/M-TEER/T-TEER/OP)",
    fields: [
      { key: "procedure", label: "Verfahren", type: "select", options: ["TAVI", "M-TEER", "T-TEER", "Operativer Klappenersatz"], default: "TAVI" },
      { key: "valve", label: "Vitium", type: "text", default: "hochgradige Aortenklappenstenose" },
      { key: "koef", label: "KÖF cm²", type: "text", default: "0,8" },
      { key: "pmean", label: "pmean mmHg", type: "text", default: "42" },
      { key: "opv", label: "OPV komplett", type: "select", options: ["ja", "teilweise"], default: "ja" }
    ]
  },
  {
    id: "lae",
    label: "Lungenarterienembolie",
    fields: [
      { key: "side", label: "Befall", type: "select", options: ["beidseitig", "rechts", "links"], default: "beidseitig" },
      { key: "thrombectomy", label: "Thrombektomie", type: "select", options: ["nein", "ja"], default: "nein" },
      { key: "oac", label: "OAK", type: "text", default: "Apixaban" },
      { key: "months", label: "OAK-Dauer (Monate)", type: "number", default: "6" }
    ]
  }
];
