import React from 'react';
import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';
import {Toaster} from 'react-hot-toast';
import {AuthProvider,useAuth} from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectBoard from './pages/ProjectBoard';
import Chat from './pages/Chat';
import Analytics from './pages/Analytics';
import Layout from './components/Layout';
import './index.css';

function Guard({children}){
  const{user,loading}=useAuth();
  if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--bg)'}}><span className="spinner" style={{width:24,height:24}}/></div>;
  return user?children:<Navigate to="/login"/>;
}

export default function App(){
  return(
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{style:{fontFamily:'Inter,sans-serif',background:'#1a1a1a',color:'#f0f0f0',borderRadius:'8px',fontSize:'13px',border:'1px solid #262626'},success:{iconTheme:{primary:'#4ade80',secondary:'#1a1a1a'}},error:{iconTheme:{primary:'#ff5722',secondary:'#1a1a1a'}}}}/>
        <Routes>
          <Route path="/login" element={<Login/>}/>
          <Route path="/" element={<Guard><Layout/></Guard>}>
            <Route index element={<Dashboard/>}/>
            <Route path="projects" element={<Projects/>}/>
            <Route path="projects/:id" element={<ProjectBoard/>}/>
            <Route path="chat" element={<Chat/>}/>
            <Route path="analytics" element={<Analytics/>}/>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
