(function(){
  const STREAMS = [
    'Paid Ads & Campaign Support',
    'CRM, Lead & Automation',
    'Web, Landing Page & HTML',
    'Reporting & Process Documents',
    'Content & Creative Coordination',
    'Cross-team & Operational Support'
  ];

  const PROJECT_PATTERNS = [
    ['Li Car Guys', /\b(li\s*car\s*guys?|licar)\b/i],
    ['Daniel', /\bdaniel\b/i],
    ['VCC', /\bvcc\b/i],
    ['Dynamic M', /\bdynamic\s*m\b/i],
    ['Summer Breeze', /\b(summer\s*breeze|\bsb\b)\b/i],
    ['Quality (PPF)', /\bquality\b/i],
    ['Vizion', /\bvizion\b/i],
    ['Kalenix', /\bkalenix\b/i],
    ['Angel', /\bangel\b/i]
  ];

  function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}

  function classifyStream(text){
    const s=norm(text);
    const scores={}; STREAMS.forEach(x=>scores[x]=0);
    const add=(stream, n)=>scores[stream]+=n;
    if(/campaign|\bcamp\b|facebook ads|google ads|meta ads|lead form|target|budget|audit plan|media plan|quang cao|publish|creative test|chi so/.test(s)) add(STREAMS[0],4);
    if(/crm|gohighlevel|\bghl\b|orbisx|kalenix|a2p|apps script|automation|workflow|google form|google sheets|sms|lead qualification|doi soat lead/.test(s)) add(STREAMS[1],5);
    if(/website|\bweb\b|landing page|landingpage|\bhtml\b|netlify|privacy policy|terms|policy/.test(s)) add(STREAMS[2],5);
    if(/report|brand guideline|scope of work|slide|tai lieu|quy trinh cho client|what do we need/.test(s)) add(STREAMS[3],4);
    if(/content|video|poster|cta|voiceover|voice|brief|caption|creative vizion|creative template/.test(s)) add(STREAMS[4],3);
    if(/giao task|phoi hop|collect|tong hop|ban giao|team content|team account|quyen truy cap/.test(s)) add(STREAMS[5],2);
    let best=STREAMS[5], max=0;
    for(const [k,v] of Object.entries(scores)){if(v>max){best=k;max=v}}
    return best;
  }

  function detectProject(text){
    for(const [name,re] of PROJECT_PATTERNS){if(re.test(text)) return name}
    return 'Internal / General';
  }

  function detectType(text){
    const s=norm(text);
    if(/bai tap|thuc hanh/.test(s)) return 'Practice';
    if(/draft|ban nhap/.test(s)) return 'Draft';
    return 'Assigned work';
  }

  function cleanTask(text, forcePractice=false){
    let t=String(text||'').replace(/\s+/g,' ').trim().replace(/^[•\-–—]\s*/,'');
    if(!t) return '';
    const s=norm(t);
    if(forcePractice && /audit plan|media plan|ke hoach truyen thong/.test(s) && !/bai tap|thuc hanh/.test(s)){
      t=t.replace(/^Hoàn (thành|thiện)\s+/i,'').replace(/^Chỉnh sửa và cập nhật\s+/i,'').trim();
      t='Bài tập thực hành – '+t.charAt(0).toLowerCase()+t.slice(1);
    }
    return t;
  }

  function enrichTask(text){
    const clean=cleanTask(text,false);
    return {text:clean,stream:classifyStream(clean),project:detectProject(clean),type:detectType(clean)};
  }

  function formatDate(iso){
    const d=new Date(iso+'T00:00:00');
    return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
  }
  function shortDate(iso){
    const d=new Date(iso+'T00:00:00');
    return {day:String(d.getDate()).padStart(2,'0'),month:new Intl.DateTimeFormat('en-US',{month:'short'}).format(d).toUpperCase()};
  }
  function taskKey(date,text){return date+'|'+norm(text).replace(/\W+/g,' ').trim()}
  function flatten(data){
    const out=[];
    (data.entries||[]).forEach(e=>(e.tasks||[]).forEach(t=>out.push({date:e.date,...enrichTask(typeof t==='string'?t:t.text)})));
    return out;
  }
  function mergeData(base, incoming){
    const map=new Map();
    for(const source of [base,incoming]){
      (source.entries||[]).forEach(e=>(e.tasks||[]).forEach(t=>{
        const text=typeof t==='string'?t:t.text;
        const key=taskKey(e.date,text);
        if(!map.has(key)) map.set(key,{date:e.date,text});
      }));
    }
    const byDate={};
    [...map.values()].sort((a,b)=>a.date.localeCompare(b.date)).forEach(x=>{(byDate[x.date]??=[]).push(x.text)});
    return {version:1,entries:Object.entries(byDate).map(([date,tasks])=>({date,tasks}))};
  }
  function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))}
  window.DMI={STREAMS,norm,classifyStream,detectProject,detectType,cleanTask,enrichTask,formatDate,shortDate,taskKey,flatten,mergeData,escapeHtml};
})();
