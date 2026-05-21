const SHARED_FIELDS = [
  { key: "patient_title", label: "Anrede", type: "select", options: ["Herr", "Frau", "Divers"], default: "Herr" },
  { key: "patient_last_name", label: "Nachname", type: "text", default: "Mustermann" },
  { key: "admission_date", label: "Aufnahmedatum", type: "text", default: "21.05.2026" },
  { key: "discharge_date", label: "Entlassdatum", type: "text", default: "21.05.2026" },
  { key: "ldl_target", label: "LDL-Ziel", type: "text", default: "<55 mg/dl" },
  { key: "chadsvasc", label: "CHA2DS2-VASc", type: "number", default: "2" },
  { key: "p2y12", label: "P2Y12", type: "select", options: ["Clopidogrel", "Prasugrel", "Ticagrelor"], default: "Clopidogrel" }
];

const DEFAULT_TEMPLATES = [
  {
    id: "acs_pci",
    title: "ACS-PCI (hausstandard)",
    fields: ["patient_title", "patient_last_name", { key: "acs_type", label: "ACS-Typ", type: "select", options: ["STEMI", "NSTEMI", "Instabile AP"], default: "NSTEMI" }, { key: "target_vessel", label: "Zielgefäß", type: "select", options: ["LAD", "RCA", "RCX"], default: "LAD" }, "p2y12", "ldl_target", "discharge_date"],
    output: {
      diagnosen: "{{acs_type}} bei KHK mit Interventionsbedarf am {{target_vessel}}.",
      epikrise: "{{patient_title}} {{patient_last_name}} wurde wegen {{acs_type}} stationär aufgenommen. Koronarangiographisch zeigte sich eine interventionspflichtige Läsion des {{target_vessel}}, die in gleicher Sitzung komplikationslos versorgt wurde. Es erfolgte die Empfehlung zur DAPT mit ASS und {{p2y12}}. Wir entlassen {{patient_title}} {{patient_last_name}} am {{discharge_date}} in stabilem Allgemeinzustand.",
      procedere: "- DAPT entsprechend Hausstandard\n- LDL-Ziel {{ldl_target}}\n- Kardiologische Verlaufskontrollen"
    }
  },
  {
    id: "pvi",
    title: "PVI (hausstandard)",
    fields: ["patient_title", "patient_last_name", "chadsvasc", { key: "pvi_method", label: "Methode", type: "select", options: ["Kryo-Ballon", "Radiofrequenzablation", "Pulsed Field Ablation"], default: "Kryo-Ballon" }, "discharge_date"],
    output: {
      diagnosen: "Symptomatisches Vorhofflimmern; erfolgreiche PVI mittels {{pvi_method}}.",
      epikrise: "{{patient_title}} {{patient_last_name}} stellte sich mit symptomatischem Vorhofflimmern stationär vor. Nach Ausschluss intracavitärer Thromben in der transösophagealen Echokardiographie erfolgte komplikationslos die elektrophysiologische Untersuchung mit erfolgreicher Isolation aller Pulmonalvenen mittels {{pvi_method}}. Der weitere Verlauf gestaltete sich unauffällig; postinterventionell konnte ein Perikarderguss ausgeschlossen werden. Bei CHA2DS2-VASc {{chadsvasc}} erfolgte die Festlegung der OAK-Dauer gemäß Hausstandard. Wir entlassen {{patient_title}} {{patient_last_name}} am {{discharge_date}} in gutem Allgemeinzustand in die weitere fachärztliche Betreuung.",
      procedere: "- OAK-Fortführung entsprechend CHA2DS2-VASc\n- Rhythmologische Wiedervorstellung"
    }
  }
];

const STORAGE_KEY = "arztbrief_templates_v1";
let templates = loadTemplates();
let editorFields = [];

const scenarioSelect = document.getElementById("scenario");
const fieldForm = document.getElementById("field-form");
const matrixNode = document.getElementById("matrix");

const sharedFieldSelect = document.getElementById("shared-field");
const editorPreview = document.getElementById("editor-preview");

function loadTemplates() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(DEFAULT_TEMPLATES);
  try { return JSON.parse(raw); } catch { return structuredClone(DEFAULT_TEMPLATES); }
}
function saveTemplates() { localStorage.setItem(STORAGE_KEY, JSON.stringify(templates, null, 2)); }

function resolveField(def) {
  if (typeof def === "string") {
    const found = SHARED_FIELDS.find((f) => f.key === def);
    return found ? { ...found } : { key: def, label: def, type: "text", default: "" };
  }
  return { ...def };
}

function getTemplateById(id) { return templates.find((t) => t.id === id); }

