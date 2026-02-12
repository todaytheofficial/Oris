document.addEventListener('DOMContentLoaded',()=>{
  const token=getToken();
  if(!token){goTo('/pages/auth.html');return}

  let currentUser=null,profileUser=null,profileData=null,currentTab='posts',page=1,loading=false,hasMore=true;
  const params=new URLSearchParams(window.location.search);
  const targetUsername=params.get('u');

  async function init(){
    try{
      const d=await apiRequest('/api/auth/me');
      currentUser=d.user;setUser(currentUser);
      if(currentUser.theme)setTheme(currentUser.theme);
      await loadProfile(targetUsername||currentUser.username);
    }catch{removeToken();goTo('/pages/auth.html')}
  }

  async function loadProfile(username){
    try{
      const d=await apiRequest('/api/users/profile/'+username);
      profileUser=d.user;profileData=d;
      renderHeader();
      renderProfile();
      page=1;hasMore=true;
      document.getElementById('profilePosts').innerHTML='';
      loadPosts();
    }catch(e){
      showToast(e.message,'error');
      document.getElementById('profileContent').innerHTML='<div class="empty-state" style="padding-top:120px">'+ICONS.profile+'<h3>Пользователь не найден</h3></div>';
    }
  }

  // ---- Хедер: Назад + Имя + Настройки ----
  function renderHeader(){
    // Имя и кол-во постов
    document.getElementById('headerName').innerHTML=profileUser.name+getBadge(profileUser);
    document.getElementById('headerPostsCount').textContent=profileData.postsCount+' '+pluralPosts(profileData.postsCount);

    // Правая часть — настройки только для своего профиля
    const hr=document.getElementById('headerRight');
    if(profileData.isOwn){
      hr.innerHTML='<div class="header-settings-btn" id="openSettingsBtn" title="Настройки"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg></div>';
      document.getElementById('openSettingsBtn').addEventListener('click',openSettings);
    }else{
      hr.innerHTML='';
    }
  }

  function pluralPosts(n){
    const last=n%10,last2=n%100;
    if(last2>=11&&last2<=19)return'постов';
    if(last===1)return'пост';
    if(last>=2&&last<=4)return'поста';
    return'постов';
  }

  // ---- Профиль ----
  function renderProfile(){
    const own=profileData.isOwn;
    const av=profileUser.avatar
      ?'<img class="profile-avatar" src="'+profileUser.avatar+'" alt="'+profileUser.name+'">'
      :'<div class="profile-avatar-placeholder">'+ICONS.profile+'</div>';

      
    let actions='';
    if(own){
      actions='<button class="btn btn-secondary btn-sm" id="editProfileBtn">'+ICONS.edit+' Редактировать</button>';
    }else{
      const fc=profileData.isFollowing?'btn-secondary':'btn-primary';
      const ft=profileData.isFollowing?'Отписаться':'Подписаться';
      actions='<button class="btn '+fc+' btn-sm" id="followBtn">'+ft+'</button>';
    }

    
    document.getElementById('profileHeader').innerHTML=
      '<div class="profile-top">'
        +'<div class="profile-avatar-section">'+av+'</div>'
        +'<div class="profile-actions">'+actions+'</div>'
      +'</div>'
      +'<div class="profile-info">'
        +'<div class="profile-name">'+profileUser.name+getBadgeLg(profileUser)+'</div>'
        +'<div class="profile-username">@'+profileUser.username+'</div>'
        +(profileUser.bio?'<div class="profile-bio">'+esc(profileUser.bio)+'</div>':'')
      +'</div>'
      +'<div class="profile-stats">'
        +'<div class="profile-stat"><strong>'+profileData.postsCount+'</strong> <span>постов</span></div>'
        +'<div class="profile-stat" onclick="showFollowers(\'followers\')"><strong>'+profileData.followersCount+'</strong> <span>подписчиков</span></div>'
        +'<div class="profile-stat" onclick="showFollowers(\'following\')"><strong>'+profileData.followingCount+'</strong> <span>подписок</span></div>'
      +'</div>';

    if(own){
      document.getElementById('editProfileBtn').addEventListener('click',openEditModal);
    }else{
      document.getElementById('followBtn').addEventListener('click',doFollow);
    }

    // Sidebar
    const sp=document.getElementById('sidebarProfile');
    if(sp){
      sp.innerHTML=renderAvatar(currentUser,'avatar')
        +'<div class="sidebar-profile-info">'
        +'<div class="sidebar-profile-name">'+currentUser.name+getBadge(currentUser)+'</div>'
        +'<div class="sidebar-profile-username">@'+currentUser.username+'</div>'
        +'</div>';
      sp.onclick=()=>goProfile(currentUser.username);
    }

    // Показать кнопку админки
    const adminBtn=document.getElementById('adminNavBtn');
    if(adminBtn){
      adminBtn.style.display=(currentUser.role==='admin'||currentUser.role==='creator')?'flex':'none';
    }

  }

  // ---- Назад ----
  document.getElementById('backBtn').addEventListener('click',()=>{
    if(document.referrer&&document.referrer.includes('/pages/')){
      history.back();
    }else{
      goTo('/pages/feed.html');
    }
  });

  // ---- Настройки ----
  function openSettings(){
    document.getElementById('settingsOverlay').classList.add('active');
    document.getElementById('themeToggle').checked=getTheme()==='dark';
  }

  document.getElementById('closeSettingsBtn').addEventListener('click',()=>{
    document.getElementById('settingsOverlay').classList.remove('active');
  });

  document.getElementById('settingsOverlay').addEventListener('click',e=>{
    if(e.target.id==='settingsOverlay')document.getElementById('settingsOverlay').classList.remove('active');
  });

  document.getElementById('themeToggle').addEventListener('change',e=>{
    const t=e.target.checked?'dark':'light';
    setTheme(t);
    apiRequest('/api/users/theme',{method:'PUT',body:JSON.stringify({theme:t})}).catch(()=>{});
    renderHeader();
    renderProfile();
  });

  document.getElementById('settingsLogoutBtn').addEventListener('click',()=>{
    removeToken();goTo('/pages/auth.html');
  });

  // ---- Follow ----
  async function doFollow(){
    try{
      const d=await apiRequest('/api/users/follow/'+profileUser._id,{method:'POST'});
      profileData.isFollowing=d.isFollowing;
      profileData.followersCount=d.followersCount;
      renderProfile();
      showToast(d.isFollowing?'Подписались':'Отписались','success');
    }catch(e){showToast(e.message,'error')}
  }

  // ---- Tabs ----
  document.querySelectorAll('.profile-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.profile-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      currentTab=tab.dataset.tab;
      page=1;hasMore=true;
      document.getElementById('profilePosts').innerHTML='';
      loadPosts();
    });
  });

  // ---- Posts ----
  async function loadPosts(){
    if(loading||!hasMore||!profileUser)return;
    loading=true;
    const ld=document.getElementById('profileLoader');
    if(ld)ld.style.display='flex';
    try{
      const mp=currentTab==='media'?'&media=true':'';
      const d=await apiRequest('/api/posts/user/'+profileUser._id+'?page='+page+'&limit=20'+mp);
      if(d.posts.length===0&&page===1){
        document.getElementById('profilePosts').innerHTML=
          '<div class="empty-state">'
          +(currentTab==='media'?ICONS.image:ICONS.grid)
          +'<h3>'+(currentTab==='media'?'Нет медиа':'Нет постов')+'</h3>'
          +'<p>'+(profileData.isOwn?'Создайте первый пост':'Пока пусто')+'</p>'
          +'</div>';
      }
      d.posts.forEach(p=>document.getElementById('profilePosts').insertAdjacentHTML('beforeend',renderPP(p)));
      hasMore=page<d.totalPages;page++;
    }catch(e){showToast(e.message,'error')}
    finally{loading=false;if(ld)ld.style.display='none'}
  }

  function renderPP(post){
    const a=post.author,liked=post.likes.includes(currentUser._id);
    const iv=post.media.filter(m=>m.type==='image'||m.type==='video');
    const au=post.media.filter(m=>m.type==='audio');

    let mh='';
    if(iv.length){
      let items='';
      iv.forEach(m=>{
        if(m.type==='image')items+='<div class="media-item" onclick="openImageViewer(\''+m.url+'\')"><img src="'+m.url+'" alt="" loading="lazy"></div>';
        else items+='<div class="media-item"><video src="'+m.url+'" controls preload="metadata"></video></div>';
      });
      const c=iv.length,g=c>=4?'grid-4':c===3?'grid-3':c===2?'grid-2':'grid-1';
      mh='<div class="post-media '+g+'">'+items+'</div>';
    }

    let ah=au.map((x,i)=>createAudioPlayer(x.url,post._id+'_'+i)).join('');

    return '<div class="post" id="post-'+post._id+'">'
      +'<div class="post-avatar" onclick="goProfile(\''+a.username+'\')">'+renderAvatar(a,'avatar')+'</div>'
      +'<div class="post-body">'
        +'<div class="post-header">'
          +'<span class="post-name" onclick="goProfile(\''+a.username+'\')">'+a.name+getBadge(a)+'</span>'
          +'<span class="post-username">@'+a.username+'</span>'
          +'<span class="post-dot">&middot;</span>'
          +'<span class="post-time">'+timeAgo(post.createdAt)+'</span>'
          +(a._id===currentUser._id
            ?'<div class="post-options">'
              +'<div class="post-options-btn" onclick="togglePostMenu(\''+post._id+'\')">'+ICONS.more+'</div>'
              +'<div class="post-menu" id="menu-'+post._id+'">'
                +'<div class="post-menu-item danger" onclick="deleteProfilePost(\''+post._id+'\')">'+ICONS.trash+' Удалить</div>'
              +'</div>'
            +'</div>'
            :'')
        +'</div>'
        +(post.text?'<div class="post-text">'+esc(post.text)+'</div>':'')
        +mh+ah
        +'<div class="post-actions">'
          +'<div class="post-action '+(liked?'liked':'')+'" onclick="likeProfilePost(\''+post._id+'\',this)">'+ICONS.heart+'<span>'+(post.likes.length||'')+'</span></div>'
          +'<div class="post-action" onclick="toggleProfileComments(\''+post._id+'\')">'+ICONS.comment+'<span>'+(post.comments.length||'')+'</span></div>'
        +'</div>'
        +'<div class="comments-section hidden" id="comments-'+post._id+'">'
          +post.comments.map(c=>{
            const ca=c.author||{};
            return '<div class="comment-item">'
              +'<div onclick="goProfile(\''+( ca.username||'')+'\')" style="cursor:pointer">'+renderAvatar(ca,'avatar-sm')+'</div>'
              +'<div class="comment-body">'
                +'<div><span class="font-semibold text-sm">'+(ca.name||'')+getBadge(ca)+'</span></div>'
                +'<div class="comment-text">'+esc(c.text)+'</div>'
                +'<div class="comment-time">'+timeAgo(c.createdAt)+'</div>'
              +'</div>'
            +'</div>';
          }).join('')
          +'<div class="comment-form">'
            +'<input type="text" placeholder="Комментарий..." onkeydown="if(event.key===\'Enter\')submitProfileComment(\''+post._id+'\',this)">'
            +'<button onclick="submitProfileComment(\''+post._id+'\',this.previousElementSibling)">Отправить</button>'
          +'</div>'
        +'</div>'
      +'</div>'
    +'</div>';
  }

  function esc(s){const d=document.createElement('div');d.textContent=s||'';return d.innerHTML}

  // ---- Actions ----
  window.likeProfilePost=async function(id,el){
    try{const d=await apiRequest('/api/posts/'+id+'/like',{method:'POST'});el.querySelector('span').textContent=d.likes||'';el.classList.toggle('liked',d.liked)}
    catch(e){showToast(e.message,'error')}
  };

  window.toggleProfileComments=function(id){
    const s=document.getElementById('comments-'+id);if(s)s.classList.toggle('hidden');
  };

  window.submitProfileComment=async function(id,input){
    const text=input.value.trim();if(!text)return;
    try{
      const d=await apiRequest('/api/posts/'+id+'/comment',{method:'POST',body:JSON.stringify({text})});
      input.value='';
      const section=document.getElementById('comments-'+id);
      const ca=d.comment.author||{};
      section.querySelector('.comment-form').insertAdjacentHTML('beforebegin',
        '<div class="comment-item">'
        +'<div onclick="goProfile(\''+(ca.username||'')+'\')" style="cursor:pointer">'+renderAvatar(ca,'avatar-sm')+'</div>'
        +'<div class="comment-body">'
          +'<div><span class="font-semibold text-sm">'+(ca.name||'')+getBadge(ca)+'</span></div>'
          +'<div class="comment-text">'+esc(d.comment.text)+'</div>'
          +'<div class="comment-time">сейчас</div>'
        +'</div></div>'
      );
    }catch(e){showToast(e.message,'error')}
  };

  window.deleteProfilePost=async function(id){
    if(!confirm('Удалить?'))return;
    try{await apiRequest('/api/posts/'+id,{method:'DELETE'});const el=document.getElementById('post-'+id);if(el)el.remove();showToast('Удалён','success')}
    catch(e){showToast(e.message,'error')}
  };

  window.togglePostMenu=function(id){
    document.querySelectorAll('.post-menu.show').forEach(m=>{if(m.id!=='menu-'+id)m.classList.remove('show')});
    document.getElementById('menu-'+id).classList.toggle('show');
  };

  document.addEventListener('click',e=>{
    if(!e.target.closest('.post-options'))document.querySelectorAll('.post-menu.show').forEach(m=>m.classList.remove('show'));
  });

  // ---- Followers modal ----
  window.showFollowers=function(type){
    const list=type==='followers'?profileUser.followers:profileUser.following;
    const title=type==='followers'?'Подписчики':'Подписки';
    document.getElementById('followersModalTitle').textContent=title;
    const c=document.getElementById('followersList');
    if(!list||!list.length){
      c.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-tertiary)">Пусто</div>';
    }else{
      c.innerHTML=list.map(u=>
        '<div class="follower-item">'
        +'<div onclick="goProfile(\''+u.username+'\')" style="cursor:pointer">'+renderAvatar(u,'avatar')+'</div>'
        +'<div class="follower-info" onclick="goProfile(\''+u.username+'\')">'
          +'<div class="follower-name">'+u.name+getBadge(u)+'</div>'
          +'<div class="follower-username">@'+u.username+'</div>'
        +'</div></div>'
      ).join('');
    }
    document.getElementById('followersModal').classList.add('active');
  };

  document.getElementById('closeFollowersModal').addEventListener('click',()=>document.getElementById('followersModal').classList.remove('active'));
  document.getElementById('followersModal').addEventListener('click',e=>{if(e.target.classList.contains('modal-overlay'))document.getElementById('followersModal').classList.remove('active')});

  // ---- Edit modal ----
  function openEditModal(){
    document.getElementById('editName').value=currentUser.name||'';
    document.getElementById('editBio').value=currentUser.bio||'';
    document.getElementById('editAvatarPreview').innerHTML=renderAvatar(currentUser,'avatar-xl');
    document.getElementById('editAvatarUrl').value='';
    document.getElementById('editModal').classList.add('active');
  }

  document.getElementById('closeEditModal').addEventListener('click',()=>document.getElementById('editModal').classList.remove('active'));
  document.getElementById('editModal').addEventListener('click',e=>{if(e.target.classList.contains('modal-overlay'))document.getElementById('editModal').classList.remove('active')});

  document.getElementById('editAvatarBtn').addEventListener('click',()=>document.getElementById('editAvatarInput').click());

  document.getElementById('editAvatarInput').addEventListener('change',async e=>{
    const f=e.target.files[0];if(!f)return;
    try{
      showToast('Загрузка...','info');
      const d=await apiUpload(f);
      document.getElementById('editAvatarPreview').innerHTML='<img class="avatar avatar-xl" src="'+d.url+'" alt="">';
      document.getElementById('editAvatarUrl').value=d.url;
      showToast('Загружено','success');
    }catch(e){showToast(e.message,'error')}
  });

  document.getElementById('saveProfileBtn').addEventListener('click',async()=>{
    const btn=document.getElementById('saveProfileBtn');
    btn.classList.add('btn-loading');btn.disabled=true;
    try{
      const body={name:document.getElementById('editName').value.trim(),bio:document.getElementById('editBio').value.trim()};
      const av=document.getElementById('editAvatarUrl').value;
      if(av)body.avatar=av;
      const d=await apiRequest('/api/users/profile',{method:'PUT',body:JSON.stringify(body)});
      currentUser=d.user;setUser(currentUser);
      document.getElementById('editModal').classList.remove('active');
      showToast('Обновлено','success');
      await loadProfile(currentUser.username);
    }catch(e){showToast(e.message,'error')}
    finally{btn.classList.remove('btn-loading');btn.disabled=false}
  });

  // ---- Nav ----
  document.querySelectorAll('[data-nav]').forEach(el=>{
    el.addEventListener('click',()=>{
      const n=el.dataset.nav;
      if(n==='feed')goTo('/pages/feed.html');
      else if(n==='explore')goTo('/pages/feed.html');
      else if(n==='profile')goProfile(currentUser.username);
    });
  });

  document.getElementById('logoutBtn').addEventListener('click',()=>{removeToken();goTo('/pages/auth.html')});

  window.addEventListener('scroll',()=>{
    if(window.innerHeight+window.scrollY>=document.body.offsetHeight-500)loadPosts();
  });

  init();
});

