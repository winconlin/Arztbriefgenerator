const cfg = window.APP_CONFIG;
const caseGroupEl = document.getElementById('caseGroup');
const templateEl = document.getElementById('template');
const fieldsEl = document.getElementById('fields');
const styleModeEl = document.getElementById('styleMode');
const out = {
  diagnosen: document.getElementById('diagnosen'),
  epikrise: document.getElementById('epikrise'),
  procedere: document.getElementById('procedere')
};

function pickVariant(key) {
  const values = cfg.synonyms[key] || [key];
  return styleModeEl.value === 'conservative' ? values[0] : values[Math.floor(Math.random() * values.length)];
}

function buildCaseGroups() {
  caseGroupEl.innerHTML = Object.keys(cfg.caseGroups).map(g => `<option>${g}</option>`).join('');
  populateTemplates();
}

function populateTemplates() {
  const list = cfg.caseGroups[caseGroupEl.value] || [];
  templateEl.innerHTML = list.map(k => `<option value="${k}">${cfg.templates[k].name}</option>`).join('');
  buildFields();
}

function fieldHtml(f) {
  const cls = f.type === 'textarea' ? 'field-full' : '';
  if (f.type === 'select') {
    return `<label class="${cls}">${f.label}<select data-key="${f.key}">${f.options.map(o=>`<option>${o}</option>`).join('')}</select></label>`;
  }
  if (f.type === 'textarea') return `<label class="${cls}">${f.label}<textarea data-key="${f.key}" placeholder="${f.placeholder||''}"></textarea></label>`;
  return `<label class="${cls}">${f.label}<input type="${f.type==='number'?'number':'text'}" data-key="${f.key}" placeholder="${f.placeholder||''}" value="${f.default||''}"></label>`;
}

function buildFields() {
  const t = cfg.templates[templateEl.value];
  const fields = [...cfg.fieldMatrix, ...t.fields];
  fieldsEl.innerHTML = fields.map(fieldHtml).join('');
  fieldsEl.querySelectorAll('input,select,textarea').forEach(el => el.addEventListener('input', render));
  render();
}

function collectData() {
  const t = cfg.templates[templateEl.value];
  const fields = [...cfg.fieldMatrix, ...t.fields];
  const d = {};
  let missing = [];
  fields.forEach(f => {
    const v = fieldsEl.querySelector(`[data-key="${f.key}"]`)?.value?.trim() || '';
    d[f.key] = v;
    if (f.required && !v) missing.push(f.label);
  });
  return { d, missing };
}

function render() {
  const { d, missing } = collectData();
  if (missing.length) {
    out.diagnosen.value = `Fehlende Pflichtfelder: ${missing.join(', ')}`;
    out.epikrise.value = '';
    out.procedere.value = '';
    return;
  }
  const s = { showed: pickVariant('showed'), uncomplicated: pickVariant('uncomplicated'), discharged: pickVariant('discharged') };
  const generated = cfg.templates[templateEl.value].generate(d, s);
  Object.entries(generated).forEach(([k,v]) => out[k].value = v);
}

document.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
  const target = document.getElementById(btn.dataset.copy);
  await navigator.clipboard.writeText(target.value);
}));

document.getElementById('copyAll').addEventListener('click', async () => {
  const txt = `Aktuelle Diagnosen\n${out.diagnosen.value}\n\nEpikrise\n${out.epikrise.value}\n\nProcedere\n${out.procedere.value}`;
  await navigator.clipboard.writeText(txt);
});

caseGroupEl.addEventListener('change', populateTemplates);
templateEl.addEventListener('change', buildFields);
styleModeEl.addEventListener('change', render);

buildCaseGroups();