function renderScenarioOptions() {
  scenarioSelect.innerHTML = "";
  templates.forEach((t) => {
    const o = document.createElement("option");
    o.value = t.id;
    o.textContent = t.title;
    scenarioSelect.appendChild(o);
  });
}

function renderSharedFieldOptions() {
  sharedFieldSelect.innerHTML = "";
  SHARED_FIELDS.forEach((f) => {
    const o = document.createElement("option");
    o.value = f.key;
    o.textContent = `${f.label} (${f.key})`;
    sharedFieldSelect.appendChild(o);
  });
}

function renderForm() {
  const t = getTemplateById(scenarioSelect.value);
  const fields = t.fields.map(resolveField);
  fieldForm.innerHTML = '<div class="form-grid"></div>';
  const grid = fieldForm.firstElementChild;
  fields.forEach((f) => {
    const wrap = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = f.label;
    wrap.appendChild(label);
    let input;
    if (f.type === "select") {
      input = document.createElement("select");
      (f.options || []).forEach((opt) => {
        const o = document.createElement("option"); o.value = opt; o.textContent = opt; input.appendChild(o);
      });
    } else {
      input = document.createElement("input");
      input.type = f.type === "number" ? "number" : "text";
    }
    input.id = f.key;
    input.value = f.default || "";
    wrap.appendChild(input);
    grid.appendChild(wrap);
  });
  renderMatrix(fields);
  generateText();
}

function renderMatrix(fields) {
  const rows = fields.map((f) => `<tr><td>${f.key}</td><td>${f.label}</td><td>${f.type}</td><td>${f.default || ""}</td></tr>`).join("");
  matrixNode.innerHTML = `<table><thead><tr><th>Key</th><th>Label</th><th>Typ</th><th>Default</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function collectData(template) {
  const data = {};
  template.fields.map(resolveField).forEach((f) => { data[f.key] = (document.getElementById(f.key)?.value || "").trim(); });
  return data;
}

function fill(templateText, data) {
  return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => data[key] ?? "");
}

function generateText() {
  const t = getTemplateById(scenarioSelect.value);
  const d = collectData(t);
  document.getElementById("diagnosen").value = fill(t.output.diagnosen, d);
  document.getElementById("epikrise").value = fill(t.output.epikrise, d);
  document.getElementById("procedere").value = fill(t.output.procedere, d);
}

function updateEditorPreview() {
  editorPreview.textContent = JSON.stringify(editorFields, null, 2);
}

document.getElementById("add-field").addEventListener("click", () => {
  const kind = document.getElementById("field-kind").value;
  if (kind === "shared") {
    editorFields.push(document.getElementById("shared-field").value);
  } else {
    const type = document.getElementById("custom-type").value;
    const field = {
      key: document.getElementById("custom-key").value.trim(),
      label: document.getElementById("custom-label").value.trim(),
      type,
      default: document.getElementById("custom-default").value.trim()
    };
    if (!field.key || !field.label) return;
    if (type === "select") field.options = document.getElementById("custom-options").value.split(",").map((s) => s.trim()).filter(Boolean);
    editorFields.push(field);
  }
  updateEditorPreview();
});

document.getElementById("create-template").addEventListener("click", () => {
  const id = document.getElementById("template-id").value.trim();
  const title = document.getElementById("template-title").value.trim();
  if (!id || !title || editorFields.length === 0) return;
  const t = {
    id,
    title,
    fields: editorFields,
    output: {
      diagnosen: "{{patient_title}} {{patient_last_name}}",
      epikrise: "Bitte Template-Epikrise im Editor anpassen.",
      procedere: "- Bitte Procedere anpassen"
    }
  };
  templates = templates.filter((x) => x.id !== id);
  templates.push(t);
  saveTemplates();
  renderScenarioOptions();
  scenarioSelect.value = id;
  renderForm();
  editorFields = [];
  updateEditorPreview();
});

document.getElementById("export-templates").addEventListener("click", () => {
  const payload = { sharedFields: SHARED_FIELDS, templates };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "arztbrief_templates_all.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("import-templates").addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const text = await f.text();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.templates)) return;
  templates = parsed.templates;
  saveTemplates();
  renderScenarioOptions();
  scenarioSelect.value = templates[0]?.id || "";
  renderForm();
});

scenarioSelect.addEventListener("change", renderForm);
fieldForm.addEventListener("input", generateText);
document.getElementById("generate").addEventListener("click", generateText);

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

renderSharedFieldOptions();
renderScenarioOptions();
scenarioSelect.value = templates[0].id;
renderForm();
updateEditorPreview();
