const API='';

function getToken(){return localStorage.getItem('oris_token')}
function setToken(t){localStorage.setItem('oris_token',t)}
function removeToken(){localStorage.removeItem('oris_token');localStorage.removeItem('oris_user')}
function getUser(){try{return JSON.parse(localStorage.getItem('oris_user'))}catch{return null}}
function setUser(u){localStorage.setItem('oris_user',JSON.stringify(u))}

async function apiRequest(url,options={}){
  const token=getToken();
  const headers={'Content-Type':'application/json',...(options.headers||{})};
  if(token)headers['Authorization']='Bearer '+token;
  const res=await fetch(API+url,{...options,headers});
  const data=await res.json();
  if(!res.ok){
    if(data.error==='banned'){
      goTo('/pages/ban.html');
      throw new Error('banned');
    }
    throw new Error(data.error||'Ошибка');
  }
  return data;
}

async function apiUpload(file){
  const token=getToken();
  const fd=new FormData();
  fd.append('file',file);
  const res=await fetch(API+'/api/upload',{method:'POST',headers:{'Authorization':'Bearer '+token},body:fd});
  const data=await res.json();
  if(!res.ok)throw new Error(data.error||'Ошибка загрузки');
  return data;
}

function showToast(message,type='info'){
  let c=document.querySelector('.toast-container');
  if(!c){c=document.createElement('div');c.className='toast-container';document.body.appendChild(c)}
  const t=document.createElement('div');
  t.className='toast'+(type==='error'?' toast-error':type==='success'?' toast-success':'');
  t.textContent=message;c.appendChild(t);
  setTimeout(()=>{t.style.animation='toastOut .3s ease forwards';setTimeout(()=>t.remove(),300)},3000);
}

