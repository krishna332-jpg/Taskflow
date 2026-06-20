import React,{useState,useEffect} from 'react';
import {useParams,Link} from 'react-router-dom';
import {DragDropContext,Droppable,Draggable} from '@hello-pangea/dnd';
import {tasksAPI,projectsAPI} from '../utils/api';
import {useAuth} from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {format} from 'date-fns';

export default function ProjectBoard(){
  const {id}=useParams();
  const {user}=useAuth();
  const [project,setProject]=useState(null);
  const [tasks,setTasks]=useState([]);
  const [members,setMembers]=useState([]);
  const [showCreate,setShowCreate]=useState(false);
  const [selected,setSelected]=useState(null);
  const [editMode,setEditMode]=useState(false);
  const [editDraft,setEditDraft]=useState(null);
  const [assignCode,setAssignCode]=useState('');
  const [assigning,setAssigning]=useState(false);
  const [form,setForm]=useState({title:'',description:'',priority:'medium',due_date:''});
  const [creating,setCreating]=useState(false);
  const [search,setSearch]=useState('');
  const [showMembers,setShowMembers]=useState(false);

  const load=async()=>{
    try{
      const[p,t,m]=await Promise.all([projectsAPI.getAll(),tasksAPI.getAll({project_id:id}),projectsAPI.getMembers(id)]);
      setProject(p.data.find(x=>x.id===parseInt(id)));
      setTasks(t.data);
      setMembers(m.data);
    }catch(e){}
  };
  useEffect(()=>{load();},[id]);

  const isOwner=project&&user&&project.owner_id===user.id;
  const canEditTask=t=>isOwner||(t.created_by_id===user?.id);

  const filtered=tasks.filter(t=>!search||t.title.toLowerCase().includes(search.toLowerCase()));

  const onDragEnd=async({source,destination})=>{
    if(!destination||source.index===destination.index)return;
    const reordered=[...tasks];
    const[moved]=reordered.splice(source.index,1);
    reordered.splice(destination.index,0,moved);
    setTasks(reordered);
    try{await tasksAPI.reorder(reordered.map(t=>t.id));}catch{load();}
  };

  const toggleComplete=async(task)=>{
    const newVal=!task.completed;
    setTasks(prev=>prev.map(t=>t.id===task.id?{...t,completed:newVal,status:newVal?'done':t.status}:t));
    try{await tasksAPI.update(task.id,{completed:newVal});}
    catch{load();toast.error('Failed to update');}
  };

  const handleCreate=async e=>{
    e.preventDefault();setCreating(true);
    try{
      await tasksAPI.create({title:form.title,description:form.description,priority:form.priority,due_date:form.due_date||null,project_id:parseInt(id)});
      toast.success('Task added');setShowCreate(false);
      setForm({title:'',description:'',priority:'medium',due_date:''});load();
    }catch(err){toast.error(err.response?.data?.detail||'Failed');}
    finally{setCreating(false);}
  };

  const startEdit=task=>{setEditDraft({...task});setEditMode(true);};
  const saveEdit=async()=>{
    try{
      await tasksAPI.update(editDraft.id,{title:editDraft.title,description:editDraft.description,priority:editDraft.priority,due_date:editDraft.due_date||null});
      toast.success('Updated');setEditMode(false);
      const updated={...selected,...editDraft};
      setSelected(updated);load();
    }catch(err){toast.error(err.response?.data?.detail||'Only the creator can edit this task');}
  };

  const handleDelete=async taskId=>{
    try{await tasksAPI.delete(taskId);setTasks(p=>p.filter(t=>t.id!==taskId));setSelected(null);toast.success('Deleted');}
    catch(err){toast.error(err.response?.data?.detail||'Failed');}
  };

  const handleAssign=async()=>{
    if(!assignCode.trim()||!selected)return;
    setAssigning(true);
    try{
      const res=await tasksAPI.assign(selected.id,assignCode.trim());
      setSelected(res.data);
      setTasks(prev=>prev.map(t=>t.id===selected.id?res.data:t));
      setAssignCode('');
      toast.success('Member assigned');
      load();
    }catch(err){toast.error(err.response?.data?.detail||'Invalid code');}
    finally{setAssigning(false);}
  };

  const handleUnassign=async userId=>{
    try{
      await tasksAPI.unassign(selected.id,userId);
      const updated={...selected,assignees:selected.assignees.filter(a=>a.id!==userId)};
      setSelected(updated);
      setTasks(prev=>prev.map(t=>t.id===selected.id?updated:t));
      toast.success('Unassigned');
    }catch{toast.error('Failed');}
  };

  const handleRemoveMember=async userId=>{
    if(!window.confirm('Remove this member from the project?'))return;
    try{
      await projectsAPI.removeMember(id,userId);
      setMembers(prev=>prev.filter(m=>m.id!==userId));
      toast.success('Member removed');
    }catch(err){toast.error(err.response?.data?.detail||'Only the owner can remove members');}
  };

  const priorityColor={urgent:'var(--red)',high:'var(--orange)',medium:'var(--yellow)',low:'var(--green)'};

  return(
    <div style={{padding:'20px 24px',minHeight:'100%'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,gap:12,flexWrap:'wrap'}} className="fu">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <Link to="/projects" style={{display:'flex',alignItems:'center',padding:'6px 7px',borderRadius:6,color:'var(--text3)',textDecoration:'none',background:'var(--bg2)',border:'1px solid var(--border)'}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
          </Link>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <div style={{width:9,height:9,borderRadius:2,background:project?.color||'var(--orange)'}}/>
              <h1 style={{fontSize:18,fontWeight:900,color:'var(--text)',letterSpacing:'-.03em'}}>{project?.name||'Loading...'}</h1>
            </div>
            {project?.description&&<p style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{project.description}</p>}
          </div>
        </div>
        <div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap'}}>
          <input className="inp" style={{width:130,fontSize:11,padding:'6px 10px'}} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <button className="btn btg btsm" onClick={()=>setShowMembers(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            {members.length} {members.length===1?'Member':'Members'}
          </button>
          {project?.invite_code&&(
            <button onClick={()=>{navigator.clipboard?.writeText(project.invite_code);toast.success('Code copied');}} className="btn btg btsm">
              {project.invite_code}
            </button>
          )}
          <button className="btn bto btsm" onClick={()=>setShowCreate(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Task
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="tasklist">
          {(prov)=>(
            <div ref={prov.innerRef} {...prov.droppableProps} style={{display:'flex',flexDirection:'column',gap:8,maxWidth:760}}>
              {filtered.map((task,idx)=>(
                <Draggable key={task.id} draggableId={String(task.id)} index={idx}>
                  {(dprov,dsnap)=>(
                    <div ref={dprov.innerRef} {...dprov.draggableProps}
                      className="card"
                      style={{padding:'12px 14px',display:'flex',alignItems:'flex-start',gap:12,cursor:'pointer',
                        ...(dsnap.isDragging?{boxShadow:'var(--shadowl)',borderColor:'var(--orange)'}:{}),
                        ...dprov.draggableProps.style}}
                      onClick={()=>setSelected(task)}>
                      <div {...dprov.dragHandleProps} onClick={e=>e.stopPropagation()} style={{display:'flex',alignItems:'center',color:'var(--text3)',cursor:'grab',paddingTop:2}}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                      </div>
                      <div className={`checkbox ${task.completed?'checked':''}`} onClick={e=>{e.stopPropagation();toggleComplete(task);}} style={{marginTop:2}}>
                        {task.completed&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:task.description?4:0}}>
                          {task.ai_generated&&<span style={{fontSize:8,fontFamily:"'JetBrains Mono',monospace",color:'var(--orange)',background:'var(--odim)',padding:'1px 5px',borderRadius:99,fontWeight:700}}>AI</span>}
                          <span style={{fontSize:13,fontWeight:700,color:task.completed?'var(--text3)':'var(--text)',textDecoration:task.completed?'line-through':'none'}}>{task.title}</span>
                        </div>
                        {task.description&&<p style={{fontSize:11,color:'var(--text3)',lineHeight:1.4,marginBottom:6}}>{task.description}</p>}
                        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                          <span style={{fontSize:9,padding:'2px 7px',borderRadius:99,background:`${priorityColor[task.priority]}1a`,color:priorityColor[task.priority],fontFamily:"'JetBrains Mono',monospace",fontWeight:700,textTransform:'uppercase'}}>{task.priority}</span>
                          {task.due_date&&<span style={{fontSize:10,color:'var(--text3)',fontFamily:"'JetBrains Mono',monospace"}}>{format(new Date(task.due_date),'MMM d')}</span>}
                          {task.assignees?.length>0&&(
                            <div style={{display:'flex',gap:-4}}>
                              {task.assignees.slice(0,3).map(a=>(
                                <div key={a.id} style={{width:18,height:18,borderRadius:5,background:'var(--orange)',border:'1.5px solid var(--bg1)',marginLeft:-4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800,color:'#fff'}}>{(a.full_name||'U')[0].toUpperCase()}</div>
                              ))}
                            </div>
                          )}
                          <button onClick={e=>{e.stopPropagation();setSelected(task);}} style={{display:'flex',alignItems:'center',gap:3,fontSize:10,color:'var(--text3)',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:99,padding:'2px 8px',cursor:'pointer',fontFamily:"'JetBrains Mono',monospace"}}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Assign
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {prov.placeholder}
              {filtered.length===0&&(
                <div className="card fu" style={{padding:'40px 20px',textAlign:'center'}}>
                  <div style={{fontSize:13,color:'var(--text3)',marginBottom:14}}>No tasks yet</div>
                  <button className="btn bto btsm" onClick={()=>setShowCreate(true)}>Add your first task</button>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Create task modal */}
      {showCreate&&(
        <div style={M.ov} onClick={()=>setShowCreate(false)}>
          <div className="card si" style={M.modal} onClick={e=>e.stopPropagation()}>
            <div style={M.head}><h2 style={M.title}>New Task</h2><button onClick={()=>setShowCreate(false)} style={M.x}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
            <form onSubmit={handleCreate}>
              <div className="fg"><label className="lbl">Title</label><input className="inp" placeholder="Task title" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required autoFocus/></div>
              <div className="fg"><label className="lbl">Description</label><textarea className="inp" rows={3} placeholder="What exactly needs to be done..." value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{resize:'vertical'}}/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div className="fg"><label className="lbl">Priority</label><select className="inp" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                <div className="fg"><label className="lbl">Due Date</label><input type="date" className="inp" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))}/></div>
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}><button type="button" className="btn btg btsm" onClick={()=>setShowCreate(false)}>Cancel</button><button type="submit" className="btn bto btsm" disabled={creating}>{creating?'Creating...':'Create Task'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Task detail panel */}
      {selected&&(
        <div style={M.ov} onClick={()=>{setSelected(null);setEditMode(false);}}>
          <div className="card sr" style={{...M.modal,maxWidth:460}} onClick={e=>e.stopPropagation()}>
            <div style={M.head}>
              <div style={{flex:1}}>
                {selected.ai_generated&&<div style={{fontSize:9,fontFamily:"'JetBrains Mono',monospace",color:'var(--orange)',background:'var(--odim)',padding:'2px 6px',borderRadius:99,marginBottom:8,display:'inline-block',fontWeight:700}}>AI GENERATED</div>}
                {editMode?<input style={{...M.title,background:'none',border:'none',outline:'none',padding:0,width:'100%'}} value={editDraft.title} onChange={e=>setEditDraft(d=>({...d,title:e.target.value}))}/>:<h2 style={M.title}>{selected.title}</h2>}
              </div>
              <div style={{display:'flex',gap:6}}>
                {canEditTask(selected)&&(!editMode?<button className="btn btg btsm" onClick={()=>startEdit(selected)}>Edit</button>:<button className="btn bto btsm" onClick={saveEdit}>Save</button>)}
                <button onClick={()=>{setSelected(null);setEditMode(false);}} style={M.x}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              </div>
            </div>

            {editMode?(
              <div style={{marginBottom:14}}>
                <div className="fg"><label className="lbl">Description</label><textarea className="inp" rows={3} value={editDraft.description||''} onChange={e=>setEditDraft(d=>({...d,description:e.target.value}))} style={{resize:'vertical'}}/></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div className="fg"><label className="lbl">Priority</label><select className="inp" value={editDraft.priority} onChange={e=>setEditDraft(d=>({...d,priority:e.target.value}))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                  <div className="fg"><label className="lbl">Due Date</label><input type="date" className="inp" value={editDraft.due_date?editDraft.due_date.split('T')[0]:''} onChange={e=>setEditDraft(d=>({...d,due_date:e.target.value}))}/></div>
                </div>
              </div>
            ):(
              <>
                {selected.description&&<p style={{fontSize:12,color:'var(--text2)',lineHeight:1.6,marginBottom:14}}>{selected.description}</p>}
                <div style={{display:'flex',gap:7,marginBottom:14,flexWrap:'wrap'}}>
                  <span className={`badge badge-${selected.priority}`}>{selected.priority}</span>
                  <span className={`badge badge-${selected.status}`}>{selected.status.replace('_',' ')}</span>
                  {selected.due_date&&<span style={{fontSize:10,color:'var(--text3)',fontFamily:"'JetBrains Mono',monospace",padding:'2px 7px',background:'var(--bg3)',borderRadius:99}}>Due {format(new Date(selected.due_date),'MMM d, yyyy')}</span>}
                </div>
                {!canEditTask(selected)&&<p style={{fontSize:11,color:'var(--text3)',marginBottom:14,fontStyle:'italic'}}>Only the task creator can edit this content. You can still update its progress.</p>}
              </>
            )}

            <div className="fg">
              <label className="lbl">Assign a member (by their code)</label>
              <div style={{display:'flex',gap:8,marginBottom:10}}>
                <input className="inp" placeholder="e.g. ABCD-1234" value={assignCode} onChange={e=>setAssignCode(e.target.value.toUpperCase())} style={{fontSize:12}}/>
                <button className="btn bto btsm" onClick={handleAssign} disabled={assigning}>{assigning?'...':'Assign'}</button>
              </div>
              {selected.assignees?.length>0&&(
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {selected.assignees.map(a=>(
                    <div key={a.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'var(--bg2)',borderRadius:7,border:'1px solid var(--border)'}}>
                      {<div style={{width:22,height:22,borderRadius:5,background:'var(--orange)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#fff'}}>{(a.full_name||'U')[0].toUpperCase()}</div>}
                      <span style={{fontSize:12,color:'var(--text)',flex:1}}>{a.full_name}</span>
                      <button onClick={()=>handleUnassign(a.id)} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',padding:2}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="divider"/>
            {(isOwner||selected.created_by_id===user?.id)&&<button className="btn btd btsm" onClick={()=>handleDelete(selected.id)}>Delete task</button>}
          </div>
        </div>
      )}

      {/* Members panel */}
      {showMembers&&(
        <div style={M.ov} onClick={()=>setShowMembers(false)}>
          <div className="card si" style={{...M.modal,maxWidth:400}} onClick={e=>e.stopPropagation()}>
            <div style={M.head}><h2 style={M.title}>Project Members</h2><button onClick={()=>setShowMembers(false)} style={M.x}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {members.map(m=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'var(--bg2)',borderRadius:8,border:'1px solid var(--border)'}}>
                  {<div style={{width:30,height:30,borderRadius:7,background:'var(--orange)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff'}}>{(m.full_name||'U')[0].toUpperCase()}</div>}
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{m.full_name}</div>
                    <div style={{fontSize:10,color:'var(--text3)'}}>{m.email}</div>
                  </div>
                  {m.role==='owner'&&<span style={{fontSize:9,padding:'2px 6px',borderRadius:99,background:'var(--odim)',color:'var(--orange)',fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>OWNER</span>}
                  {isOwner&&m.role!=='owner'&&<button onClick={()=>handleRemoveMember(m.id)} className="btn btd btsm" style={{padding:'3px 8px',fontSize:10}}>Remove</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const M={
  ov:{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,backdropFilter:'blur(8px)',padding:16},
  modal:{padding:24,maxWidth:440,width:'100%',boxShadow:'var(--shadowl)',maxHeight:'88vh',overflowY:'auto'},
  head:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18},
  title:{fontSize:17,fontWeight:800,color:'var(--text)',letterSpacing:'-.03em'},
  x:{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',padding:3,display:'flex',flexShrink:0},
};