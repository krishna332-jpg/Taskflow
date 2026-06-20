import React,{useState,useEffect,useRef} from 'react';
import {Link} from 'react-router-dom';
import {projectsAPI,aiAPI,tasksAPI} from '../utils/api';
import toast from 'react-hot-toast';

const COLORS=['#ff5722','#60a5fa','#4ade80','#fbbf24','#a78bfa','#f472b6','#34d399','#fb923c'];

export default function Projects(){
  const [projects,setProjects]=useState([]);
  const [search,setSearch]=useState('');
  const [showJoin,setShowJoin]=useState(false);
  const [joinCode,setJoinCode]=useState('');
  const [joining,setJoining]=useState(false);

  const [showCreate,setShowCreate]=useState(false);
  const [step,setStep]=useState(1);
  const [name,setName]=useState('');
  const [color,setColor]=useState(COLORS[0]);
  const [contentMode,setContentMode]=useState('text');
  const [contentText,setContentText]=useState('');
  const [file,setFile]=useState(null);
  const [generating,setGenerating]=useState(false);
  const [reviewTasks,setReviewTasks]=useState([]);
  const [creatingProject,setCreatingProject]=useState(false);
  const fileRef=useRef(null);

  const load=()=>projectsAPI.getAll().then(r=>setProjects(r.data)).catch(()=>{});
  useEffect(()=>{load();},[]);

  const resetCreate=()=>{
    setStep(1);setName('');setColor(COLORS[0]);setContentMode('text');
    setContentText('');setFile(null);setReviewTasks([]);
  };

  const handleJoin=async()=>{
    if(!joinCode.trim())return;
    setJoining(true);
    try{
      await projectsAPI.join(joinCode.trim());
      toast.success('Joined project!');
      setShowJoin(false);setJoinCode('');load();
    }catch(err){toast.error(err.response?.data?.detail||'Invalid code');}
    finally{setJoining(false);}
  };

  const handleGenerate=async()=>{
    if(!name.trim()){toast.error('Enter a project name first');return;}
    setGenerating(true);
    try{
      let res;
      if(contentMode==='pdf'&&file){
        res=await aiAPI.generateFromFile(name,file);
      }else{
        res=await aiAPI.generateTasks({project_name:name,project_description:contentText});
      }
      setReviewTasks((res.data.tasks||[]).map((t,i)=>({...t,id:'tmp-'+i})));
      setStep(3);
    }catch(err){toast.error(err.response?.data?.detail||'AI generation failed');}
    finally{setGenerating(false);}
  };

  const skipAI=()=>{
    setReviewTasks([]);
    setStep(3);
  };

  const moveTask=(idx,dir)=>{
    setReviewTasks(prev=>{
      const arr=[...prev];
      const newIdx=idx+dir;
      if(newIdx<0||newIdx>=arr.length)return arr;
      [arr[idx],arr[newIdx]]=[arr[newIdx],arr[idx]];
      return arr;
    });
  };
  const updateTask=(idx,field,val)=>setReviewTasks(prev=>prev.map((t,i)=>i===idx?{...t,[field]:val}:t));
  const removeTask=idx=>setReviewTasks(prev=>prev.filter((_,i)=>i!==idx));
  const addBlankTask=()=>setReviewTasks(prev=>[...prev,{id:'tmp-'+Date.now(),title:'New task',description:'',priority:'medium'}]);

  const finalizeCreate=async()=>{
    setCreatingProject(true);
    try{
      const proj=await projectsAPI.create({name,description:contentMode==='text'?contentText.slice(0,300):`Generated from ${file?.name||'upload'}`,color});
      if(reviewTasks.length>0){
        await tasksAPI.createBulk(reviewTasks.map(t=>({
          title:t.title,description:t.description,priority:t.priority||'medium',project_id:proj.data.id,ai_generated:true,
        })));
      }
      toast.success('Project created!');
      setShowCreate(false);resetCreate();load();
    }catch(err){toast.error(err.response?.data?.detail||'Failed to create project');}
    finally{setCreatingProject(false);}
  };

  const handleDelete=async id=>{
    if(!window.confirm('Delete this project and all its tasks?'))return;
    try{await projectsAPI.delete(id);toast.success('Deleted');load();}catch(err){toast.error(err.response?.data?.detail||'Failed');}
  };

  const filtered=projects.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));

  return(
    <div style={{padding:'24px',maxWidth:1280,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,flexWrap:'wrap',gap:12}} className="fu">
        <div>
          <h1 style={{fontSize:24,fontWeight:900,color:'var(--text)',letterSpacing:'-.04em'}}>Projects</h1>
          <div style={{fontSize:11,color:'var(--text3)',fontFamily:"'JetBrains Mono',monospace",marginTop:4}}>{projects.length} projects, {projects.reduce((a,p)=>a+p.task_count,0)} total tasks</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{position:'relative'}}>
            <svg style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--text3)'}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="inp" style={{paddingLeft:28,width:160,fontSize:12}} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <button className="btn btg btsm" onClick={()=>setShowJoin(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10,17 15,12 10,7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            Join Project
          </button>
          <button className="btn bto btsm" onClick={()=>{resetCreate();setShowCreate(true);}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Project
          </button>
        </div>
      </div>

      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'70px 0'}} className="fu">
          <div style={{width:56,height:56,background:'var(--bg2)',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',border:'1px solid var(--border)'}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </div>
          <h3 style={{fontSize:16,fontWeight:800,color:'var(--text)',marginBottom:6,letterSpacing:'-.02em'}}>{search?'No results found':'No projects yet'}</h3>
          <p style={{fontSize:12,color:'var(--text3)',marginBottom:20}}>{search?'Try a different search':'Create a project or join one with a code'}</p>
          {!search&&<div style={{display:'flex',gap:10,justifyContent:'center'}}>
            <button className="btn btg" onClick={()=>setShowJoin(true)}>Join with Code</button>
            <button className="btn bto" onClick={()=>{resetCreate();setShowCreate(true);}}>Create Project</button>
          </div>}
        </div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))',gap:12}}>
          {filtered.map((p,i)=>(
            <div key={p.id} className="card fu" style={{overflow:'hidden',animationDelay:`${i*0.05}s`}}>
              <div style={{height:3,background:p.color||'var(--orange)'}}/>
              <div style={{padding:'16px 18px 18px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:9,height:9,borderRadius:2,background:p.color||'var(--orange)'}}/>
                    <h3 style={{fontSize:14,fontWeight:800,color:'var(--text)',letterSpacing:'-.02em'}}>{p.name}</h3>
                  </div>
                  <button onClick={()=>handleDelete(p.id)} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',padding:3,display:'flex'}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/></svg>
                  </button>
                </div>
                {p.description&&<p style={{fontSize:11,color:'var(--text3)',lineHeight:1.5,marginBottom:12,overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{p.description}</p>}
                <div style={{display:'flex',gap:6,marginBottom:12}}>
                  <span style={{fontSize:10,padding:'2px 7px',borderRadius:99,background:'var(--bg3)',color:'var(--text3)',fontFamily:"'JetBrains Mono',monospace"}}>{p.task_count} tasks</span>
                  <span style={{fontSize:10,padding:'2px 7px',borderRadius:99,background:'var(--gdim)',color:'var(--green)',fontFamily:"'JetBrains Mono',monospace"}}>{p.done_count} done</span>
                  <span style={{fontSize:10,padding:'2px 7px',borderRadius:99,background:'var(--bdim)',color:'var(--blue)',fontFamily:"'JetBrains Mono',monospace"}}>{p.member_count} {p.member_count===1?'member':'members'}</span>
                </div>
                <div style={{marginBottom:12}}>
                  <div className="prog"><div className="prog-fill" style={{width:`${p.task_count>0?Math.round(p.done_count/p.task_count*100):0}%`,background:p.color||'var(--orange)'}}/></div>
                </div>
                <Link to={`/projects/${p.id}`} className="btn btg btsm" style={{width:'100%',justifyContent:'center'}}>Open Board</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showJoin&&(
        <div style={M.ov} onClick={()=>setShowJoin(false)}>
          <div className="card si" style={{...M.modal,maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <h2 style={{fontSize:18,fontWeight:800,color:'var(--text)',letterSpacing:'-.03em',marginBottom:6}}>Join a Project</h2>
            <p style={{fontSize:12,color:'var(--text2)',marginBottom:18}}>Enter the project code shared by the owner</p>
            <div className="fg"><input className="inp" placeholder="XXXX-XXXX" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} style={{textAlign:'center',fontSize:18,fontWeight:900,letterSpacing:'.12em',fontFamily:"'JetBrains Mono',monospace"}} autoFocus/></div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btg btsm" onClick={()=>setShowJoin(false)}>Cancel</button>
              <button className="btn bto btsm" onClick={handleJoin} disabled={joining}>{joining?'Joining...':'Join'}</button>
            </div>
          </div>
        </div>
      )}

      {showCreate&&(
        <div style={M.ov} onClick={()=>{setShowCreate(false);resetCreate();}}>
          <div className="card si" style={{...M.modal,maxWidth:560}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <div style={{display:'flex',gap:6}}>
                {[1,2,3].map(s=>(
                  <div key={s} style={{width:24,height:3,borderRadius:99,background:step>=s?'var(--orange)':'var(--bg3)'}}/>
                ))}
              </div>
              <button onClick={()=>{setShowCreate(false);resetCreate();}} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',display:'flex'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {step===1&&(
              <div style={{marginTop:18}}>
                <h2 style={{fontSize:18,fontWeight:800,color:'var(--text)',letterSpacing:'-.03em',marginBottom:4}}>Name your project</h2>
                <p style={{fontSize:12,color:'var(--text3)',marginBottom:20}}>What are you building?</p>
                <div className="fg"><input className="inp" placeholder="e.g. Portfolio Website" value={name} onChange={e=>setName(e.target.value)} style={{fontSize:15,padding:'12px 14px'}} autoFocus/></div>
                <div className="fg">
                  <label className="lbl">Color</label>
                  <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                    {COLORS.map(c=><button key={c} type="button" onClick={()=>setColor(c)} style={{width:26,height:26,borderRadius:6,background:c,border:color===c?'2.5px solid var(--text)':'2.5px solid transparent',cursor:'pointer',transition:'all .15s'}}/>)}
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'flex-end',marginTop:10}}>
                  <button className="btn bto btsm" disabled={!name.trim()} onClick={()=>setStep(2)}>Continue</button>
                </div>
              </div>
            )}

            {step===2&&(
              <div style={{marginTop:18}}>
                <h2 style={{fontSize:18,fontWeight:800,color:'var(--text)',letterSpacing:'-.03em',marginBottom:4}}>Describe "{name}"</h2>
                <p style={{fontSize:12,color:'var(--text3)',marginBottom:16}}>AI will read this and build your task list automatically</p>
                <div style={{display:'flex',gap:6,marginBottom:14}}>
                  <button onClick={()=>setContentMode('text')} style={{flex:1,padding:8,borderRadius:7,border:contentMode==='text'?'1px solid var(--orange)':'1px solid var(--border)',background:contentMode==='text'?'var(--odim)':'var(--bg2)',color:contentMode==='text'?'var(--orange)':'var(--text2)',fontSize:12,fontWeight:600,cursor:'pointer'}}>Paste Text</button>
                  <button onClick={()=>setContentMode('pdf')} style={{flex:1,padding:8,borderRadius:7,border:contentMode==='pdf'?'1px solid var(--orange)':'1px solid var(--border)',background:contentMode==='pdf'?'var(--odim)':'var(--bg2)',color:contentMode==='pdf'?'var(--orange)':'var(--text2)',fontSize:12,fontWeight:600,cursor:'pointer'}}>Upload PDF</button>
                </div>
                {contentMode==='text'?(
                  <textarea className="inp" rows={6} placeholder="Describe the project, paste a brief, requirements, or notes..." value={contentText} onChange={e=>setContentText(e.target.value)} style={{resize:'vertical'}}/>
                ):(
                  <div onClick={()=>fileRef.current?.click()} style={{border:'1.5px dashed var(--border2)',borderRadius:10,padding:'28px 16px',textAlign:'center',cursor:'pointer',background:'var(--bg2)'}}>
                    <input ref={fileRef} type="file" accept=".pdf" style={{display:'none'}} onChange={e=>setFile(e.target.files[0])}/>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" style={{margin:'0 auto 8px'}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                    <div style={{fontSize:13,color:'var(--text2)',fontWeight:600}}>{file?file.name:'Click to upload a PDF'}</div>
                    <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>Project brief, spec, or requirements doc</div>
                  </div>
                )}
                <div style={{display:'flex',justifyContent:'space-between',marginTop:16}}>
                  <button className="btn btg btsm" onClick={()=>setStep(1)}>Back</button>
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn btg btsm" onClick={skipAI}>Skip, I'll add tasks myself</button>
                    <button className="btn bto btsm" onClick={handleGenerate} disabled={generating||(contentMode==='pdf'&&!file)}>
                      {generating?'Generating...':'Generate Tasks'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step===3&&(
              <div style={{marginTop:18}}>
                <h2 style={{fontSize:18,fontWeight:800,color:'var(--text)',letterSpacing:'-.03em',marginBottom:4}}>Review tasks</h2>
                <p style={{fontSize:12,color:'var(--text3)',marginBottom:14}}>Edit, reorder, or remove before creating "{name}"</p>
                <div style={{maxHeight:320,overflow:'auto',display:'flex',flexDirection:'column',gap:7,marginBottom:14}}>
                  {reviewTasks.map((t,idx)=>(
                    <div key={t.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,padding:10,display:'flex',gap:8,alignItems:'flex-start'}}>
                      <div style={{display:'flex',flexDirection:'column',gap:2,flexShrink:0,marginTop:2}}>
                        <button onClick={()=>moveTask(idx,-1)} disabled={idx===0} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',padding:0,opacity:idx===0?0.3:1}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18,15 12,9 6,15"/></svg></button>
                        <button onClick={()=>moveTask(idx,1)} disabled={idx===reviewTasks.length-1} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',padding:0,opacity:idx===reviewTasks.length-1?0.3:1}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6,9 12,15 18,9"/></svg></button>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <input value={t.title} onChange={e=>updateTask(idx,'title',e.target.value)} style={{width:'100%',background:'none',border:'none',outline:'none',color:'var(--text)',fontSize:13,fontWeight:700,marginBottom:4,padding:0}}/>
                        <input value={t.description||''} onChange={e=>updateTask(idx,'description',e.target.value)} placeholder="Description..." style={{width:'100%',background:'none',border:'none',outline:'none',color:'var(--text3)',fontSize:11,padding:0}}/>
                      </div>
                      <select value={t.priority} onChange={e=>updateTask(idx,'priority',e.target.value)} className="inp" style={{width:'auto',fontSize:10,padding:'4px 6px',flexShrink:0}}>
                        <option value="low">Low</option><option value="medium">Med</option><option value="high">High</option><option value="urgent">Urgent</option>
                      </select>
                      <button onClick={()=>removeTask(idx)} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',padding:2,flexShrink:0}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    </div>
                  ))}
                  {reviewTasks.length===0&&<div style={{textAlign:'center',padding:'24px 0',fontSize:12,color:'var(--text3)'}}>No tasks yet, add one below or create the project empty</div>}
                </div>
                <button onClick={addBlankTask} className="btn btg btsm" style={{marginBottom:16}}>+ Add task</button>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <button className="btn btg btsm" onClick={()=>setStep(2)}>Back</button>
                  <button className="btn bto btsm" onClick={finalizeCreate} disabled={creatingProject}>
                    {creatingProject?'Creating...':('Create Project'+(reviewTasks.length?(' with '+reviewTasks.length+' tasks'):''))}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const M={
  ov:{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,backdropFilter:'blur(8px)',padding:16},
  modal:{padding:24,width:'100%',boxShadow:'var(--shadowl)',maxHeight:'88vh',overflowY:'auto'},
};