function timeAgo(date){
  const diff=Math.floor((new Date()-new Date(date))/1000);
  if(diff<60)return'сейчас';
  if(diff<3600)return Math.floor(diff/60)+' мин';
  if(diff<86400)return Math.floor(diff/3600)+' ч';
  if(diff<604800)return Math.floor(diff/86400)+' д';
  const d=new Date(date);
  const m=['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  return d.getDate()+' '+m[d.getMonth()];
}

function formatNum(n){
  if(n>=1000000)return(n/1000000).toFixed(1)+'M';
  if(n>=1000)return(n/1000).toFixed(1)+'K';
  return n.toString();
}

function goTo(path){window.location.href=path}
function goProfile(u){window.location.href='/pages/profile.html?u='+u}

function openImageViewer(src){
  let v=document.getElementById('imageViewer');
  if(!v){
    v=document.createElement('div');v.id='imageViewer';v.className='image-viewer';
    v.innerHTML='<div class="close-btn" onclick="closeImageViewer()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div><img src="" alt="">';
    v.addEventListener('click',e=>{if(e.target===v)closeImageViewer()});
    document.body.appendChild(v);
  }
  v.querySelector('img').src=src;v.classList.add('active');document.body.style.overflow='hidden';
}

function closeImageViewer(){
  const v=document.getElementById('imageViewer');
  if(v){v.classList.remove('active');document.body.style.overflow=''}
}

document.addEventListener('keydown',e=>{if(e.key==='Escape')closeImageViewer()});

function createAudioPlayer(url,id){
  const pid='player_'+(id||Math.random().toString(36).slice(2));
  return'<div class="audio-player" id="'+pid+'" data-src="'+url+'">'
    +'<div class="play-btn" onclick="toggleAudio(\''+pid+'\')">'
    +'<svg viewBox="0 0 24 24" class="icon-play"><polygon points="6,3 20,12 6,21"/></svg>'
    +'<svg viewBox="0 0 24 24" class="icon-pause" style="display:none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
    +'</div>'
    +'<div class="track-info">'
    +'<div class="progress-bar" onclick="seekAudio(event,\''+pid+'\')"><div class="progress-fill"></div></div>'
    +'<div class="time"><span class="current-time">0:00</span> / <span class="total-time">0:00</span></div>'
    +'</div></div>';
}

const audioInstances={};

function toggleAudio(pid){
  const el=document.getElementById(pid);if(!el)return;
  Object.keys(audioInstances).forEach(k=>{
    if(k!==pid&&audioInstances[k]&&!audioInstances[k].paused){
      audioInstances[k].pause();
      const o=document.getElementById(k);
      if(o){o.querySelector('.icon-play').style.display='';o.querySelector('.icon-pause').style.display='none'}
    }
  });
  if(!audioInstances[pid]){
    const a=new Audio(el.dataset.src);audioInstances[pid]=a;
    a.addEventListener('loadedmetadata',()=>{el.querySelector('.total-time').textContent=formatTime(a.duration)});
    a.addEventListener('timeupdate',()=>{
      if(a.duration){
        el.querySelector('.progress-fill').style.width=(a.currentTime/a.duration*100)+'%';
        el.querySelector('.current-time').textContent=formatTime(a.currentTime);
      }
    });
    a.addEventListener('ended',()=>{
      el.querySelector('.icon-play').style.display='';el.querySelector('.icon-pause').style.display='none';
      el.querySelector('.progress-fill').style.width='0%';el.querySelector('.current-time').textContent='0:00';
    });
  }
  const a=audioInstances[pid];
  if(a.paused){a.play();el.querySelector('.icon-play').style.display='none';el.querySelector('.icon-pause').style.display=''}
  else{a.pause();el.querySelector('.icon-play').style.display='';el.querySelector('.icon-pause').style.display='none'}
}

function seekAudio(e,pid){
  const a=audioInstances[pid];if(!a||!a.duration)return;
  const r=e.currentTarget.getBoundingClientRect();
  a.currentTime=(e.clientX-r.left)/r.width*a.duration;
}

function formatTime(s){
  if(!s||isNaN(s))return'0:00';
  const m=Math.floor(s/60),sec=Math.floor(s%60);
  return m+':'+(sec<10?'0':'')+sec;
}

function avatarPlaceholder(name,size){
  const l=(name||'?')[0].toUpperCase(),sz=size||40;
  return'<div style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:'+sz*.4+'px;color:var(--text-tertiary);flex-shrink:0">'+l+'</div>';
}

function renderAvatar(user,sizeClass){
  if(user&&user.avatar){
    const safeName=(user.name||'').replace(/'/g,"\\'");
    return'<img class="avatar '+(sizeClass||'')+'" src="'+user.avatar+'" alt="'+user.name+'" onerror="this.outerHTML=avatarPlaceholder(\''+safeName+'\',this.offsetWidth)">';
  }
  const sizes={'avatar-sm':32,'avatar-md':48,'avatar-lg':64,'avatar-xl':96,'avatar-2xl':120};
  return avatarPlaceholder(user?user.name:'?',sizes[sizeClass]||40);
}

const ICONS={
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  explore:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
  profile:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  image:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  video:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
  mic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
  heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
  comment:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  more:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
  grid:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>'
};

function icon(name,cls){return'<span class="icon '+(cls||'')+'">'+( ICONS[name]||'')+'</span>'}

function getBadge(user){
  if(!user||user.verifiedBadge!==true)return'';
  return '<span class="vbadge"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
    +'<path class="vb-bg" d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.63 13.43 1.75 12 1.75s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"/>'
    +'<path class="vb-check" d="M9 12l2 2 4-4" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    +'</svg></span>';
}

function getBadgeLg(user){
  if(!user||user.verifiedBadge!==true)return'';
  return '<span class="vbadge vbadge-lg"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
    +'<path class="vb-bg" d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.63 13.43 1.75 12 1.75s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"/>'
    +'<path class="vb-check" d="M9 12l2 2 4-4" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    +'</svg></span>';
}

// Тема
function getTheme(){return localStorage.getItem('oris_theme')||'light'}
function setTheme(t){localStorage.setItem('oris_theme',t);document.documentElement.setAttribute('data-theme',t)}
function initTheme(){
  const s=localStorage.getItem('oris_theme');
  if(s){
    document.documentElement.setAttribute('data-theme',s);
    document.documentElement.style.colorScheme=s;
  }
}
initTheme();
document.addEventListener('DOMContentLoaded',initTheme);