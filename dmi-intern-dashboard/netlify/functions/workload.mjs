import { getStore } from '@netlify/blobs';
import { createHmac, timingSafeEqual } from 'node:crypto';

const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}});
const sign=(payload,secret)=>createHmac('sha256',secret).update(payload).digest('base64url');
function verifyToken(token,secret){
  try{
    const [payload,sig]=String(token||'').split('.'); if(!payload||!sig)return false;
    const expected=sign(payload,secret);const A=Buffer.from(sig),B=Buffer.from(expected);if(A.length!==B.length||!timingSafeEqual(A,B))return false;
    const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    return data.scope==='workload:write' && data.exp>Date.now();
  }catch{return false}
}
function validate(data){
  if(!data||!Array.isArray(data.entries)) return 'Invalid workload payload.';
  if(data.entries.length>1000) return 'Too many workdays in one update.';
  let count=0;
  for(const e of data.entries){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(e.date||'')||!Array.isArray(e.tasks)) return 'Each entry needs a valid date and tasks array.';
    count+=e.tasks.length;if(count>10000)return 'Too many work items in one update.';
    if(e.tasks.some(t=>typeof t!=='string'||t.length>2000)) return 'A work item is invalid or too long.';
  }
  return null;
}

export default async (req)=>{
  const store=getStore({name:'dmi-intern-workload',consistency:'strong'});
  if(req.method==='GET'){
    const data=await store.get('current',{type:'json',consistency:'strong'});
    return data?json(data):json({empty:true,entries:[]},404);
  }
  if(req.method==='POST'){
    const secret=process.env.ADMIN_PASSWORD;
    if(!secret)return json({error:'ADMIN_PASSWORD is not configured.'},500);
    const auth=req.headers.get('authorization')||'';const token=auth.replace(/^Bearer\s+/i,'');
    if(!verifyToken(token,secret))return json({error:'Unauthorized or expired admin session.'},401);
    let data;try{data=await req.json()}catch{return json({error:'Invalid JSON.'},400)}
    const problem=validate(data);if(problem)return json({error:problem},400);
    const current=await store.get('current',{type:'json',consistency:'strong'});
    if(current) await store.setJSON(`snapshots/${Date.now()}`,current);
    const saved={...data,version:1,updatedAt:new Date().toISOString()};
    await store.setJSON('current',saved);
    const items=saved.entries.reduce((n,e)=>n+e.tasks.length,0);
    return json({ok:true,workdays:saved.entries.length,items,data:saved});
  }
  return json({error:'Method not allowed'},405);
};
