const $=id=>document.getElementById(id);
let TOKEN=sessionStorage.getItem('dmiAdminToken')||'';
let PARSED=null;
let CURRENT=null;

function setLoginState(ok){$('loginView').classList.toggle('hidden',ok);$('adminView').classList.toggle('hidden',!ok);$('logoutBtn').classList.toggle('hidden',!ok)}
if(TOKEN) setLoginState(true);

$('loginBtn').addEventListener('click',login);
$('passwordInput').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
$('logoutBtn').addEventListener('click',()=>{TOKEN='';sessionStorage.removeItem('dmiAdminToken');setLoginState(false);$('passwordInput').value=''});

async function login(){
  const password=$('passwordInput').value;
  if(!password)return;
  $('loginStatus').className='admin-status';$('loginStatus').textContent='Checking…';
  try{
    const r=await fetch('/api/admin-auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})});
    const j=await r.json();
    if(!r.ok) throw new Error(j.error||'Login failed');
    TOKEN=j.token;sessionStorage.setItem('dmiAdminToken',TOKEN);setLoginState(true);$('loginStatus').textContent='';
  }catch(e){$('loginStatus').className='admin-status err';$('loginStatus').textContent=e.message}
}

const drop=$('dropZone');
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('drag')}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('drag')}));
drop.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(f)parseFile(f)});
$('fileInput').addEventListener('change',e=>{const f=e.target.files[0];if(f)parseFile(f)});
$('practiceToggle').addEventListener('change',()=>{if(PARSED) parseFile(PARSED.file)});

function splitTasks(value){
  const lines=String(value||'').replace(/\r/g,'\n').split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
  const out=[];let cur='';
  for(const line of lines){
    const m=line.match(/^\s*\d+[\.)]\s*(.*)$/);
    if(m){if(cur)out.push(cur.trim());cur=m[1].trim();}
    else{cur=cur?cur+' '+line:line}
  }
  if(cur)out.push(cur.trim());
  return out.filter(Boolean);
}
function excelDate(v){
  if(v instanceof Date && !Number.isNaN(v.valueOf())) return v.toISOString().slice(0,10);
  if(typeof v==='number' && window.XLSX){const d=XLSX.SSF.parse_date_code(v);if(d)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`}
  const s=String(v||'').trim();
  if(/^\d{4}-\d{1,2}-\d{1,2}/.test(s)){const [y,m,d]=s.split(/[ T]/)[0].split('-');return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`}
  const m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  const d=new Date(s);return Number.isNaN(d.valueOf())?'':d.toISOString().slice(0,10);
}
function headerKey(s){return DMI.norm(s).replace(/\s+/g,' ').trim()}

async function parseFile(file){
  if(!window.XLSX){setPublish('Excel parser could not load. Check internet access and reload the admin page.',false,true);return}
  if(file.size>8*1024*1024){setPublish('File is too large. Keep the weekly workload file under 8 MB.',false,true);return}
  const buf=await file.arrayBuffer();
  const wb=XLSX.read(buf,{type:'array',cellDates:true});
  const ws=wb.Sheets[wb.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
  if(!rows.length) return setPublish('No rows found in the uploaded file.',false,true);
  const headers=rows[0].map(headerKey);
  const dateIx=headers.findIndex(h=>h==='ngay');
  const contentIx=headers.findIndex(h=>h==='noi dung');
  if(dateIx<0||contentIx<0) return setPublish('Required columns not found. The first sheet needs “Ngày” and “Nội dung”.',false,true);
  const forcePractice=$('practiceToggle').checked;
  const entries=[];
  for(const row of rows.slice(1)){
    const date=excelDate(row[dateIx]);if(!date)continue;
    const tasks=splitTasks(row[contentIx]).map(t=>DMI.cleanTask(t,forcePractice)).filter(Boolean);
    if(tasks.length) entries.push({date,tasks});
  }
  if(!entries.length) return setPublish('No valid workload entries were found in Ngày + Nội dung.',false,true);
  PARSED={file, data:{version:1,sourceName:file.name,entries}};
  const flat=DMI.flatten(PARSED.data);
  $('fileMeta').classList.remove('hidden');$('metaFile').textContent=file.name;$('metaDays').textContent=new Set(flat.map(x=>x.date)).size;$('metaTasks').textContent=flat.length;
  renderPreview(flat);$('publishBtn').disabled=false;setPublish('Preview ready. Review wording before publishing.',true,false);
}

function renderPreview(flat){
  $('previewEmpty').classList.add('hidden');$('previewWrap').classList.remove('hidden');
  $('previewBody').innerHTML=flat.map((x,i)=>`<tr data-index="${i}" data-date="${x.date}"><td>${DMI.formatDate(x.date)}</td><td><textarea class="task-edit">${DMI.escapeHtml(x.text)}</textarea></td><td><select class="stream-edit">${DMI.STREAMS.map(s=>`<option ${s===x.stream?'selected':''}>${DMI.escapeHtml(s)}</option>`).join('')}</select></td><td>${DMI.escapeHtml(x.project)}</td><td>${x.type==='Practice'?'<span class="badge practice">Practice</span>':DMI.escapeHtml(x.type)}</td></tr>`).join('');
}
function reviewedData(){
  const byDate={};
  document.querySelectorAll('#previewBody tr').forEach(tr=>{const date=tr.dataset.date;const text=tr.querySelector('.task-edit').value.trim();if(text)(byDate[date]??=[]).push(text)});
  return {version:1,sourceName:PARSED?.file?.name||'upload.xlsx',entries:Object.entries(byDate).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,tasks])=>({date,tasks}))};
}

async function loadCurrent(){
  if(CURRENT)return CURRENT;
  try{const r=await fetch('/api/workload',{cache:'no-store'});if(r.ok){const j=await r.json();if(j.entries?.length){CURRENT=j;return j}}}catch(_){ }
  const r=await fetch('/data/initial-workload.json',{cache:'no-store'});CURRENT=await r.json();return CURRENT;
}

$('publishBtn').addEventListener('click',async()=>{
  if(!PARSED||!TOKEN)return;
  $('publishBtn').disabled=true;setPublish('Preparing dashboard update…',false,false);
  try{
    const mode=document.querySelector('input[name="mode"]:checked').value;
    const reviewed=reviewedData();
    const base=mode==='merge'?await loadCurrent():{entries:[]};
    const finalData=mode==='merge'?DMI.mergeData(base,reviewed):reviewed;
    finalData.sourceName=PARSED.file.name;
    const r=await fetch('/api/workload',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+TOKEN},body:JSON.stringify(finalData)});
    const j=await r.json();
    if(r.status===401){TOKEN='';sessionStorage.removeItem('dmiAdminToken');setLoginState(false);throw new Error('Admin session expired. Log in again.')}
    if(!r.ok)throw new Error(j.error||'Publish failed');
    CURRENT=j.data||finalData;
    setPublish(`Published successfully · ${j.workdays||''} workdays · ${j.items||''} work items.`,true,false);
  }catch(e){setPublish(e.message,false,true)}finally{$('publishBtn').disabled=false}
});

function setPublish(msg,ok=false,err=false){$('publishStatus').textContent=msg;$('publishStatus').className='admin-status'+(ok?' ok':'')+(err?' err':'')}
