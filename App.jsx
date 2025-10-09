import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate, NavLink } from 'react-router-dom'

const CHALLENGE = { startDate: '2025-10-13', endDate: '2025-12-05' } // attendance window

function weekdaysBetween(startISO, endISO) {
  const out = []
  const d = new Date(`${startISO}T00:00:00Z`)
  const e = new Date(`${endISO}T00:00:00Z`)
  while (d <= e) {
    const day = d.getUTCDay()
    if (day >= 1 && day <= 5) out.push(d.toISOString().slice(0,10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

function useAuth() {
  const [user, setUser] = useState(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user || null))
    return () => sub.subscription.unsubscribe()
  }, [])
  return { user, setUser }
}

function useIsAdmin(user) {
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('is_admin')
      setIsAdmin(!!data && !error)
    })()
  }, [user])
  return isAdmin
}

function AuthBox({ user, setUser }) {
  async function signIn(e) {
    e.preventDefault()
    const email = new FormData(e.currentTarget).get('email')
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) alert(error.message)
    else alert('Check your email for a sign-in link.')
  }
  async function signOut() { await supabase.auth.signOut(); setUser(null) }
  return (
    <div style={{display:'flex',gap:8,alignItems:'center'}}>
      {user ? (<>
        <span style={{fontSize:12, color:'#334155'}}>Signed in: {user.email}</span>
        <button className="btn" onClick={signOut}>Sign out</button>
      </>) : (
        <form onSubmit={signIn} style={{display:'flex',gap:6}}>
          <input name="email" placeholder="you@example.com" className="input" required />
          <button className="btn">Sign in</button>
        </form>
      )}
    </div>
  )
}

function Header({ user, setUser }) {
  return (
    <header>
      <div className="inner">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <img src="/logo.jpg" alt="Candy Group" style={{height:40, borderRadius:8}}/>
          <div style={{fontWeight:800, fontSize:18}}>Candy Group App</div>
        </div>
        <nav style={{display:'flex',gap:6}}>
          <NavLink to="/participants" className={({isActive})=> isActive? 'active' : undefined }>Participants</NavLink>
          <NavLink to="/attendance" className={({isActive})=> isActive? 'active' : undefined }>Attendance</NavLink>
        </nav>
        <AuthBox user={user} setUser={setUser} />
      </div>
    </header>
  )
}

function PhotoGrid({ participantId }) {
  const [photos, setPhotos] = useState([])
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('photos').select('*')
        .eq('participant_id', participantId)
        .order('inserted_at', { ascending: false })
      setPhotos(data || [])
    })()
  }, [participantId])
  return (
    <div className="grid" style={{gridTemplateColumns:'repeat(3,minmax(0,1fr))'}}>
      {photos.map(ph => (
        <a key={ph.id} href={ph.public_url} target="_blank" rel="noreferrer">
          <img src={ph.public_url} alt="" style={{width:'100%',height:96,objectFit:'cover',borderRadius:10}}/>
        </a>
      ))}
      {photos.length===0 && <div style={{color:'#64748b', fontSize:12}}>No photos yet.</div>}
    </div>
  )
}

