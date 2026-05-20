const scenarios = [
  {
    id: "acs_pci",
    title: "ACS-PCI",
    fields: [
      { key: "patient", label: "Patient (Name/Kürzel)", type: "text", required: true, default: "Patient" },
      { key: "acsType", label: "ACS-Typ", type: "select", required: true, options: ["STEMI", "NSTEMI", "Instabile AP"], default: "NSTEMI" },
      { key: "vessel", label: "Zielgefäß", type: "select", required: true, options: ["LAD", "RCA", "RCX"], default: "LAD" },
      { key: "vesselDisease", label: "Gefäßerkrankung", type: "select", required: true, options: ["1", "2", "3"], default: "2" },
      { key: "stentCount", label: "Anzahl DE-Stents", type: "number", required: true, default: "1" },
      { key: "daptMonths", label: "DAPT Monate", type: "number", required: true, default: "12" },
      { key: "p2y12", label: "P2Y12", type: "select", required: true, options: ["Clopidogrel", "Prasugrel", "Ticagrelor"], default: "Ticagrelor" },
      { key: "ldl", label: "LDL-Ziel", type: "text", required: true, default: "<55 mg/dl" },
      { key: "access", label: "Punktion", type: "text", required: true, default: "A. radialis rechts" },
      { key: "date", label: "Entlassdatum (TT.MM.JJJJ)", type: "text", required: true, default: "20.05.2026" }
    ],
    build: (d) => ({
      diagnosen: `${d.acsType} bei koronarer ${d.vesselDisease}-Gefäßerkrankung mit hochgradiger ${d.vessel}-Stenose.\nAktuell: DE-Stent-PCI (${d.stentCount} Stent) der ${d.vessel}.`,
      epikrise: `${d.patient} wurde mit akutem Koronarsyndrom stationär aufgenommen. Koronarangiographisch zeigte sich eine ${d.vesselDisease}-Gefäßerkrankung mit hochgradiger ${d.vessel}-Läsion, die in gleicher Sitzung mittels PCI und DE-Stent-Implantation versorgt wurde. Der postinterventionelle Verlauf war komplikationslos. Aufgrund der Stentimplantation ist eine duale Plättchenhemmung mit ASS und ${d.p2y12} für ${d.daptMonths} Monate indiziert, anschließend Monotherapie. Die Punktionsstelle (${d.access}) zeigte sich am Entlasstag reizlos bei intakter DMS. Wir entlassen ${d.patient} am ${d.date} in stabilem Allgemeinzustand in die ambulante Weiterbehandlung.`,
      procedere: `- DAPT mit ASS + ${d.p2y12} für ${d.daptMonths} Monate, danach Monotherapie\n- Optimale Einstellung kardiovaskulärer Risikofaktoren, LDL-Ziel ${d.ldl}\n- Regelmäßige echokardiographische Verlaufskontrollen`
    })
  },
  {
    id: "device_icd_crt",
    title: "Device (PM/ICD/CRT-P/CRT-D/LifeVest)",
    fields: [
      { key: "patient", label: "Patient", type: "text", required: true, default: "Patient" },
      { key: "deviceType", label: "Device-Typ", type: "select", required: true, options: ["1-Kammer-PM", "2-Kammer-PM", "ICD", "CRT-P", "CRT-D", "LifeVest"], default: "CRT-D" },
      { key: "maker", label: "Hersteller/Aggregat", type: "text", required: true, default: "St. Jude / Quadra Assura" },
      { key: "sn", label: "SN", type: "text", required: true, default: "XX" },
      { key: "indication", label: "Indikation", type: "text", required: true, default: "Kardiomyopathie mit hochgradig reduzierter LVEF und LSB" },
      { key: "oac", label: "OAK-Wiederbeginn", type: "text", required: true, default: "ab 25.05.2026" },
      { key: "followup", label: "Device-Kontrolle (Datum/Uhrzeit/Ort)", type: "text", required: true, default: "03.06.2026, 10:00 Uhr, Device-Ambulanz" },
      { key: "date", label: "Entlassdatum", type: "text", required: true, default: "20.05.2026" }
    ],
    build: (d) => ({
      diagnosen: `Implantation ${articleFor(d.deviceType)} ${d.deviceType}-Systems (${d.maker}, SN: ${d.sn}) bei ${d.indication}.`,
      epikrise: `${d.patient} wurde zur elektiven ${d.deviceType}-Versorgung stationär aufgenommen. Die Implantation verlief komplikationslos. Im Röntgen-Thorax zeigte sich eine korrekte Sonden-/Aggregatlage ohne Pneumothorax. Die abschließende Device-Kontrolle ergab eine regelrechte Funktion. ${d.patient} erhielt Device-Ausweis und Termin zur ambulanten Kontrolle (${d.followup}, Überweisung erforderlich: ja). Entlassung am ${d.date} in stabilem Zustand.`,
      procedere: `- Wundkontrolle und Fadenzug in 8–10 Tagen\n- Wiederbeginn OAK ${d.oac}\n- Device-Erstkontrolle: ${d.followup}`
    })
  },
  {
    id: "valve_opv",
    title: "Klappenvitien (TAVI/OP/M-TEER/T-TEER)",
    fields: [
      { key: "patient", label: "Patient", type: "text", required: true, default: "Patient" },
      { key: "path", label: "Pfad", type: "select", required: true, options: ["TAVI", "Operativer Klappenersatz", "M-TEER", "T-TEER"], default: "TAVI" },
      { key: "valveDx", label: "Klappendiagnose", type: "text", required: true, default: "Hochgradige Aortenklappenstenose" },
      { key: "koef", label: "KÖF", type: "text", required: true, default: "0,8 cm²" },
      { key: "pmean", label: "pmean", type: "text", required: true, default: "45 mmHg" },
      { key: "ctDate", label: "TAVI-CT Termin", type: "text", required: false, default: "28.05.2026 09:00 Radiologisches Zentrum" },
      { key: "heartTeam", label: "Heart-Team Termin", type: "text", required: false, default: "wird durch Sekretariat mitgeteilt" },
      { key: "date", label: "Entlassdatum", type: "text", required: true, default: "20.05.2026" }
    ],
    build: (d) => ({
      diagnosen: `${d.valveDx} mit Interventionsindikation (${d.path}); KÖF ${d.koef}, pmean ${d.pmean}.`,
      epikrise: `${d.patient} stellte sich mit symptomatischem Klappenvitium vor. Echokardiographisch imponierte ${d.valveDx} (KÖF ${d.koef}, pmean ${d.pmean}). Es wurde der Behandlungspfad ${d.path} festgelegt. Die OP-/Interventionsvorbereitung erfolgte gemäß OPV-Standard (inkl. Coro, TTE/TEE-indiziert, Zusatzdiagnostik verfahrensabhängig). Entlassung am ${d.date} in stabilem Allgemeinzustand.`,
      procedere: `- Terminplanung gemäß ${d.path}-Pfad\n- TAVI-CT: ${d.ctDate}\n- Heart-Team/Weiteres Procedere: ${d.heartTeam}`
    })
  },
  {
    id: "lae",
    title: "Lungenarterienembolie",
    fields: [
      { key: "patient", label: "Patient", type: "text", required: true, default: "Patient" },
      { key: "distribution", label: "Ausdehnung", type: "select", required: true, options: ["beidseitig", "rechts", "links"], default: "beidseitig" },
      { key: "thrombectomy", label: "Thrombektomie", type: "select", required: true, options: ["nein", "ja"], default: "nein" },
      { key: "oac", label: "Ziel-OAK", type: "text", required: true, default: "Apixaban" },
      { key: "duration", label: "OAK-Dauer", type: "text", required: true, default: "mindestens 3–6 Monate" },
      { key: "date", label: "Entlassdatum", type: "text", required: true, default: "20.05.2026" }
    ],
    build: (d) => {
      const intervention = d.thrombectomy === "ja"
        ? "Bei intermediär-hohem Risiko wurde zusätzlich eine interventionelle Thrombektomie durchgeführt."
        : "Es bestand keine Indikation zur interventionellen Thrombektomie.";
      return {
        diagnosen: `${d.distribution}e Lungenarterienembolie mit respiratorischer Partialinsuffizienz.`,
        epikrise: `${d.patient} wurde bei Dyspnoe stationär aufgenommen. Im CT-Thorax zeigte sich eine ${d.distribution}e Lungenarterienembolie. ${intervention} Nach initialer Heparinisierung erfolgte die Umstellung auf ${d.oac}. Entlassung am ${d.date} in stabilem Zustand.`,
        procedere: `- Fortführung OAK mit ${d.oac} für ${d.duration}\n- Klinische Verlaufskontrollen inkl. Belastbarkeit und Oxygenierung\n- Kompressionsbehandlung gemäß venösem Risikoprofil`
      };
    }
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

function articleFor(deviceType) {
  return /^[AEIOUÄÖÜ]/i.test(deviceType) ? "eines" : "eines";
}

function renderForm() {
  const scenario = scenarios.find((s) => s.id === scenarioSelect.value);
  fieldForm.innerHTML = '<div class="form-grid"></div>';
  const grid = fieldForm.firstElementChild;

  scenario.fields.forEach((f) => {
    const wrap = document.createElement("div");
    if (f.type === "textarea") wrap.className = "full";
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
