const selectEl = document.getElementById('templateSelect');
const formContainer = document.getElementById('formContainer');
const outDiagnosen = document.getElementById('outDiagnosen');
const outEpikrise = document.getElementById('outEpikrise');
const outProcedere = document.getElementById('outProcedere');
const variationToggle = document.getElementById('variationToggle');

const verbPool = {
  show: ["zeigte sich", "imponierte", "stellte sich dar", "fand sich"],
  present: ["präsentierte sich", "zeigte sich", "war", "imponierte"]
};

let templates = [];
let currentTemplate = null;

const pickVerb = (key) => {
  if (!variationToggle.checked) return verbPool[key][0];
  const list = verbPool[key];
  return list[Math.floor(Math.random() * list.length)];
};

const fmtDate = (v) => {
  if (!v) return "XX.XX.XXXX";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  const dd = `${d.getDate()}`.padStart(2, '0');
  const mm = `${d.getMonth() + 1}`.padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}.${mm}.${yy}`;
};

function renderForm(tpl) {
  formContainer.innerHTML = '';
  tpl.fields.forEach((f) => {
    const wrap = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = f.label;
    label.htmlFor = f.key;
    wrap.appendChild(label);

    let el;
    if (f.type === 'select') {
      el = document.createElement('select');
      f.options.forEach((o) => {
        const opt = document.createElement('option');
        opt.value = o;
        opt.textContent = o;
        el.appendChild(opt);
      });
    } else {
      el = document.createElement('input');
      el.type = f.type === 'number' ? 'number' : (f.type === 'date' ? 'date' : 'text');
    }

    el.id = f.key;
    if (f.default) el.value = f.default;
    el.addEventListener('input', generate);
    wrap.appendChild(el);
    formContainer.appendChild(wrap);
  });
  generate();
}

function applyVars(templateText, vars) {
  return templateText
    .replaceAll('{{verb_show}}', vars.verb_show)
    .replaceAll('{{verb_present}}', vars.verb_present)
    .replace(/{{(\w+)}}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

function collectValues() {
  const values = {};
  currentTemplate.fields.forEach((f) => {
    values[f.key] = document.getElementById(f.key).value || '';
    if (f.type === 'date') values[`${f.key}_fmt`] = fmtDate(values[f.key]);
  });
  values.verb_show = pickVerb('show');
  values.verb_present = pickVerb('present');
  return values;
}

function generate() {
  if (!currentTemplate) return;
  const v = collectValues();
  outDiagnosen.value = applyVars(currentTemplate.output.diagnosen, v);
  outEpikrise.value = applyVars(currentTemplate.output.epikrise, v);
  outProcedere.value = applyVars(currentTemplate.output.procedere, v);
}

function copyText(text) {
  navigator.clipboard.writeText(text);
}

document.querySelectorAll('button[data-copy]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-copy');
    const map = { diagnosen: outDiagnosen, epikrise: outEpikrise, procedere: outProcedere };
    copyText(map[key].value);
  });
});

document.getElementById('copyAll').addEventListener('click', () => {
  copyText(`Aktuelle Diagnosen:\n${outDiagnosen.value}\n\nEpikrise:\n${outEpikrise.value}\n\nProcedere:\n${outProcedere.value}`);
});

variationToggle.addEventListener('change', generate);

fetch('data/templates.json')
  .then((r) => r.json())
  .then((data) => {
    templates = data;
    templates.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.title;
      selectEl.appendChild(opt);
    });
    currentTemplate = templates[0];
    renderForm(currentTemplate);
  });

selectEl.addEventListener('change', () => {
  currentTemplate = templates.find((t) => t.id === selectEl.value);
  renderForm(currentTemplate);
});
