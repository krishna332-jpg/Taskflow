import React,{useState,useEffect} from 'react';
import {tasksAPI,projectsAPI} from '../utils/api';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,LineChart,Line,PieChart,Pie,Cell} from 'recharts';
import {format,subDays} from 'date-fns';

export default function Analytics(){
  const [tasks,setTasks]=useState([]);
  const [projects,setProjects]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    Promise.all([tasksAPI.getAll(),projectsAPI.getAll()]).then(([t,p])=>{setTasks(t.data);setProjects(p.data);}).finally(()=>setLoading(false));
  },[]);

  const completedTasks=tasks.filter(t=>t.completed);
  const avgPerProject=projects.length>0?(tasks.length/projects.length).toFixed(1):0;

  const weeklyData=Array.from({length:7},(_,i)=>{
    const d=subDays(new Date(),6-i);
    const dayTasks=tasks.filter(t=>t.created_at&&new Date(t.created_at).toDateString()===d.toDateString());
    const dayDone=completedTasks.filter(t=>t.updated_at&&new Date(t.updated_at).toDateString()===d.toDateString());
    return{day:format(d,'EEE'),created:dayTasks.length,completed:dayDone.length};
  });

  const priorityData=[
    {name:'Urgent',value:tasks.filter(t=>t.priority==='urgent').length,color:'#f87171'},
    {name:'High',value:tasks.filter(t=>t.priority==='high').length,color:'#ff5722'},
    {name:'Medium',value:tasks.filter(t=>t.priority==='medium').length,color:'#fbbf24'},
    {name:'Low',value:tasks.filter(t=>t.priority==='low').length,color:'#4ade80'},
  ].filter(d=>d.value>0);

  const projectData=projects.map(p=>({name:p.name.length>10?p.name.slice(0,10)+'...':p.name,tasks:p.task_count,done:p.done_count}));

  if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><span className="spinner" style={{width:24,height:24}}/></div>;

  return(
    <div style={{padding:24,maxWidth:1280,margin:'0 auto'}}>
      <div style={{marginBottom:24}} className="fu">
        <h1 style={{fontSize:24,fontWeight:900,color:'var(--text)',letterSpacing:'-.04em'}}>Analytics</h1>
        <p style={{fontSize:12,color:'var(--text3)',marginTop:4}}>Insights into your team's productivity</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}} className="grid-mobile-2">
        {[
          {label:'Total Tasks',value:tasks.length,color:'var(--orange)'},
          {label:'Completed',value:completedTasks.length,color:'var(--green)'},
          {label:'Avg / Project',value:avgPerProject,color:'var(--blue)'},
          {label:'Active Projects',value:projects.length,color:'var(--purple)'},
        ].map((s,i)=>(
          <div key={i} className="card fu" style={{padding:16,animationDelay:(i*0.06)+'s'}}>
            <div style={{fontSize:26,fontWeight:900,color:s.color,letterSpacing:'-.04em',lineHeight:1,marginBottom:4}}>{s.value}</div>
            <div style={{fontSize:11,color:'var(--text3)',fontFamily:"'JetBrains Mono',monospace"}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:12,marginBottom:16}} className="grid-mobile-1">
        <div className="card fu" style={{padding:18}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:2}}>Created vs Completed</div>
          <div style={{fontSize:11,color:'var(--text3)',marginBottom:14}}>Last 7 days trend</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weeklyData} margin={{top:4,right:4,left:-30,bottom:0}}>
              <XAxis dataKey="day" tick={{fontSize:10,fill:'var(--text3)',fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10,fill:'var(--text3)'}} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip contentStyle={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,fontSize:12,color:'var(--text)'}}/>
              <Line type="monotone" dataKey="created" stroke="#ff5722" strokeWidth={2} dot={{r:3}}/>
              <Line type="monotone" dataKey="completed" stroke="#4ade80" strokeWidth={2} dot={{r:3}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card fu" style={{padding:18}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:2}}>Priority Mix</div>
          <div style={{fontSize:11,color:'var(--text3)',marginBottom:14}}>All tasks by priority</div>
          {priorityData.length>0?(
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={priorityData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {priorityData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                </Pie>
                <Tooltip contentStyle={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}}/>
              </PieChart>
            </ResponsiveContainer>
          ):<div style={{textAlign:'center',padding:'40px 0',fontSize:12,color:'var(--text3)'}}>No data yet</div>}
        </div>
      </div>

      <div className="card fu" style={{padding:18}}>
        <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:2}}>Tasks by Project</div>
        <div style={{fontSize:11,color:'var(--text3)',marginBottom:14}}>Total vs completed per project</div>
        {projectData.length>0?(
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={projectData} margin={{top:4,right:4,left:-20,bottom:0}}>
              <XAxis dataKey="name" tick={{fontSize:10,fill:'var(--text3)',fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10,fill:'var(--text3)'}} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip contentStyle={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}}/>
              <Bar dataKey="tasks" fill="#2a2a2a" radius={[4,4,0,0]}/>
              <Bar dataKey="done" fill="#4ade80" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        ):<div style={{textAlign:'center',padding:'40px 0',fontSize:12,color:'var(--text3)'}}>No projects yet</div>}
      </div>
    </div>
  );
}
