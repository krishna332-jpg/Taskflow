import React,{useState,useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../hooks/useAuth';
import {authAPI} from '../utils/api';
import toast from 'react-hot-toast';
import logo from '../logo.png';

const GOOGLE_CLIENT_ID='202446971155-7o06rcpl8bbo48p0ssen9lmjjrrgb9i4.apps.googleusercontent.com';

export default function Login(){
  const [busy,setBusy]=useState(false);
  const {setSession}=useAuth();
  const nav=useNavigate();

  useEffect(()=>{
    const hash=window.location.hash;
    if(hash.includes('id_token')){
      setBusy(true);
      const params=new URLSearchParams(hash.substring(1));
      const idToken=params.get('id_token');
      if(idToken){
        try{
          const payload=JSON.parse(atob(idToken.split('.')[1]));
          window.history.replaceState(null,'',window.location.pathname);
          authAPI.google({
            email:payload.email,
            full_name:payload.name,
            google_id:payload.sub,
            picture:payload.picture,
          }).then(res=>{
            setSession(res.data.access_token,res.data.user);
            toast.success('Welcome, '+payload.name+'!');
            nav('/');
          }).catch(()=>{
            toast.error('Could not sign in. Is the backend running?');
            setBusy(false);
          });
        }catch{
          toast.error('Sign-in failed, please try again');
          setBusy(false);
        }
      }
    }
  },[]);

  const googleLogin=()=>{
    const redirectUri=window.location.origin+'/login';
    const params=new URLSearchParams({
      client_id:GOOGLE_CLIENT_ID,
      redirect_uri:redirectUri,
      response_type:'id_token',
      scope:'openid email profile',
      nonce:Math.random().toString(36).substring(2),
      prompt:'select_account',
    });
    window.location.href=`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  if(busy) return(
    <div style={S.page}>
      <div style={{textAlign:'center',position:'relative',zIndex:1}}>
        <span className="spinner" style={{width:28,height:28,margin:'0 auto 16px'}}/>
        <p style={{fontSize:13,color:'var(--text2)'}}>Signing you in…</p>
      </div>
    </div>
  );

  return(
    <div style={S.page}>
      <div style={S.dots}/>
      <div style={S.glow1}/><div style={S.glow2}/>
      <div style={{width:'100%',maxWidth:400,position:'relative',zIndex:1,textAlign:'center'}} className="si">
        <div style={S.logoWrap}>
          <img src={logo} alt="TaskFlow" style={{width:72,height:72,objectFit:'contain'}}/>
        </div>
        <h1 style={{fontSize:30,fontWeight:900,color:'var(--text)',letterSpacing:'-.04em',marginBottom:6}}>TaskFlow</h1>
        <p style={{fontSize:14,color:'var(--text3)',marginBottom:36}}>Smart project management for modern teams</p>

        <div className="card" style={{padding:'36px 32px',boxShadow:'var(--shadowl)'}}>
          <h2 style={{fontSize:18,fontWeight:800,color:'var(--text)',letterSpacing:'-.02em',marginBottom:6}}>Get started</h2>
          <p style={{fontSize:13,color:'var(--text2)',marginBottom:24}}>Sign in with your Google account to continue</p>
          <button onClick={googleLogin} style={S.googleBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
          <p style={{fontSize:11,color:'var(--text3)',marginTop:18,lineHeight:1.6}}>
            By continuing, a workspace is created automatically using your Google account. No passwords, no forms.
          </p>
        </div>
        <p style={{marginTop:22,fontSize:11,color:'var(--text3)',fontFamily:"'JetBrains Mono',monospace"}}>FREE FOREVER · NO CREDIT CARD</p>
      </div>
    </div>
  );
}

const S={
  page:{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,position:'relative',overflow:'hidden'},
  dots:{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,#1e1e1e 1px,transparent 1px)',backgroundSize:'24px 24px',pointerEvents:'none'},
  glow1:{position:'absolute',top:'-20%',left:'-10%',width:500,height:500,background:'radial-gradient(circle,rgba(255,87,34,0.07) 0%,transparent 70%)',pointerEvents:'none'},
  glow2:{position:'absolute',bottom:'-20%',right:'-10%',width:400,height:400,background:'radial-gradient(circle,rgba(96,165,250,0.05) 0%,transparent 70%)',pointerEvents:'none'},
  logoWrap:{width:96,height:96,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',animation:'float 3.2s ease-in-out infinite, glowPulse 3.2s ease-in-out infinite',filter:'drop-shadow(0 0 0px rgba(255,255,255,0.3))'},
  googleBtn:{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'13px 16px',background:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:600,color:'#1a1a1a',cursor:'pointer',transition:'all .15s',fontFamily:'Inter,sans-serif',boxShadow:'0 2px 12px rgba(0,0,0,0.15)'},
};
