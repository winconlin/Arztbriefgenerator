window.APP_CONFIG = {
  defaults: {
    ldl_target: '<55 mg/dl',
    dapt_elective_months: 6,
    dapt_acs_months: 12,
    date_format: 'TT.MM.JJJJ'
  },
  synonyms: {
    showed: ['zeigte sich', 'imponierte', 'stellte sich dar', 'fand sich'],
    uncomplicated: ['komplikationslos', 'ohne periinterventionelle Komplikationen'],
    discharged: ['Wir entlassen', 'Entlassen wird']
  },
  fieldMatrix: [
    { key: 'sex', label: 'Geschlecht', type: 'select', options: ['männlich','weiblich','divers'], required: true },
    { key: 'age', label: 'Alter', type: 'number', required: true },
    { key: 'admission_date', label: 'Aufnahmedatum (TT.MM.JJJJ)', type: 'text', required: true },
    { key: 'discharge_date', label: 'Entlassdatum (TT.MM.JJJJ)', type: 'text', required: true },
    { key: 'risk_factors', label: 'Risikofaktoren', type: 'textarea', required: false }
  ],
  caseGroups: {
    'Koronar': ['elective_pci','acs_pci'],
    'Device': ['pm_icd_crt','lifevest'],
    'Klappenvitien': ['tavi_teer_opv'],
    'Lungenarterienembolie': ['lae'],
    'Rhythmologie': ['cardioversion','pvi_epu']
  },
  templates: {
    elective_pci: {
      name: 'Elektive PCI',
      fields: [
        { key:'vessel_disease', label:'Gefäßerkrankung', type:'select', options:['1','2','3'], required:true },
        { key:'target_vessel', label:'Zielgefäß', type:'text', required:true },
        { key:'stent_count', label:'Anzahl DES', type:'number', required:true },
        { key:'dapt_months', label:'DAPT Monate', type:'number', required:true, default:6 },
        { key:'p2y12', label:'P2Y12', type:'select', options:['Clopidogrel','Prasugrel','Ticagrelor'], required:true },
        { key:'access', label:'Punktionszugang/Seite', type:'text', required:true, placeholder:'z. B. A. radialis rechts' }
      ],
      generate: (d, s) => ({
        diagnosen: `Chronisches Koronarsyndrom bei ${d.vessel_disease}-Gefäßerkrankung mit hochgradiger Stenose des ${d.target_vessel}. Aktuell: PCI mit ${d.stent_count} DES.`,
        epikrise: `Die stationäre Aufnahme erfolgte am ${d.admission_date} zur elektiven Koronarangiographie. Koronarangiographisch ${s.showed} eine ${d.vessel_disease}-Gefäßerkrankung mit Zielstenose ${d.target_vessel}, die in gleicher Sitzung ${s.uncomplicated} mittels PCI und DES-Implantation versorgt wurde. Aufgrund der Stentimplantation empfehlen wir eine duale Plättchenhemmung mit ASS und ${d.p2y12} für ${d.dapt_months} Monate. ${s.discharged} den Patienten am ${d.discharge_date} in stabilem Allgemeinzustand.`,
        procedere: `• DAPT mit ASS + ${d.p2y12} für ${d.dapt_months} Monate, danach ASS-Monotherapie.\n• Ziel-LDL ${window.APP_CONFIG.defaults.ldl_target}.\n• Punktionsstelle (${d.access}) klinisch reizlos bei Entlassung.`
      })
    },
    acs_pci: {
      name: 'ACS-PCI',
      fields: [
        { key:'acs_type', label:'ACS-Typ', type:'select', options:['STEMI','NSTEMI','Instabile AP'], required:true },
        { key:'target_vessel', label:'Infarktgefäß', type:'text', required:true },
        { key:'stent_count', label:'Anzahl DES', type:'number', required:true },
        { key:'ck_max', label:'CK max (nur STEMI)', type:'text', required:false },
        { key:'p2y12', label:'P2Y12', type:'select', options:['Ticagrelor','Prasugrel','Clopidogrel'], required:true }
      ],
      generate: (d, s) => ({
        diagnosen: `${d.acs_type} bei koronarer Erkrankung mit hochgradiger Stenose/Verschluss des ${d.target_vessel}. Aktuell PCI mit ${d.stent_count} DES.`,
        epikrise: `Die Aufnahme erfolgte am ${d.admission_date} mit akutem Koronarsyndrom. Koronarangiographisch ${s.showed} eine relevante Läsion des ${d.target_vessel}, welche ${s.uncomplicated} rekanalisiert wurde. ${d.ck_max ? `Maximale CK-Auslenkung: ${d.ck_max}. ` : ''}DAPT mit ASS und ${d.p2y12} ist für 12 Monate indiziert. ${s.discharged} am ${d.discharge_date} in stabilem Zustand.`,
        procedere: `• DAPT ASS + ${d.p2y12} für 12 Monate (anpassbar), anschließend Monotherapie.\n• Statintherapie mit Ziel-LDL ${window.APP_CONFIG.defaults.ldl_target}.`
      })
    },
    pm_icd_crt: { name:'Device-Implantation (PM/ICD/CRT-P/CRT-D)', fields:[
      { key:'device_type', label:'Device-Typ', type:'select', options:['PM','ICD','CRT-P','CRT-D'], required:true },
      { key:'manufacturer', label:'Firma/Aggregat', type:'text', required:true },
      { key:'sn', label:'Seriennummer', type:'text', required:true },
      { key:'implant_date', label:'Implantationsdatum', type:'text', required:true },
      { key:'followup_date', label:'Kontrolltermin', type:'text', required:true }
    ], generate:(d,s)=>({
      diagnosen:`Implantation eines ${d.device_type}-Systems (${d.manufacturer}, SN: ${d.sn}) am ${d.implant_date}.`,
      epikrise:`Stationäre Aufnahme zur elektiven ${d.device_type}-Implantation. Die Implantation erfolgte ${s.uncomplicated}. Radiomorphologisch korrekte Lage ohne Pneumothorax. In der Device-Kontrolle ${s.showed} eine regelrechte Funktion. ${s.discharged} am ${d.discharge_date} in stabilem Zustand.`,
      procedere:`• Wundkontrollen, Fadenzug nach 8–10 Tagen.\n• Device-Kontrolle am ${d.followup_date} (mit Überweisung).`
    })},
    lifevest:{name:'LifeVest-Versorgung',fields:[{key:'indication',label:'Indikation',type:'text',required:true}],generate:(d)=>({diagnosen:`LifeVest-Versorgung bei ${d.indication}.`,epikrise:`Zur Überbrückung bis zur definitiven Device-Entscheidung wurde eine LifeVest eingeleitet.`,procedere:`• LifeVest-Schulung und tägliche Tragezeit adherence-kontrolliert.\n• Rhythmologische Wiedervorstellung terminiert.`})},
    tavi_teer_opv:{name:'OPV: TAVI / M-TEER / T-TEER / operativer Ersatz',fields:[{key:'procedure_type',label:'Verfahren',type:'select',options:['TAVI','M-TEER','T-TEER','Operativer Klappenersatz'],required:true},{key:'koef',label:'KÖF (cm²)',type:'text',required:false},{key:'pmean',label:'pmean (mmHg)',type:'text',required:false},{key:'opv_checks',label:'Abgeschlossene OPV-Checks',type:'textarea',required:true}],generate:(d,s)=>({diagnosen:`Hochgradiges Klappenvitium mit Indikation zu ${d.procedure_type}.`,epikrise:`Echokardiographisch ${s.showed} ${d.koef ? `eine KÖF von ${d.koef} cm²` : 'ein hochgradiges Vitium'}${d.pmean ? ` bei pmean ${d.pmean} mmHg` : ''}. Die OP-Vorbereitung wurde gemäß Hausstandard durchgeführt (${d.opv_checks}).`,procedere:`• Terminmodul mit Datum/Uhrzeit/Ort und Überweisungspflicht dokumentieren.\n• Vorbefunde extern einholen, Doppeluntersuchungen vermeiden.`})},
    lae:{name:'Lungenarterienembolie inkl. Thrombektomie-Option',fields:[{key:'lae_type',label:'LAE-Muster',type:'text',required:true},{key:'thrombectomy',label:'Thrombektomie',type:'select',options:['nein','ja'],required:true},{key:'oac_months',label:'OAK Dauer (Monate)',type:'number',required:true}],generate:(d)=>({diagnosen:`${d.lae_type} Lungenarterienembolie.${d.thrombectomy==='ja'?' Interventionelle Thrombektomie erfolgt.':''}`,epikrise:`Aufnahme bei Dyspnoe, CT-thorakal bestätigte ${d.lae_type} LAE. Antikoagulation stufenweise eingeleitet und oral fortgeführt.`,procedere:`• OAK für ${d.oac_months} Monate (anpassbar je Provokationsstatus).\n• Kompressionsstrümpfe Klasse II und Verlaufskontrolle.`})},
    cardioversion:{name:'Elektrische Kardioversion',fields:[{key:'arrhythmia',label:'Rhythmus',type:'text',required:true},{key:'energy',label:'Energie (J)',type:'text',required:true},{key:'chadsvasc',label:'CHA2DS2-VASc',type:'number',required:true},{key:'oac',label:'OAK',type:'text',required:true}],generate:(d)=>({diagnosen:`Elektrische Kardioversion bei ${d.arrhythmia} mit ${d.energy} J.`,epikrise:`Nach TEE-basiertem Thrombusausschluss erfolgte die Kardioversion in Kurznarkose erfolgreich. Bei CHA2DS2-VASc ${d.chadsvasc} wurde OAK mit ${d.oac} festgelegt.`,procedere:`• OAK-Fortführung regelbasiert nach CHA2DS2-VASc.\n• Rhythmologische Wiedervorstellung terminieren.`})},
    pvi_epu:{name:'PVI / Sonstige EPU',fields:[{key:'epu_type',label:'EPU-Typ',type:'select',options:['PVI','AVNRT-Ablation','AVRT/WPW-Ablation','CTI-Ablation'],required:true},{key:'energy',label:'Energie/Technik',type:'select',options:['Kryo','RF','PFA'],required:false}],generate:(d)=>({diagnosen:`${d.epu_type} durchgeführt${d.energy?` (${d.energy})`:''}.`,epikrise:`Nach Ausschluss intrakavitärer Thromben erfolgte die elektrophysiologische Prozedur komplikationslos. Postinterventionell kein Perikarderguss.`,procedere:`• OAK-/PPI-Regeln gemäß Prozedurtyp und Score anwenden.\n• Wiedervorstellung in rhythmologischer Ambulanz.`})}
  }
};
