const templateSelect = document.getElementById("templateSelect");
const dynamicFields = document.getElementById("dynamicFields");
const diagnosenOutput = document.getElementById("diagnosenOutput");
const epikriseOutput = document.getElementById("epikriseOutput");
const procedereOutput = document.getElementById("procedereOutput");

templates.forEach((t) => {
  const opt = document.createElement("option");
  opt.value = t.id;
  opt.textContent = t.label;
  templateSelect.appendChild(opt);
});

function currentTemplate() {
  return templates.find((t) => t.id === templateSelect.value) || templates[0];
}

function renderFields() {
  dynamicFields.innerHTML = "";
  for (const field of currentTemplate().fields) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const label = document.createElement("label");
    label.setAttribute("for", field.key);
    label.textContent = field.label;
    wrap.appendChild(label);

    let input;
    if (field.type === "select") {
      input = document.createElement("select");
      field.options.forEach((o) => {
        const opt = document.createElement("option");
        opt.value = o;
        opt.textContent = o;
        input.appendChild(opt);
      });
    } else {
      input = document.createElement("input");
      input.type = field.type === "number" ? "number" : "text";
    }
    input.id = field.key;
    input.value = field.default || "";
    wrap.appendChild(input);
    dynamicFields.appendChild(wrap);
  }
}

function values() {
  const v = {};
  currentTemplate().fields.forEach((f) => {
    v[f.key] = document.getElementById(f.key)?.value?.trim();
  });
  return v;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generate() {
  const v = values();
  const t = currentTemplate().id;

  if (t === "acs_pci") {
    const verb = pick(["zeigte sich", "imponierte", "stellte sich dar"]);
    diagnosenOutput.value = `${v.acsType} bei koronarer ${v.vesselDisease}-Gefäßerkrankung mit hochgradiger Stenose/Verschluss der ${v.targetVessel}.\nAktuell: DES-PCI (${v.stents} Stent[s]) am ${v.date}.`;
    epikriseOutput.value = `Aufnahme bei akutem Koronarsyndrom. Koronarangiographisch ${verb} eine ${v.vesselDisease}-Gefäßerkrankung mit Zielgefäß ${v.targetVessel}, welche in gleicher Sitzung komplikationslos mit PCI und ${v.stents} DES versorgt wurde.\nEine duale Thrombozytenaggregationshemmung mit ASS und ${v.p2y12} ist für ${v.daptMonths} Monate indiziert. Entlassung in stabilem Zustand.`;
    procedereOutput.value = `- DAPT: ASS + ${v.p2y12} für ${v.daptMonths} Monate, danach Monotherapie\n- LDL-Ziel < ${v.ldlTarget} mg/dl\n- Kardiologische Verlaufskontrollen`;
  }

  if (t === "device") {
    diagnosenOutput.value = `Implantation eines ${v.deviceType}-Systems (${v.vendor}, SN ${v.sn}) bei ${v.indication}.`;
    epikriseOutput.value = `Stationäre Aufnahme zur Device-Therapie. Es erfolgte die komplikationslose Implantation eines ${v.deviceType}. Radiomorphologisch regelrechte Lage ohne Pneumothorax. Abschlusskontrolle mit regelrechter Funktion. Entlassung in stabilem Zustand.`;
    procedereOutput.value = `- Wundkontrollen, Fadenzug nach 8-10 Tagen\n- Device-Kontrolle am ${v.followDate} (Überweisung erforderlich: ja)`;
  }

  if (t === "valve") {
    diagnosenOutput.value = `${v.valve} mit Indikation zur ${v.procedure}. KÖF ${v.koef} cm², pmean ${v.pmean} mmHg.`;
    epikriseOutput.value = `Vorstellung bei symptomatischem Klappenvitium. Echokardiographisch bestätigte sich die hochgradige Klappenerkrankung. Die OP-Vorbereitung (${v.opv}) wurde entsprechend Standard durchgeführt. Indikation zur ${v.procedure} gestellt.`;
    procedereOutput.value = `- Terminplanung Heart-Team / Zielklinik\n- OPV-Module gemäß Verfahren vollständig dokumentieren (Datum/Uhrzeit/Ort + Überweisung)`;
  }

  if (t === "lae") {
    diagnosenOutput.value = `${v.side} Lungenarterienembolie mit respiratorischer Partialinsuffizienz.`;
    epikriseOutput.value = `Aufnahme bei Dyspnoe. CT-thorakal bestätigte eine ${v.side} LAE. Initiale Antikoagulation wurde etabliert und auf ${v.oac} umgestellt.${v.thrombectomy === "ja" ? " Zusätzlich erfolgte eine interventionelle Thrombektomie." : ""} Entlassung in stabilem Allgemeinzustand.`;
    procedereOutput.value = `- Fortführung OAK mit ${v.oac} für ${v.months} Monate\n- Klinische und ggf. echokardiographische Verlaufskontrolle`;
  }
}

document.getElementById("generateBtn").addEventListener("click", generate);
templateSelect.addEventListener("change", () => {
  renderFields();
  diagnosenOutput.value = "";
  epikriseOutput.value = "";
  procedereOutput.value = "";
});

document.querySelectorAll(".copy").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const id = btn.dataset.copy;
    await navigator.clipboard.writeText(document.getElementById(id).value);
    btn.textContent = "Kopiert";
    setTimeout(() => (btn.textContent = "Kopieren"), 1000);
  });
});

document.getElementById("copyAllBtn").addEventListener("click", async () => {
  const text = `Aktuelle Diagnosen\n${diagnosenOutput.value}\n\nEpikrise\n${epikriseOutput.value}\n\nProcedere\n${procedereOutput.value}`;
  await navigator.clipboard.writeText(text);
});

renderFields();
