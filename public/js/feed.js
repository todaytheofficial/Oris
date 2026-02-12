document.addEventListener('DOMContentLoaded',()=>{
  const token=getToken();
  if(!token){goTo('/pages/auth.html');return}

  let currentUser=null,currentTab='feed',page=1,loading=false,hasMore=true,composerMedia=[];

async function loadMe(){
  try{
    const data=await apiRequest('/api/auth/me');
    currentUser=data.user;
    if(!currentUser||currentUser.registrationStep<4){goTo('/pages/auth.html');return}
    setUser(currentUser);
    if(currentUser.theme)setTheme(currentUser.theme);
    renderSidebar();
  }catch(e){
    if(e.message==='banned'){goTo('/pages/ban.html');return}
    removeToken();goTo('/pages/auth.html');
  }
}

function renderSidebar(){
  const p=document.getElementById('sidebarProfile');
  p.innerHTML=renderAvatar(currentUser,'avatar')+'<div class="sidebar-profile-info"><div class="sidebar-profile-name">'+currentUser.name+getBadge(currentUser)+'</div><div class="sidebar-profile-username">@'+currentUser.username+'</div></div>';
  p.onclick=()=>goProfile(currentUser.username);
  const ma=document.getElementById('mobileProfileAvatar');
  if(ma)ma.innerHTML=renderAvatar(currentUser,'avatar-sm');

  // Показать кнопку админки
  const adminBtn=document.getElementById('adminNavBtn');
  if(adminBtn){
    if(currentUser.role==='admin'||currentUser.role==='creator'){
      adminBtn.style.display='flex';
    }else{
      adminBtn.style.display='none';
    }
  }
}

  document.querySelectorAll('.feed-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.feed-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      currentTab=tab.dataset.tab;page=1;hasMore=true;
      document.getElementById('postsList').innerHTML='';loadPosts();
    });
  });

  async function loadPosts(){
    if(loading||!hasMore)return;
    loading=true;document.getElementById('feedLoader').style.display='flex';
    try{
      const ep=currentTab==='feed'?'/api/posts/feed':'/api/posts/explore';
      const data=await apiRequest(`${ep}?page=${page}&limit=20`);
      if(data.posts.length===0&&page===1){
        document.getElementById('postsList').innerHTML=`<div class="empty-state">${ICONS.home}<h3>${currentTab==='feed'?'Лента пуста':'Нет постов'}</h3><p>${currentTab==='feed'?'Подпишитесь на кого-нибудь':'Будьте первым!'}</p></div>`;
      }
      data.posts.forEach(post=>{document.getElementById('postsList').insertAdjacentHTML('beforeend',renderPost(post))});
      hasMore=page<data.totalPages;page++;
    }catch(err){showToast(err.message,'error')}
    finally{loading=false;document.getElementById('feedLoader').style.display='none'}
  }

  function renderPost(post){
    const a=post.author,liked=post.likes.includes(currentUser._id);
    const images=post.media.filter(m=>m.type==='image'),videos=post.media.filter(m=>m.type==='video'),audios=post.media.filter(m=>m.type==='audio');
    let mediaHTML='';
    if(images.length+videos.length>0){
      let items='';
      images.forEach(m=>{items+=`<div class="media-item" onclick="openImageViewer('${m.url}')"><img src="${m.url}" alt="" loading="lazy"></div>`});
      videos.forEach(m=>{items+=`<div class="media-item"><video src="${m.url}" controls preload="metadata"></video></div>`});
      const c=images.length+videos.length;
      const g=c>=4?'grid-4':c===3?'grid-3':c===2?'grid-2':'grid-1';
      mediaHTML=`<div class="post-media ${g}">${items}</div>`;
    }
    let audioHTML=audios.map((au,i)=>createAudioPlayer(au.url,au.url+'_'+i)).join('');
    return`<div class="post" id="post-${post._id}">
      <div class="post-avatar" onclick="goProfile('${a.username}')">${renderAvatar(a,'avatar')}</div>
      <div class="post-body">
        <div class="post-header">
          <span class="post-name" onclick="goProfile('${a.username}')">${a.name}${getBadge(a)}</span>
          <span class="post-username" onclick="goProfile('${a.username}')">@${a.username}</span>
          <span class="post-dot">&middot;</span>
          <span class="post-time">${timeAgo(post.createdAt)}</span>
          <div class="post-options">
            <div class="post-options-btn" onclick="togglePostMenu('${post._id}')">${ICONS.more}</div>
            <div class="post-menu" id="menu-${post._id}">
              ${a._id===currentUser._id?`<div class="post-menu-item danger" onclick="deletePost('${post._id}')">${ICONS.trash} Удалить</div>`:`<div class="post-menu-item" onclick="goProfile('${a.username}')">${ICONS.profile} Профиль</div>`}
            </div>
          </div>
        </div>
        ${post.text?`<div class="post-text">${escapeHTML(post.text)}</div>`:''}
        ${mediaHTML}${audioHTML}
        <div class="post-actions">
          <div class="post-action ${liked?'liked':''}" onclick="likePost('${post._id}',this)">${ICONS.heart}<span>${post.likes.length||''}</span></div>
          <div class="post-action" onclick="toggleComments('${post._id}')">${ICONS.comment}<span>${post.comments.length||''}</span></div>
        </div>
        <div class="comments-section hidden" id="comments-${post._id}">
          ${post.comments.map(c=>renderComment(c)).join('')}
          <div class="comment-form">
            <input type="text" placeholder="Комментарий..." onkeydown="if(event.key==='Enter')submitComment('${post._id}',this)">
            <button onclick="submitComment('${post._id}',this.previousElementSibling)">Отправить</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function renderComment(c){
    const a=c.author||{};
    return`<div class="comment-item">
      <div onclick="goProfile('${a.username||''}')" style="cursor:pointer">${renderAvatar(a,'avatar-sm')}</div>
      <div class="comment-body">
        <div><span class="font-semibold text-sm" onclick="goProfile('${a.username||''}')" style="cursor:pointer">${a.name||''}${getBadge(a)}</span></div>
        <div class="comment-text">${escapeHTML(c.text)}</div>
        <div class="comment-time">${timeAgo(c.createdAt)}</div>
      </div>
    </div>`;
  }

  function escapeHTML(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}

  window.likePost=async function(id,el){
    try{const d=await apiRequest(`/api/posts/${id}/like`,{method:'POST'});el.querySelector('span').textContent=d.likes||'';el.classList.toggle('liked',d.liked)}catch(e){showToast(e.message,'error')}
  };

  window.toggleComments=function(id){const s=document.getElementById('comments-'+id);if(s)s.classList.toggle('hidden')};

  window.submitComment=async function(id,input){
    const text=input.value.trim();if(!text)return;
    try{
      const d=await apiRequest(`/api/posts/${id}/comment`,{method:'POST',body:JSON.stringify({text})});
      input.value='';
      const section=document.getElementById('comments-'+id);
      section.querySelector('.comment-form').insertAdjacentHTML('beforebegin',renderComment(d.comment));
      const postEl=document.getElementById('post-'+id);
      const cnt=postEl.querySelectorAll('.post-action')[1].querySelector('span');
      cnt.textContent=parseInt(cnt.textContent||0)+1;
    }catch(e){showToast(e.message,'error')}
  };

  window.deletePost=async function(id){
    if(!confirm('Удалить пост?'))return;
    try{await apiRequest(`/api/posts/${id}`,{method:'DELETE'});const el=document.getElementById('post-'+id);if(el)el.remove();showToast('Удалён','success')}catch(e){showToast(e.message,'error')}
  };

  window.togglePostMenu=function(id){
    document.querySelectorAll('.post-menu.show').forEach(m=>{if(m.id!=='menu-'+id)m.classList.remove('show')});
    document.getElementById('menu-'+id).classList.toggle('show');
  };

  document.addEventListener('click',e=>{if(!e.target.closest('.post-options'))document.querySelectorAll('.post-menu.show').forEach(m=>m.classList.remove('show'))});

  // Composer
  const ct=document.getElementById('composerText'),cp=document.getElementById('composerMediaPreview');
  ct.addEventListener('input',()=>{ct.style.height='auto';ct.style.height=ct.scrollHeight+'px'});

  document.getElementById('addImageBtn').addEventListener('click',()=>document.getElementById('imageFileInput').click());
  document.getElementById('addVideoBtn').addEventListener('click',()=>document.getElementById('videoFileInput').click());
  document.getElementById('addAudioBtn').addEventListener('click',()=>document.getElementById('audioFileInput').click());
  document.getElementById('imageFileInput').addEventListener('change',handleFile);
  document.getElementById('videoFileInput').addEventListener('change',handleFile);
  document.getElementById('audioFileInput').addEventListener('change',handleFile);

  async function handleFile(e){
    for(const f of Array.from(e.target.files)){
      try{showToast('Загрузка '+f.name+'...','info');const d=await apiUpload(f);composerMedia.push({type:d.type,url:d.url});renderCP();showToast('Загружено','success')}catch(err){showToast(err.message,'error')}
    }
    e.target.value='';
  }

  function renderCP(){
    cp.innerHTML=composerMedia.map((m,i)=>{
      const icon=m.type==='image'?`<img src="${m.url}" alt="">`:m.type==='video'?ICONS.video:ICONS.mic;
      const style=m.type!=='image'?'style="display:flex;align-items:center;justify-content:center"':'';
      return`<div class="composer-media-item" ${style}>${icon}<div class="remove-media" onclick="removeComposerMedia(${i})">${ICONS.close}</div></div>`;
    }).join('');
  }

  window.removeComposerMedia=function(i){composerMedia.splice(i,1);renderCP()};

  document.getElementById('publishBtn').addEventListener('click',async()=>{
    const text=ct.value.trim();
    if(!text&&composerMedia.length===0)return showToast('Пост пуст','error');
    const btn=document.getElementById('publishBtn');btn.classList.add('btn-loading');btn.disabled=true;
    try{
      const d=await apiRequest('/api/posts',{method:'POST',body:JSON.stringify({text,media:composerMedia})});
      ct.value='';ct.style.height='auto';composerMedia=[];cp.innerHTML='';
      document.getElementById('postsList').insertAdjacentHTML('afterbegin',renderPost(d.post));
      showToast('Опубликовано','success');
    }catch(e){showToast(e.message,'error')}
    finally{btn.classList.remove('btn-loading');btn.disabled=false}
  });

  // Search
  const si=document.getElementById('searchInput'),sr=document.getElementById('searchResults');
  let st;
  if(si){
    si.addEventListener('input',()=>{
      clearTimeout(st);const q=si.value.trim();
      if(q.length<2){sr.classList.remove('show');return}
      st=setTimeout(async()=>{
        try{
          const d=await apiRequest('/api/users/search?q='+encodeURIComponent(q));
          sr.innerHTML=d.users.length===0?'<div style="padding:16px;text-align:center;color:var(--text-tertiary);font-size:14px">Никого не найдено</div>':d.users.map(u=>`<div class="search-result-item" onclick="goProfile('${u.username}')">${renderAvatar(u,'avatar-sm')}<div><div class="font-semibold text-sm">${u.name}${getBadge(u)}</div><div class="text-xs text-tertiary">@${u.username}</div></div></div>`).join('');
          sr.classList.add('show');
        }catch(e){console.error(e)}
      },300);
    });
    document.addEventListener('click',e=>{if(!e.target.closest('.search-box'))sr.classList.remove('show')});
  }

  window.addEventListener('scroll',()=>{if(window.innerHeight+window.scrollY>=document.body.offsetHeight-500)loadPosts()});

  document.querySelectorAll('[data-nav]').forEach(el=>{
    el.addEventListener('click',()=>{
      const n=el.dataset.nav;
      if(n==='feed')goTo('/pages/feed.html');
      else if(n==='explore'){
        document.querySelectorAll('.feed-tab').forEach(t=>t.classList.remove('active'));
        document.querySelector('[data-tab="explore"]').classList.add('active');
        currentTab='explore';page=1;hasMore=true;document.getElementById('postsList').innerHTML='';loadPosts();
      }else if(n==='profile')goProfile(currentUser.username);
    });
  });

  document.getElementById('logoutBtn').addEventListener('click',()=>{removeToken();goTo('/pages/auth.html')});

  loadMe().then(()=>loadPosts());
});