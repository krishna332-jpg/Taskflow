import React,{useState,useEffect,useRef} from 'react';
import {Link} from 'react-router-dom';
import {projectsAPI,chatAPI} from '../utils/api';
import {useAuth} from '../hooks/useAuth';
import {format} from 'date-fns';

export default function Chat(){
  const {user}=useAuth();
  const [projects,setProjects]=useState([]);
  const [activeId,setActiveId]=useState(null);
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState('');
  const [loading,setLoading]=useState(true);
  const bottomRef=useRef(null);

  useEffect(()=>{
    projectsAPI.getAll().then(r=>{
      setProjects(r.data);
      if(r.data.length>0)setActiveId(r.data[0].id);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  const loadMsgs=()=>{
    if(!activeId)return;
    chatAPI.getMessages(activeId).then(r=>setMsgs(r.data)).catch(()=>{});
  };

  useEffect(()=>{
    loadMsgs();
    const interval=setInterval(loadMsgs,5000);
    return ()=>clearInterval(interval);
  },[activeId]);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'});},[msgs]);

  const send=async e=>{
    e.preventDefault();
    if(!input.trim()||!activeId)return;
    const text=input;
    setInput('');
    try{
      const res=await chatAPI.send(activeId,text);
      setMsgs(m=>[...m,res.data]);
    }catch{}
  };

  const activeProject=projects.find(p=>p.id===activeId);

  if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><span className="spinner" style={{width:24,height:24}}/></div>;

  if(projects.length===0)return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',flexDirection:'column',gap:14}}>
      <div style={{width:48,height:48,background:'var(--bg2)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid var(--border)'}}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </div>
      <div style={{fontSize:13,color:'var(--text3)'}}>Join or create a project to start chatting</div>
      <Link to="/projects" className="btn bto btsm">Go to Projects</Link>
    </div>
  );

  return(
    <div style={{display:'flex',height:'100%',overflow:'hidden'}}>
      <div style={{width:200,background:'var(--bg1)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',flexShrink:0}} className="hide-mobile">
        <div style={{padding:'18px 14px 10px',borderBottom:'1px solid var(--border)'}}>
          <div style={{fontSize:13,fontWeight:800,color:'var(--text)',letterSpacing:'-.02em'}}>Project Chats</div>
        </div>
        <div style={{padding:8,overflow:'auto'}}>
          {projects.map(p=>(
            <button key={p.id} onClick={()=>setActiveId(p.id)} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'8px 9px',borderRadius:6,background:activeId===p.id?'rgba(255,87,34,0.1)':'transparent',border:'none',cursor:'pointer',textAlign:'left'}}>
              <div style={{width:7,height:7,borderRadius:2,background:p.color||'var(--orange)',flexShrink:0}}/>
              <span style={{fontSize:12,fontWeight:activeId===p.id?700:500,color:activeId===p.id?'var(--orange)':'var(--text2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',background:'var(--bg1)',display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:8,height:8,borderRadius:2,background:activeProject?.color||'var(--orange)'}}/>
          <div style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{activeProject?.name}</div>
        </div>
        <div style={{flex:1,overflow:'auto',padding:18}}>
          {msgs.length===0?(
            <div style={{textAlign:'center',padding:'50px 0'}}>
              <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:4}}>No messages yet</div>
              <div style={{fontSize:11,color:'var(--text3)'}}>Start the conversation with your team</div>
            </div>
          ):msgs.map((msg,i)=>{
            const isMe=msg.user?.id===user?.id;
            const showHead=i===0||msgs[i-1]?.user?.id!==msg.user?.id;
            return(
              <div key={msg.id} style={{display:'flex',gap:9,marginBottom:showHead?12:3,alignItems:'flex-start'}} className="fi">
                {showHead?(
                  msg.user?.picture?<img src={msg.user.picture} alt="" style={{width:30,height:30,borderRadius:7,flexShrink:0}}/>:
                  <div style={{width:30,height:30,borderRadius:7,background:'var(--orange)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff',flexShrink:0}}>{(msg.user?.full_name||'U')[0].toUpperCase()}</div>
                ):<div style={{width:30,flexShrink:0}}/>}
                <div>
                  {showHead&&<div style={{display:'flex',alignItems:'baseline',gap:7,marginBottom:2}}><span style={{fontSize:12,fontWeight:700,color:isMe?'var(--orange)':'var(--text)'}}>{msg.user?.full_name}</span><span style={{fontSize:9,color:'var(--text3)',fontFamily:"'JetBrains Mono',monospace"}}>{format(new Date(msg.created_at),'h:mm a')}</span></div>}
                  <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.5,background:isMe?'rgba(255,87,34,0.08)':'var(--bg2)',padding:'7px 11px',borderRadius:isMe?'9px 9px 3px 9px':'9px 9px 9px 3px',display:'inline-block',border:isMe?'1px solid rgba(255,87,34,0.15)':'1px solid var(--border)',maxWidth:440}}>{msg.text}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef}/>
        </div>
        <form onSubmit={send} style={{padding:'10px 14px',borderTop:'1px solid var(--border)',background:'var(--bg1)',display:'flex',gap:8}}>
          <input className="inp" style={{flex:1}} placeholder={`Message ${activeProject?.name||''}...`} value={input} onChange={e=>setInput(e.target.value)}/>
          <button type="submit" className="btn bto btsm" disabled={!input.trim()}>Send</button>
        </form>
      </div>
    </div>
  );
}
