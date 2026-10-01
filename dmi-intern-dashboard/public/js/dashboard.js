let DATA=null;
let FLAT=[];
const $=id=>document.getElementById(id);

async function loadData(){
  $('timelineList').innerHTML='<div class="panel empty loading">Loading dashboard data…</div>';
  let data=null;
  try{
    const r=await fetch('/api/workload',{cache:'no-store'});
    if(r.ok){const j=await r.json(); if(j && j.entries && j.entries.length) data=j;}
  }catch(_){ }
  if(!data){
    const r=await fetch('/data/initial-workload.json',{cache:'no-store'});
    data=await r.json();
  }
  DATA=data; FLAT=DMI.flatten(data);
  initFilters(); render();
}

function initFilters(){
  const streams=[...new Set(FLAT.map(x=>x.stream))].sort();
  const projects=[...new Set(FLAT.map(x=>x.project))].sort((a,b)=>a==='Internal / General'?1:a.localeCompare(b));
  $('streamFilter').innerHTML='<option value="">All workstreams</option>'+streams.map(s=>`<option>${DMI.escapeHtml(s)}</option>`).join('');
  $('projectFilter').innerHTML='<option value="">All projects</option>'+projects.map(s=>`<option>${DMI.escapeHtml(s)}</option>`).join('');
}

function filtered(){
  const q=DMI.norm($('searchInput').value);
  const stream=$('streamFilter').value;
  const project=$('projectFilter').value;
  const days=$('periodFilter').value;
  let minDate=null;
  if(days!=='all' && FLAT.length){
    const latest=new Date(Math.max(...FLAT.map(x=>new Date(x.date+'T00:00:00').getTime())));
    latest.setDate(latest.getDate()-Number(days)+1); minDate=latest;
  }
  return FLAT.filter(x=>(!q||DMI.norm(x.text+' '+x.project+' '+x.stream).includes(q))&&(!stream||x.stream===stream)&&(!project||x.project===project)&&(!minDate||new Date(x.date+'T00:00:00')>=minDate));
}

function render(){
  const items=filtered();
  const allDates=[...new Set(FLAT.map(x=>x.date))].sort();
  const allStreams=new Set(FLAT.map(x=>x.stream));
  const allProjects=new Set(FLAT.filter(x=>x.project!=='Internal / General').map(x=>x.project));
  $('kpiDays').textContent=allDates.length;
  $('kpiTasks').textContent=FLAT.length;
  $('kpiStreams').textContent=allStreams.size;
  $('kpiProjects').textContent=allProjects.size;
  if(allDates.length){
    $('periodPill').textContent=`${DMI.formatDate(allDates[0])} — ${DMI.formatDate(allDates[allDates.length-1])}`;
  }
  const updated=DATA.updatedAt?new Date(DATA.updatedAt):null;
  $('updatedText').textContent=updated && !Number.isNaN(updated.valueOf()) ? `Updated ${new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(updated)}` : '';
  renderBars(items); renderProjects(items); renderTimeline(items);
}

function renderBars(items){
  const counts={}; items.forEach(x=>counts[x.stream]=(counts[x.stream]||0)+1);
  const rows=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const max=Math.max(1,...rows.map(x=>x[1]));
  $('workstreamBars').innerHTML=rows.length?rows.map(([name,count])=>`<div class="bar-row"><div class="bar-label">${DMI.escapeHtml(name)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(4,count/max*100)}%"></div></div><div class="bar-count">${count}</div></div>`).join(''):'<div class="empty">No matching workload.</div>';
}

function renderProjects(items){
  const counts={}; items.forEach(x=>counts[x.project]=(counts[x.project]||0)+1);
  const rows=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10);
  $('projectList').innerHTML=rows.length?rows.map(([name,count])=>`<div class="project-row"><span class="project-name">${DMI.escapeHtml(name)}</span><span class="count-badge">${count}</span></div>`).join(''):'<div class="empty">No matching projects.</div>';
}

function renderTimeline(items){
  const byDate={}; items.forEach(x=>(byDate[x.date]??=[]).push(x));
  const dates=Object.keys(byDate).sort().reverse();
  $('resultText').textContent=`${items.length} work items across ${dates.length} workdays`;
  if(!dates.length){$('timelineList').innerHTML='<div class="panel empty">No workload matches the current filters.</div>';return;}
  $('timelineList').innerHTML=dates.map((date,i)=>{
    const d=DMI.shortDate(date), tasks=byDate[date];
    const streams=[...new Set(tasks.map(x=>x.stream))];
    return `<details class="day" ${i<2?'open':''}><summary><div class="day-main"><div class="datebox"><b>${d.day}</b><span>${d.month}</span></div><div><div class="day-title">${DMI.formatDate(date)}</div><div class="day-meta">${tasks.length} work item${tasks.length>1?'s':''} · ${streams.length} workstream${streams.length>1?'s':''}</div></div></div><div class="chev">⌄</div></summary><div class="tasks">${tasks.map((t,j)=>`<div class="task"><div class="task-n">${j+1}</div><div class="task-text">${DMI.escapeHtml(t.text)}</div><div class="badges">${t.type==='Practice'?'<span class="badge practice">Practice</span>':''}<span class="badge stream">${DMI.escapeHtml(t.stream.replace(' & ',' / '))}</span>${t.project!=='Internal / General'?`<span class="badge project">${DMI.escapeHtml(t.project)}</span>`:''}</div></div>`).join('')}</div></details>`;
  }).join('');
}

['searchInput','streamFilter','projectFilter','periodFilter'].forEach(id=>$(id).addEventListener(id==='searchInput'?'input':'change',render));
$('resetFilters').addEventListener('click',()=>{$('searchInput').value='';$('streamFilter').value='';$('projectFilter').value='';$('periodFilter').value='all';render()});
$('refreshBtn').addEventListener('click',loadData);
loadData();
