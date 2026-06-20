import React,{useState,useEffect,useRef} from 'react';
import {Outlet,NavLink,useNavigate,Link} from 'react-router-dom';
import {useAuth} from '../hooks/useAuth';
import {notificationsAPI} from '../utils/api';
import {formatDistanceToNow} from 'date-fns';
import logo from '../logo.png';

export default function Layout(){
  const {user,logout}=useAuth();
  const nav=useNavigate();
  const [theme,setTheme]=useState(()=>localStorage.getItem('theme')||'dark');
  const [col,setCol]=useState(()=>window.innerWidth<768);
  const [notifs,setNotifs]=useState([]);
  const [showNotifs,setShowNotifs]=useState(false);
  const bellRef=useRef(null);

  useEffect(()=>{
    document.documentElement.setAttribute('data-theme',theme);
    localStorage.setItem('theme',theme);
  },[theme]);

  useEffect(()=>{
    const fn=()=>setCol(window.innerWidth<768);
    window.addEventListener('resize',fn);
    return ()=>window.removeEventListener('resize',fn);
  },[]);

  const loadNotifs=()=>{
    notificationsAPI.getAll().then(r=>setNotifs(r.data)).catch(()=>{});
  };

  useEffect(()=>{
    loadNotifs();
    const interval=setInterval(loadNotifs,15000);
    return ()=>clearInterval(interval);
  },[]);

  useEffect(()=>{
    const onClick=e=>{ if(bellRef.current && !bellRef.current.contains(e.target)) setShowNotifs(false); };
    document.addEventListener('click',onClick);
    return ()=>document.removeEventListener('click',onClick);
  },[]);

  const unreadCount=notifs.filter(n=>!n.is_read).length;

  const markAllRead=()=>{
    notificationsAPI.markAllRead().then(()=>setNotifs(n=>n.map(x=>({...x,is_read:true}))));
  };

  const items=[
    {to:'/',label:'Dashboard',exact:true,icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>},
    {to:'/projects',label:'Projects',icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>},
    {to:'/chat',label:'Team Chat',icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>},
    {to:'/analytics',label:'Analytics',icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>},
  ];

  return(
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'var(--bg)'}}>
      <aside style={{width:col?56:218,background:'var(--bg1)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',padding:'12px 8px',transition:'width .22s cubic-bezier(.4,0,.2,1)',flexShrink:0,overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,padding:'4px 6px'}}>
          <div onClick={()=>setCol(c=>!c)} style={{display:'flex',alignItems:'center',gap:9,cursor:'pointer',userSelect:'none'}}>
            <img src={logo} alt="" style={{width:24,height:24,objectFit:'contain',filter:'drop-shadow(0 0 3px rgba(255,255,255,0.25))',flexShrink:0}}/>
            {!col&&<span style={{fontSize:15,fontWeight:900,color:'var(--text)',letterSpacing:'-.04em',whiteSpace:'nowrap'}}>TaskFlow</span>}
          </div>
          {!col&&(
            <div ref={bellRef} style={{position:'relative'}}>
              <button onClick={()=>setShowNotifs(s=>!s)} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:7,padding:6,cursor:'pointer',display:'flex',position:'relative',color:'var(--text2)'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {unreadCount>0&&<span className="notif-dot"/>}
              </button>
              {showNotifs&&(
                <div className="card si" style={{position:'absolute',top:36,right:0,width:300,maxHeight:380,overflow:'auto',zIndex:60,boxShadow:'var(--shadowl)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',borderBottom:'1px solid var(--border)'}}>
                    <span style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>Notifications</span>
                    {unreadCount>0&&<button onClick={markAllRead} style={{fontSize:11,color:'var(--orange)',background:'none',border:'none',cursor:'pointer'}}>Mark all read</button>}
                  </div>
                  {notifs.length===0?(
                    <div style={{padding:'30px 16px',textAlign:'center',fontSize:12,color:'var(--text3)'}}>No notifications yet</div>
                  ):notifs.map(n=>(
                    <div key={n.id} style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',background:n.is_read?'transparent':'rgba(255,87,34,0.04)'}}>
                      <div style={{fontSize:12,color:'var(--text)',lineHeight:1.4,marginBottom:3}}>{n.message}</div>
                      <div style={{fontSize:10,color:'var(--text3)',fontFamily:"'JetBrains Mono',monospace"}}>{formatDistanceToNow(new Date(n.created_at),{addSuffix:true})}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {!col&&(
          <div style={{padding:'10px 10px',background:'var(--bg2)',borderRadius:10,border:'1px solid var(--border)',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <div style={{width:30,height:30,borderRadius:7,background:'var(--orange)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,color:'#fff',flexShrink:0}}>{(user?.full_name||user?.username||'U')[0].toUpperCase()}</div>
              <div style={{overflow:'hidden'}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:110}}>{user?.full_name||user?.username}</div>
                <div style={{fontSize:10,color:'var(--text3)',fontFamily:"'JetBrains Mono',monospace"}}>{user?.email?.split('@')[0]}</div>
              </div>
            </div>
            {user?.invite_code&&(
              <div style={{background:'var(--bg3)',border:'1px dashed rgba(255,87,34,0.3)',borderRadius:6,padding:'6px 8px',cursor:'pointer'}} onClick={()=>navigator.clipboard?.writeText(user.invite_code)}>
                <div style={{fontSize:9,color:'var(--orange)',fontFamily:"'JetBrains Mono',monospace",letterSpacing:'.06em',marginBottom:2}}>YOUR CODE · TAP TO COPY</div>
                <div style={{fontSize:14,fontWeight:900,color:'var(--orange)',fontFamily:"'JetBrains Mono',monospace",letterSpacing:'.1em'}}>{user.invite_code}</div>
              </div>
            )}
          </div>
        )}

        {!col&&<div style={{fontSize:9,fontWeight:700,letterSpacing:'.1em',color:'var(--text3)',padding:'0 8px',marginBottom:6,fontFamily:"'JetBrains Mono',monospace"}}>MENU</div>}

        <nav style={{display:'flex',flexDirection:'column',gap:1,flex:1}}>
          {items.map(item=>(
            <NavLink key={item.to} to={item.to} end={item.exact}
              style={({isActive})=>({display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:8,fontSize:13,fontWeight:500,color:isActive?'#fff':'var(--text2)',background:isActive?'var(--orange)':'transparent',textDecoration:'none',transition:'all .12s',whiteSpace:'nowrap',marginBottom:1})}>
              <span style={{flexShrink:0,display:'flex'}}>{item.icon}</span>
              {!col&&<span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div style={{borderTop:'1px solid var(--border)',paddingTop:8,display:'flex',flexDirection:'column',gap:1}}>
          <button onClick={()=>setTheme(t=>t==='dark'?'light':'dark')} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,fontSize:13,color:'var(--text2)',background:'none',border:'none',cursor:'pointer',width:'100%',fontFamily:'Inter,sans-serif',whiteSpace:'nowrap',transition:'all .12s'}}>
            {theme==='dark'
              ?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              :<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
            {!col&&<span>{theme==='dark'?'Light mode':'Dark mode'}</span>}
          </button>
          <button onClick={()=>{logout();nav('/login');}} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,fontSize:13,color:'var(--red)',background:'none',border:'none',cursor:'pointer',width:'100%',fontFamily:'Inter,sans-serif',whiteSpace:'nowrap',transition:'all .12s'}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {!col&&<span>Sign out</span>}
          </button>
        </div>
      </aside>
      <main style={{flex:1,overflow:'auto',background:'var(--bg)'}}><Outlet/></main>
    </div>
  );
}