function ParticipantsPage({ participants, isAdmin, onUploadPhoto, onAddWeighIn, onGoEdit }) {
  const [wDate, setWDate] = useState(() => new Date().toISOString().slice(0,10))
  const [wWeight, setWWeight] = useState('')
  const [wWaist, setWWaist] = useState('')
  return (
    <div className="container">
      <div className="card" style={{padding:16, marginBottom:12}}>
        <div style={{fontWeight:700, marginBottom:8}}>Participants</div>
        <div className="grid">
          {participants.map(p => (
            <div key={p.id} className="card" style={{padding:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div>
                  <div style={{fontWeight:700}}>{p.name}</div>
                  <div style={{fontSize:12, color:'#475569'}}>{p.gender || '—'} • {p.phone || '—'}</div>
                </div>
                {isAdmin && <button className="btn" onClick={()=>onGoEdit(p.id)}>Edit</button>}
              </div>

              <div style={{fontSize:13, color:'#334155', marginBottom:6}}>Transformation photos</div>
              <input type="file" accept="image/*" capture="environment" onChange={e => onUploadPhoto(p.id, e.target.files?.[0])} />
              <div style={{height:8}}/>
              <PhotoGrid participantId={p.id} />

              <div style={{height:10}}/>
              <div style={{fontSize:13, color:'#334155', margin:'8px 0 4px'}}>Weigh-ins (read only)</div>
              <table>
                <thead><tr><th>Date</th><th>Weight (kg)</th><th>Waist (cm)</th><th>Attended</th></tr></thead>
                <tbody>
                  {(p.weighIns||[]).sort((a,b)=>a.date.localeCompare(b.date)).map((w,i)=>(
                    <tr key={i}>
                      <td>{w.date}</td>
                      <td><input readOnly className="input" value={w.weight_kg ?? ''} /></td>
                      <td><input readOnly className="input" value={w.waist_cm ?? ''} /></td>
                      <td><input type="checkbox" disabled checked={!!w.attended} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {isAdmin && (
                <div style={{marginTop:8}}>
                  <div style={{fontSize:12, color:'#64748b', marginBottom:4}}>Add weigh-in (admin only)</div>
                  <div style={{display:'grid',gridTemplateColumns:'140px 1fr 1fr 120px',gap:8}}>
                    <input type="date" className="input" value={wDate} onChange={e=>setWDate(e.target.value)} />
                    <input className="input" placeholder="Weight kg" value={wWeight} onChange={e=>setWWeight(e.target.value)} />
                    <input className="input" placeholder="Waist cm" value={wWaist} onChange={e=>setWWaist(e.target.value)} />
                    <button className="btn" onClick={()=>onAddWeighIn(p.id, wDate, parseFloat(wWeight||'0')||null, parseFloat(wWaist||'0')||null)}>Save</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AttendanceSheet({ participants, isAdmin }) {
  const weekdays = useMemo(()=>weekdaysBetween(CHALLENGE.startDate, CHALLENGE.endDate),[])
  const [date, setDate] = useState(weekdays[0] || new Date().toISOString().slice(0,10))

  return (
    <div className="container">
      <div className="card" style={{padding:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontWeight:700}}>Weekday Attendance</div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <span style={{fontSize:12, color:'#475569'}}>Window: {CHALLENGE.startDate} → {CHALLENGE.endDate} ({weekdays.length} weekdays)</span>
            <input type="date" className="input" style={{width:180}} value={date} onChange={e=>setDate(e.target.value)} />
          </div>
        </div>
        <div style={{height:8}}/>
        <table>
          <thead><tr><th>Name</th><th>Present</th></tr></thead>
          <tbody>
            {participants.map(p => {
              const present = p.attendanceDates?.has(date)
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>
                    <input type="checkbox" checked={!!present} disabled={!isAdmin}
                      onChange={e=>markAttendance(p.id, date, e.target.checked)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  async function markAttendance(pid, date, present) {
    if (!isAdmin) { alert('Admins only'); return }
    if (present) {
      const { error } = await supabase.from('daily_attendance').insert({ participant_id: pid, date, present: true })
      if (error && error.code !== '23505') { alert(error.message); return }
    } else {
      const { error } = await supabase.from('daily_attendance').delete().eq('participant_id', pid).eq('date', date)
      if (error) { alert(error.message); return }
    }
    window.dispatchEvent(new Event('reload-data'))
  }
}

function AdminEditParticipant({ participants, onSave }) {
  const { id } = useParams()
  const nav = useNavigate()
  const p = participants.find(x => String(x.id) === String(id))
  const [form, setForm] = useState(p || {})
  if (!p) return <div className="container"><div className="card" style={{padding:16}}>Not found</div></div>
  async function save() { await onSave(form); nav('/participants') }
  return (
    <div className="container">
      <div className="card" style={{padding:16, maxWidth:560, margin:'0 auto'}}>
        <div style={{fontWeight:700, marginBottom:8}}>Edit: {p.name}</div>
        <input className="input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name"/>
        <input className="input" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email"/>
        <input className="input" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone"/>
        <select className="input" value={form.gender||''} onChange={e=>setForm({...form,gender:e.target.value})}>
          <option value="">— Gender —</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <input className="input" type="number" value={form.height_cm||''} onChange={e=>setForm({...form,height_cm:e.target.value})} placeholder="Height (cm)"/>
        <div style={{display:'flex',justifyContent:'flex-end'}}><button className="btn" onClick={save}>Save</button></div>
      </div>
    </div>
  )
}

export default function App(){
  const { user, setUser } = useAuth()
  const isAdmin = useIsAdmin(user)
  const [participants, setParticipants] = useState([])

  useEffect(() => {
    const handler = () => loadAll()
    window.addEventListener('reload-data', handler)
    loadAll()
    return () => window.removeEventListener('reload-data', handler)
  }, [])

  async function loadAll(){
    const { data: pRows } = await supabase.from('participants').select('*').order('registered_at', { ascending: true })
    const { data: wRows } = await supabase.from('weigh_ins').select('*')
    const { data: aRows } = await supabase.from('daily_attendance').select('*')

    const map = new Map()
    for (const p of (pRows||[])) map.set(p.id, { ...p, weighIns: [] })
    for (const w of (wRows||[])) {
      const p = map.get(w.participant_id)
      if (p) p.weighIns.push({ date: w.date, weight_kg: w.weight_kg ?? undefined, waist_cm: w.waist_cm ?? undefined, attended: !!w.attended })
    }
    const attByPid = new Map()
    for (const a of (aRows||[])) {
      if (!attByPid.has(a.participant_id)) attByPid.set(a.participant_id, new Set())
      if (a.present) attByPid.get(a.participant_id).add(a.date)
    }
    const list = Array.from(map.values()).map(p => ({ ...p, attendanceDates: attByPid.get(p.id) || new Set() }))
    setParticipants(list)
  }

  async function onUploadPhoto(participantId, file) {
    if (!user) { alert('Please sign in first.'); return }
    if (!file) return
    const safeName = file.name.replace(/\s+/g,'_')
    const path = `participants/${participantId}/${Date.now()}_${safeName}`
    const { error: upErr } = await supabase.storage.from('photos').upload(path, file, { cacheControl: '3600', upsert: false })
    if (upErr) { alert(upErr.message); return }
    const { data: pub } = await supabase.storage.from('photos').getPublicUrl(path)
    await supabase.from('photos').insert({ participant_id: participantId, storage_path: path, public_url: pub.publicUrl })
    loadAll()
  }

  async function onAddWeighIn(pid, date, weight_kg, waist_cm) {
    if (!isAdmin) { alert('Admins only'); return }
    const { error } = await supabase.from('weigh_ins').insert({ participant_id: pid, date, weight_kg, waist_cm, attended: true })
    if (error) { alert(error.message); return }
    loadAll()
  }

  async function adminSaveParticipant(f) {
    if (!isAdmin) { alert('Admins only'); return }
    const { error } = await supabase.from('participants').update({
      name: f.name, email: f.email, phone: f.phone, gender: f.gender, height_cm: f.height_cm
    }).eq('id', f.id)
    if (error) alert(error.message); else loadAll()
  }

  function onGoEdit(id){ window.location.href = `/admin/${id}` }

  return (
    <BrowserRouter>
      <Header user={user} setUser={setUser} />
      <Routes>
        <Route path="/participants" element={
          <ParticipantsPage
            participants={participants}
            isAdmin={isAdmin}
            onUploadPhoto={onUploadPhoto}
            onAddWeighIn={onAddWeighIn}
            onGoEdit={onGoEdit}
          />
        } />
        <Route path="/attendance" element={<AttendanceSheet participants={participants} isAdmin={isAdmin} />} />
        <Route path="/admin/:id" element={
          isAdmin ? <AdminEditParticipant participants={participants} onSave={adminSaveParticipant}/> : <div className="container"><div className="card" style={{padding:16}}>Admins only</div></div>
        } />
        <Route path="*" element={<div className="container"><div className="card" style={{padding:16}}>Go to <Link to="/participants">Participants</Link></div></div>} />
      </Routes>
    </BrowserRouter>
  )
}
