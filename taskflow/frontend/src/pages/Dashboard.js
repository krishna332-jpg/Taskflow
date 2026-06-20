import React,{useState,useEffect} from 'react';
import {Link} from 'react-router-dom';
import {AreaChart,Area,XAxis,YAxis,Tooltip,ResponsiveContainer,BarChart,Bar,Cell} from 'recharts';
import {tasksAPI,projectsAPI} from '../utils/api';
import {useAuth} from '../hooks/useAuth';
import {format,subDays} from 'date-fns';
import toast from 'react-hot-toast';

export default function Dashboard(){
  const {user}=useAuth();
  const [stats,setStats]=useState(null);
  const [projects,setProjects]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [loading,setLoading]=useState(true);
  const [joinCode,setJoinCode]=useState('');
  const [showJoin,setShowJoin]=useState(false);
  const [joining,setJoining]=useState(false);

  const load=()=>{
    Promise.all([tasksAPI.getStats(),projectsAPI.getAll(),tasksAPI.getAll()])
      .then(([s,p,t])=>{setStats(s.data);setProjects(p.data);setTasks(t.data);})
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{load();},[]);

  const handleJoin=async()=>{
    if(!joinCode.trim())return;
    setJoining(true);
    try{await projectsAPI.join(joinCode.trim());toast.success('Joined!');setShowJoin(false);setJoinCode('');load();}
    catch(err){toast.error(err.response?.data?.detail||'Invalid code');}
    finally{setJoining(false);}
  };

  const areaData=Array.from({length:7},(_,i)=>{
    const d=subDays(new Date(),6-i);
    return{day:format(d,'EEE'),tasks:tasks.filter(t=>t.created_at&&new Date(t.created_at).toDateString()===d.toDateString()).length};
  });

  const barData=[
    {name:'Todo',value:stats?.todo||0,color:'#444'},
    {name:'Progress',value:stats?.in_progress||0,color:'#60a5fa'},
    {name:'Done',value:stats?.done||0,color:'#4ade80'},
    {name:'Urgent',value:stats?.urgent||0,color:'#ff5722'},
  ];

  const completion=stats?.total>0?Math.round((stats.done/stats.total)*100):0;
  const hour=new Date().getHours();
  const greeting=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';

  const myTasks=tasks.filter(t=>!t.completed&&t.assignees?.some(a=>a.id===user?.id));

  const flashCards=[
    {label:'Total Tasks',value:stats?.total??0,sub:'All projects',color:'var(--orange)',bg:'rgba(255,87,34,0.1)',icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>},
    {label:'Completed',value:stats?.done??0,sub:completion+'% rate',color:'var(--green)',bg:'rgba(74,222,128,0.1)',icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>},
    {label:'In Progress',value:stats?.in_progress??0,sub:'Active now',color:'var(--blue)',bg:'rgba(96,165,250,0.1)',icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>},
    {label:'Urgent',value:stats?.urgent??0,sub:'Act now',color:'var(--red)',bg:'rgba(248,113,113,0.1)',icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>},
  ];

  if(loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><span className="spinner" style={{width:24,height:24}}/></div>;

  return(
    <div style={{padding:24,maxWidth:1280,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,flexWrap:'wrap',gap:12}} className="fu">
        <div>
          <div style={{fontSize:10,color:'var(--text3)',fontFamily:"'JetBrains Mono',monospace",letterSpacing:'.08em',marginBottom:4}}>{format(new Date(),'EEEE, MMMM do yyyy').toUpperCase()}</div>
          <h1 style={{fontSize:26,fontWeight:900,color:'var(--text)',letterSpacing:'-.04em',marginBottom:2}}>{greeting}, {user?.full_name||user?.username}</h1>
          <p style={{fontSize:13,color:'var(--text3)'}}>Here's what's happening in your workspace</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="btn btg btsm" onClick={()=>setShowJoin(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10,17 15,12 10,7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            Join Project
          </button>
          <Link to="/projects" className="btn bto btsm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Project
          </Link>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}} className="grid-mobile-2">
        {flashCards.map((c,i)=>(
          <div key={i} className="card fu" style={{padding:18,animationDelay:(i*0.06)+'s',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:c.color,opacity:0.6}}/>
            <div style={{width:34,height:34,borderRadius:9,background:c.bg,display:'flex',alignItems:'center',justifyContent:'center',color:c.color,marginBottom:12}}>{c.icon}</div>
            <div style={{fontSize:30,fontWeight:900,color:c.color,letterSpacing:'-.04em',lineHeight:1,marginBottom:4}}>{c.value}</div>
            <div style={{fontSize:12,fontWeight:700,color:'var(--text)',marginBottom:2}}>{c.label}</div>
            <div style={{fontSize:10,color:'var(--text3)'}}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:12,marginBottom:16}} className="grid-mobile-1">
        <div className="card fu" style={{padding:18}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:2}}>Task Activity</div>
          <div style={{fontSize:11,color:'var(--text3)',marginBottom:14}}>Tasks created this week</div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={areaData} margin={{top:4,right:4,left:-30,bottom:0}}>
              <defs><linearGradient id="og" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff5722" stopOpacity={0.25}/><stop offset="95%" stopColor="#ff5722" stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="day" tick={{fontSize:10,fill:'var(--text3)',fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10,fill:'var(--text3)'}} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip contentStyle={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,fontSize:12,color:'var(--text)'}} cursor={{stroke:'var(--border)'}}/>
              <Area type="monotone" dataKey="tasks" stroke="#ff5722" strokeWidth={2} fill="url(#og)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card fu" style={{padding:18,animationDelay:'0.1s'}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:2}}>Status Breakdown</div>
          <div style={{fontSize:11,color:'var(--text3)',marginBottom:14}}>Current distribution</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={barData} margin={{top:4,right:4,left:-30,bottom:0}}>
              <XAxis dataKey="name" tick={{fontSize:9,fill:'var(--text3)',fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:9,fill:'var(--text3)'}} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip contentStyle={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,fontSize:12,color:'var(--text)'}}/>
              <Bar dataKey="value" radius={[4,4,0,0]}>{barData.map((d,i)=><Cell key={i} fill={d.color}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}} className="grid-mobile-1">
        <div className="card fu" style={{padding:18}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>My Projects</div>
            <Link to="/projects" style={{fontSize:11,color:'var(--orange)',textDecoration:'none',fontFamily:"'JetBrains Mono',monospace"}}>view all</Link>
          </div>
          {projects.length===0?(
            <div style={{textAlign:'center',padding:'24px 0'}}>
              <div style={{width:40,height:40,background:'var(--bg2)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px',border:'1px solid var(--border)'}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div style={{fontSize:12,color:'var(--text3)',marginBottom:12}}>No projects yet</div>
              <Link to="/projects" className="btn bto btsm">Create First Project</Link>
            </div>
          ):projects.slice(0,5).map(p=>(
            <Link key={p.id} to={`/projects/${p.id}`} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 8px',borderRadius:7,textDecoration:'none',marginBottom:2}}>
              <div style={{width:8,height:8,borderRadius:2,background:p.color||'var(--orange)',flexShrink:0}}/>
              <div style={{flex:1,overflow:'hidden'}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                <div style={{fontSize:10,color:'var(--text3)',fontFamily:"'JetBrains Mono',monospace"}}>{p.task_count} tasks</div>
              </div>
              <div style={{width:52}}>
                <div className="prog"><div className="prog-fill" style={{width:(p.task_count>0?Math.round(p.done_count/p.task_count*100):0)+'%',background:p.color||'var(--orange)'}}/></div>
              </div>
            </Link>
          ))}
        </div>

        <div className="card fu" style={{padding:18,animationDelay:'0.1s'}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:14}}>Assigned to Me</div>
          {myTasks.length===0?(
            <div style={{textAlign:'center',padding:'24px 0'}}>
              <div style={{width:40,height:40,background:'var(--bg2)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px',border:'1px solid var(--border)'}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </div>
              <div style={{fontSize:12,color:'var(--text3)'}}>No tasks assigned to you</div>
            </div>
          ):myTasks.slice(0,6).map(t=>(
            <div key={t.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
              <div style={{width:6,height:6,borderRadius:99,background:t.status==='in_progress'?'var(--blue)':'var(--text3)',flexShrink:0}}/>
              <div style={{flex:1,fontSize:12,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</div>
              {t.due_date&&<span style={{fontSize:10,color:'var(--text3)',fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{format(new Date(t.due_date),'MMM d')}</span>}
              <span className={`badge badge-${t.priority}`}>{t.priority}</span>
            </div>
          ))}
        </div>
      </div>

      {showJoin&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,backdropFilter:'blur(8px)'}} onClick={()=>setShowJoin(false)}>
          <div className="card si" style={{padding:28,maxWidth:380,width:'100%',boxShadow:'var(--shadowl)'}} onClick={e=>e.stopPropagation()}>
            <h2 style={{fontSize:18,fontWeight:800,color:'var(--text)',letterSpacing:'-.03em',marginBottom:6}}>Join a Project</h2>
            <p style={{fontSize:13,color:'var(--text2)',marginBottom:20}}>Enter the project code shared by the admin</p>
            <div className="fg">
              <input className="inp" placeholder="XXXX-XXXX" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} style={{textAlign:'center',fontSize:20,fontWeight:900,letterSpacing:'.15em',fontFamily:"'JetBrains Mono',monospace"}} autoFocus/>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btg btsm" onClick={()=>setShowJoin(false)}>Cancel</button>
              <button className="btn bto btsm" onClick={handleJoin} disabled={joining}>{joining?'Joining...':'Join Project'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
