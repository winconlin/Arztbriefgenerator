const STORAGE_KEY = "arztbrief_templates_all_v2";
const DEFAULT_DATA = {
  templates: [{
    id: "acs_standard",
    title: "ACS Standard",
    variables: [
      { key:"patient_title", label:"Anrede", type:"select", options:["Herr","Frau","Divers"], default:"Herr", position:"epikrise", order:1 },
      { key:"patient_name", label:"Nachname", type:"text", default:"Mustermann", position:"epikrise", order:2 },
      { key:"p2y12", label:"P2Y12", type:"select", options:["Clopidogrel","Prasugrel","Ticagrelor"], default:"Ticagrelor", position:"procedere", order:1 },
      { key:"discharge_date", label:"Entlassdatum", type:"date", default:"21.05.2026", position:"epikrise", order:99 }
    ],
    output: {
      diagnosen: "Akutes Koronarsyndrom bei KHK.",
      epikrise: "{{patient_title}} {{patient_name}} wurde mit akutem Koronarsyndrom stationär aufgenommen. Koronarangiographisch zeigte sich eine interventionspflichtige Läsion, welche in gleicher Sitzung komplikationslos versorgt wurde. Wir entlassen {{patient_title}} {{patient_name}} am {{discharge_date}} in gutem Allgemeinzustand.",
      procedere: "- DAPT mit ASS und {{p2y12}}\n- Kardiologische Verlaufskontrollen"
    }
  }]
};

let state = load();
let activeEditorTextarea = null;

function load(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(DEFAULT_DATA);} catch {return structuredClone(DEFAULT_DATA);} }
function persist(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state, null, 2)); }

const scenario = document.getElementById("scenario");
const fieldForm = document.getElementById("field-form");

function renderTemplates(){
  scenario.innerHTML="";
  state.templates.forEach(t=>{const o=document.createElement("option");o.value=t.id;o.textContent=t.title;scenario.appendChild(o);});
}

function getTemplate(){ return state.templates.find(t=>t.id===scenario.value); }

function inputFor(v){
  if(v.type==="select") return `<select id="${v.key}">${(v.options||[]).map(o=>`<option>${o}</option>`).join("")}</select>`;
  if(v.type==="number") return `<input id="${v.key}" type="number" value="${v.default||""}">`;
  if(v.type==="boolean") return `<select id="${v.key}"><option>ja</option><option>nein</option></select>`;
  return `<input id="${v.key}" value="${v.default||""}">`;
}

function renderForm(){
  const t=getTemplate(); if(!t)return;
  const vars=[...t.variables].sort((a,b)=>a.order-b.order);
  fieldForm.innerHTML=vars.map(v=>`<label>${v.label}</label>${inputFor(v)}`).join("");
  generate();
}

function collect(){
  const t=getTemplate(); const d={};
  t.variables.forEach(v=>d[v.key]=(document.getElementById(v.key)?.value||"").trim());
  return d;
}

function fill(text,data){ return text.replace(/\{\{\s*([\w_]+)\s*\}\}/g,(_,k)=>data[k]??""); }

function generate(){
  const t=getTemplate(); if(!t)return;
  const d=collect();
  document.getElementById("diagnosen").value=fill(t.output.diagnosen,d);
  document.getElementById("epikrise").value=fill(t.output.epikrise,d);
  document.getElementById("procedere").value=fill(t.output.procedere,d);
}

function redrawVarTable(){
  const rows=(getTemplate()?.variables||[]).map(v=>`<tr><td>${v.key}</td><td>${v.label}</td><td>${v.type}</td><td>${v.position}</td><td>${v.order}</td></tr>`).join("");
  document.getElementById("var-table").innerHTML=`<table><tr><th>Key</th><th>Name</th><th>Typ</th><th>Position</th><th>Order</th></tr>${rows}</table>`;
}

