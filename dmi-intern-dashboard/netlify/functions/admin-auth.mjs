import { createHmac, timingSafeEqual } from 'node:crypto';

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const safeEqual=(a,b)=>{const A=Buffer.from(String(a)),B=Buffer.from(String(b));return A.length===B.length && timingSafeEqual(A,B)};
const sign=(payload,secret)=>createHmac('sha256',secret).update(payload).digest('base64url');

export default async (req)=>{
  if(req.method!=='POST') return json({error:'Method not allowed'},405);
  const secret=process.env.ADMIN_PASSWORD;
  if(!secret) return json({error:'ADMIN_PASSWORD is not configured in Netlify environment variables.'},500);
  let body={};try{body=await req.json()}catch{return json({error:'Invalid request'},400)}
  if(!safeEqual(body.password||'',secret)) return json({error:'Incorrect password'},401);
  const payload=Buffer.from(JSON.stringify({scope:'workload:write',exp:Date.now()+8*60*60*1000})).toString('base64url');
  return json({token:`${payload}.${sign(payload,secret)}`});
};
