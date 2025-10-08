import React, { useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
const uid = () => Math.random().toString(36).slice(2,10);
const todayISO = () => new Date().toISOString().slice(0,10);
const parseISO = s => new Date(`${s}T00:00:00`);
function monFri(startISO,endISO){const out=[];const d=parseISO(startISO);const e=parseISO(endISO);while(d<=e){const day=d.getUTCDay();if(day===1||day===5) out.push(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()+1);}return out;}
function stats(p,win){const sW=p.start_weight_kg,sWa=p.start_waist_cm;const w=p.weighIns.filter(x=>x.date>=win.startDate&&x.date<=win.endDate);const last=[...w].reverse().find(x=>x.weight_kg!=null||x.waist_cm!=null)||{};const lw=last.weight_kg??sW, lwa=last.waist_cm??sWa;const dKg=Math.max(0,sW-lw), dWa=Math.max(0,sWa-lwa);const wPct=sW?(dKg/sW)*100:0, waPct=sWa?(dWa/sWa)*100:0;const sched=monFri(win.startDate,win.endDate);const att=sched.filter(d=>p.weighIns.find(x=>x.date===d&&x.attended)).length;const attPct=sched.length?(att/sched.length)*100:0;const score=0.6*wPct+0.3*waPct+0.1*attPct;return{dKg,dWa,wPct,waPct,attPct,score,att,sched:sched.length};}
function rank(list,win){return list.map(p=>({p,st:stats(p,win)})).sort((a,b)=>b.st.score-a.st.score).map((x,i)=>({rank:i+1,...x}));}
export default function App(){
 const [challenge,setChallenge]=useState({startDate:todayISO(),endDate:todayISO()});
 const [participants,setParticipants]=useState([]);
 const [activeDate,setActiveDate]=useState(todayISO());
 const form=useRef({name:'',email:'',phone:'',gender:'',height_cm:'',start_weight_kg:'',start_waist_cm:''});
 const [_,bump]=useState(0);
 const schedule=useMemo(()=>monFri(challenge.startDate,challenge.endDate),[challenge]);
 const ranked=useMemo(()=>rank(participants,challenge),[participants,challenge]);
 function add(){const f=form.current;if(!f.name||!f.start_weight_kg||!f.start_waist_cm){alert('Name, Start Weight, and Start Waist are required.');return;}const p={id:uid(),name:f.name.trim(),email:f.email?.trim()||undefined,phone:f.phone?.trim()||undefined,gender:f.gender||undefined,height_cm:f.height_cm?Number(f.height_cm):undefined,start_weight_kg:Number(f.start_weight_kg),start_waist_cm:Number(f.start_waist_cm),registered_at:Date.now(),weighIns:schedule.map(d=>({date:d,attended:false}))};setParticipants(v=>[...v,p]);form.current={name:'',email:'',phone:'',gender:'',height_cm:'',start_weight_kg:'',start_waist_cm:''};bump(x=>x+1);} 
 function upd(pid,date,patch){setParticipants(v=>v.map(p=>{if(p.id!==pid)return p;const i=p.weighIns.findIndex(x=>x.date===date);const w=i===-1?{date}:p.weighIns[i];const n={...w,...patch};const arr=i===-1?[...p.weighIns,n]:p.weighIns.map((x,j)=>j===i?n:x);return {...p,weighIns:arr};}));}
 return (<div style={{padding:16,maxWidth:1100,margin:'0 auto',fontFamily:'system-ui, sans-serif'}}>
  <h1 style={{fontSize:28,fontWeight:700}}>Candy Group App</h1>
  <p>Register participants (phone & gender), Mon/Fri weigh-ins, leaderboard & charts.</p>
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
    <div style={{border:'1px solid #ddd',borderRadius:12,padding:12}}>
      <h3>Challenge Window</h3>
      <div><label>Start </label><input type='date' value={challenge.startDate} onChange={e=>setChallenge({...challenge,startDate:e.target.value})}/></div>
      <div><label>End </label><input type='date' value={challenge.endDate} onChange={e=>setChallenge({...challenge,endDate:e.target.value})}/></div>
      <div>Sessions (Mon/Fri): <b>{schedule.length}</b></div>
    </div>
    <div style={{border:'1px solid #ddd',borderRadius:12,padding:12}}>
      <h3>Add Participant</h3>
      <input placeholder='Name *' value={form.current.name} onChange={e=>{form.current.name=e.target.value;bump(x=>x+1)}}/>
      <input placeholder='Email' value={form.current.email} onChange={e=>{form.current.email=e.target.value;bump(x=>x+1)}}/>
      <input placeholder='Phone' value={form.current.phone} onChange={e=>{form.current.phone=e.target.value;bump(x=>x+1)}}/>
      <select value={form.current.gender} onChange={e=>{form.current.gender=e.target.value;bump(x=>x+1)}}><option value=''>— Gender —</option><option value='male'>Male</option><option value='female'>Female</option></select>
      <input type='number' placeholder='Height (cm)' value={form.current.height_cm} onChange={e=>{form.current.height_cm=e.target.value;bump(x=>x+1)}}/>
      <input type='number' placeholder='Start Weight (kg) *' value={form.current.start_weight_kg} onChange={e=>{form.current.start_weight_kg=e.target.value;bump(x=>x+1)}}/>
      <input type='number' placeholder='Start Waist (cm) *' value={form.current.start_waist_cm} onChange={e=>{form.current.start_waist_cm=e.target.value;bump(x=>x+1)}}/>
      <button onClick={add}>Save</button>
    </div>
  </div>
  <div style={{border:'1px solid #ddd',borderRadius:12,padding:12,marginTop:16}}>
    <h3>Record Weigh-ins</h3>
    <div><label>Date </label><input type='date' value={activeDate} onChange={e=>setActiveDate(e.target.value)}/></div>
    <table><thead><tr><th>Name</th><th>Weight</th><th>Waist</th><th>Attended</th></tr></thead><tbody>
    {participants.map(p=>{const w=p.weighIns.find(x=>x.date===activeDate)||{date:activeDate};return (
      <tr key={p.id}><td>{p.name}</td>
      <td><input type='number' value={w.weight_kg??''} onChange={e=>upd(p.id,activeDate,{weight_kg:e.target.value?Number(e.target.value):undefined})}/></td>
      <td><input type='number' value={w.waist_cm??''} onChange={e=>upd(p.id,activeDate,{waist_cm:e.target.value?Number(e.target.value):undefined})}/></td>
      <td><input type='checkbox' checked={!!w.attended} onChange={e=>upd(p.id,activeDate,{attended:e.target.checked})}/></td></tr>
    );})}
    </tbody></table>
  </div>
  <div style={{border:'1px solid #ddd',borderRadius:12,padding:12,marginTop:16}}>
    <h3>Leaderboard</h3>
    <table><thead><tr><th>#</th><th>Name</th><th>Score</th><th>Weight Δ</th><th>Waist Δ</th><th>Attendance</th></tr></thead><tbody>
      {ranked.map(({rank,p,st})=> (
        <tr key={p.id}><td>{rank}</td><td>{p.name}</td><td>{st.score.toFixed(2)}</td><td>-{st.dKg.toFixed(2)} kg ({st.wPct.toFixed(1)}%)</td><td>-{st.dWa.toFixed(1)} cm ({st.waPct.toFixed(1)}%)</td><td>{st.attPct.toFixed(0)}% ({st.att}/{st.sched})</td></tr>
      ))}
    </tbody></table>
    <div style={{height:260}}>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart data={[...ranked].slice(0,10).map(x=>({name:x.p.name,value:Number(x.st.wPct.toFixed(2))}))}>
          <XAxis dataKey='name' hide/>
          <YAxis/>
          <Tooltip formatter={v=>`${v}%`}/>
          <Bar dataKey='value'/>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
 </div>);
}