// tabs
const vg=document.getElementById("view-generator"), ve=document.getElementById("view-editor");
document.getElementById("tab-generator").onclick=()=>{vg.classList.remove("hidden");ve.classList.add("hidden");document.getElementById("tab-generator").classList.add("active");document.getElementById("tab-editor").classList.remove("active");};
document.getElementById("tab-editor").onclick=()=>{ve.classList.remove("hidden");vg.classList.add("hidden");document.getElementById("tab-editor").classList.add("active");document.getElementById("tab-generator").classList.remove("active");redrawVarTable();};

// editor behavior
["tpl-diagnosen","tpl-epikrise","tpl-procedere"].forEach(id=>{document.getElementById(id).addEventListener("focus",e=>activeEditorTextarea=e.target);});
document.getElementById("insert-var").onclick=()=>{
  const key=document.getElementById("var-key").value.trim(); if(!key||!activeEditorTextarea)return;
  const token=`[[${key}]]`; const t=activeEditorTextarea; const s=t.selectionStart||0,e=t.selectionEnd||0;
  t.value=t.value.slice(0,s)+token+t.value.slice(e); t.selectionStart=t.selectionEnd=s+token.length;
};

document.getElementById("save-var").onclick=()=>{
  const t=getTemplate(); if(!t)return;
  const type=document.getElementById("var-type").value;
  const v={ key:document.getElementById("var-key").value.trim(), label:document.getElementById("var-label").value.trim(), type, position:document.getElementById("var-position").value, order:Number(document.getElementById("var-order").value||1), default:document.getElementById("var-default").value.trim() };
  if(!v.key||!v.label)return;
  if(type==="select") v.options=document.getElementById("var-options").value.split(",").map(x=>x.trim()).filter(Boolean);
  t.variables=t.variables.filter(x=>x.key!==v.key); t.variables.push(v); persist(); renderForm(); redrawVarTable();
};

document.getElementById("save-template").onclick=()=>{
  const id=document.getElementById("template-id").value.trim(); const title=document.getElementById("template-title").value.trim();
  if(!id||!title)return;
  const base=getTemplate() || {variables:[]};
  const tpl={
    id,title,variables:base.variables||[],
    output:{
      diagnosen:document.getElementById("tpl-diagnosen").value.replace(/\[\[([\w_]+)\]\]/g,"{{$1}}"),
      epikrise:document.getElementById("tpl-epikrise").value.replace(/\[\[([\w_]+)\]\]/g,"{{$1}}"),
      procedere:document.getElementById("tpl-procedere").value.replace(/\[\[([\w_]+)\]\]/g,"{{$1}}")
    }
  };
  state.templates=state.templates.filter(x=>x.id!==id); state.templates.push(tpl); persist(); renderTemplates(); scenario.value=id; renderForm(); redrawVarTable();
};

document.getElementById("export-all").onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="arztbrief_templates_all.json"; a.click(); URL.revokeObjectURL(a.href);
};

document.getElementById("import-all").onchange=async(e)=>{
  const f=e.target.files?.[0]; if(!f)return; const parsed=JSON.parse(await f.text());
  if(!Array.isArray(parsed.templates)) return;
  state=parsed; persist(); renderTemplates(); scenario.value=state.templates[0]?.id||""; renderForm(); redrawVarTable();
};

// generator actions
scenario.onchange=()=>{renderForm();
  const t=getTemplate(); if(!t)return;
  document.getElementById("template-id").value=t.id; document.getElementById("template-title").value=t.title;
  document.getElementById("tpl-diagnosen").value=t.output.diagnosen.replace(/\{\{\s*([\w_]+)\s*\}\}/g,"[[$1]]");
  document.getElementById("tpl-epikrise").value=t.output.epikrise.replace(/\{\{\s*([\w_]+)\s*\}\}/g,"[[$1]]");
  document.getElementById("tpl-procedere").value=t.output.procedere.replace(/\{\{\s*([\w_]+)\s*\}\}/g,"[[$1]]");
};
fieldForm.addEventListener("input",generate);
document.getElementById("generate").onclick=generate;
document.getElementById("copy-all").onclick=async()=>{await navigator.clipboard.writeText(["Diagnosen",diagnosen.value,"","Epikrise",epikrise.value,"","Procedere",procedere.value].join("\n"));};

renderTemplates(); scenario.value=state.templates[0].id; scenario.onchange();
