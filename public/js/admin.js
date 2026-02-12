document.addEventListener('DOMContentLoaded',()=>{
  const token=getToken();
  if(!token){goTo('/pages/auth.html');return}

  let currentUser=null;
  let currentSection='dashboard';
  let foundUser=null;

  async function init(){
    try{
      const d=await apiRequest('/api/auth/me');
      currentUser=d.user;
      if(currentUser.role!=='admin'&&currentUser.role!=='creator'){
        showToast('Нет доступа','error');
        goTo('/pages/feed.html');
        return;
      }
      setUser(currentUser);
      if(currentUser.theme)setTheme(currentUser.theme);
      document.getElementById('adminUsername').textContent='@'+currentUser.username;
      document.getElementById('adminRole').textContent=currentUser.role==='creator'?'Создатель':'Админ';
      loadStats();
    }catch{
      removeToken();goTo('/pages/auth.html');
    }
  }

  // Навигация
  document.querySelectorAll('.admin-nav-item').forEach(item=>{
    item.addEventListener('click',()=>{
      document.querySelectorAll('.admin-nav-item').forEach(i=>i.classList.remove('active'));
      item.classList.add('active');
      currentSection=item.dataset.section;
      document.querySelectorAll('.admin-section').forEach(s=>s.classList.remove('active'));
      document.getElementById('section-'+currentSection).classList.add('active');
      document.getElementById('sectionTitle').textContent=item.querySelector('.nav-label').textContent;
    });
  });

  // Статистика
  async function loadStats(){
    try{
      const d=await apiRequest('/api/admin/stats');
      document.getElementById('statUsers').textContent=d.totalUsers;
      document.getElementById('statPosts').textContent=d.totalPosts;
      document.getElementById('statBanned').textContent=d.bannedUsers;
      document.getElementById('statVerified').textContent=d.verifiedUsers;
      document.getElementById('statAdmins').textContent=d.admins;
      document.getElementById('statNewUsers').textContent=d.newUsersToday;
      document.getElementById('statNewPosts').textContent=d.newPostsToday;
    }catch(e){showToast(e.message,'error')}
  }

  // Поиск юзера
  document.getElementById('searchUserBtn').addEventListener('click',searchUser);
  document.getElementById('searchUserInput').addEventListener('keydown',e=>{if(e.key==='Enter')searchUser()});

  async function searchUser(){
    const username=document.getElementById('searchUserInput').value.trim().toLowerCase().replace('@','');
    if(!username)return showToast('Введите username','error');

    try{
      const d=await apiRequest('/api/admin/user/'+username);
      foundUser=d;
      renderUserCard(d);
    }catch(e){
      showToast(e.message,'error');
      document.getElementById('userCard').classList.remove('show');
    }
  }

  function renderUserCard(d){
    const u=d.user;
    const card=document.getElementById('userCard');

    document.getElementById('ucAvatar').innerHTML=renderAvatar(u,'avatar-lg');
    document.getElementById('ucName').innerHTML=u.name+getBadge(u);
    document.getElementById('ucUsername').textContent='@'+u.username;
    document.getElementById('ucEmail').textContent=u.email||'нет';
    document.getElementById('ucCreated').textContent=new Date(u.createdAt).toLocaleDateString('ru');
    document.getElementById('ucPosts').textContent=d.postsCount;
    document.getElementById('ucFollowers').textContent=d.followersCount;
    document.getElementById('ucFollowing').textContent=d.followingCount;

    // Badges
    let badges='';
    if(u.role==='creator')badges+='<span class="badge badge-creator">Создатель</span>';
    else if(u.role==='admin')badges+='<span class="badge badge-admin">Админ</span>';
    if(u.banned)badges+='<span class="badge badge-banned">Забанен</span>';
    if(u.verifiedBadge)badges+='<span class="badge badge-verified">Верифицирован</span>';
    document.getElementById('ucBadges').innerHTML=badges;

    // Ban info
    const banInfo=document.getElementById('banInfo');
    if(u.banned){
      banInfo.style.display='block';
      banInfo.innerHTML='<div class="info-block-title">Информация о бане</div>'
        +'<div class="info-row"><span class="info-row-label">Причина</span><span class="info-row-value">'+(u.banReason||'-')+'</span></div>'
        +'<div class="info-row"><span class="info-row-label">Забанил</span><span class="info-row-value">'+(u.bannedBy||'-')+'</span></div>'
        +'<div class="info-row"><span class="info-row-label">Дата</span><span class="info-row-value">'+(u.bannedAt?new Date(u.bannedAt).toLocaleString('ru'):'-')+'</span></div>';
    }else{
      banInfo.style.display='none';
    }

    // Actions
    let actions='';
    const isCreator=currentUser.role==='creator';
    const isSelf=u._id===currentUser._id;
    const isTargetCreator=u.role==='creator';

    if(!isSelf&&!isTargetCreator){
      // Бан/разбан
      if(u.banned){
        actions+='<button class="btn btn-sm btn-secondary" onclick="unbanUser()">Разбанить</button>';
      }else{
        actions+='<button class="btn btn-sm btn-danger" onclick="showBanInput()">Забанить</button>';
      }

      // Галочка
      actions+=u.verifiedBadge
        ?'<button class="btn btn-sm btn-secondary" onclick="toggleVerify()">Снять галочку</button>'
        :'<button class="btn btn-sm btn-primary" onclick="toggleVerify()">Выдать галочку</button>';

      // Админка (только создатель)
      if(isCreator){
        actions+=u.role==='admin'
          ?'<button class="btn btn-sm btn-secondary" onclick="toggleAdmin()">Снять админку</button>'
          :'<button class="btn btn-sm btn-outline" onclick="toggleAdmin()">Выдать админку</button>';
      }

      // Удалить
      actions+='<button class="btn btn-sm btn-danger" onclick="deleteUser()" style="margin-left:auto">Удалить аккаунт</button>';
    }

    document.getElementById('ucActions').innerHTML=actions;
    card.classList.add('show');
    document.getElementById('banReasonBlock').classList.remove('show');
  }

  // Действия
  window.showBanInput=function(){
    document.getElementById('banReasonBlock').classList.add('show');
    document.getElementById('banReasonInput').focus();
  };

  window.banUser=async function(){
    const reason=document.getElementById('banReasonInput').value.trim()||'Нарушение правил';
    try{
      await apiRequest('/api/admin/ban/'+foundUser.user._id,{method:'POST',body:JSON.stringify({reason})});
      showToast('Забанен','success');
      searchUser();
    }catch(e){showToast(e.message,'error')}
  };

  window.unbanUser=async function(){
    try{
      await apiRequest('/api/admin/unban/'+foundUser.user._id,{method:'POST'});
      showToast('Разбанен','success');
      searchUser();
    }catch(e){showToast(e.message,'error')}
  };

  window.toggleVerify=async function(){
    try{
      const d=await apiRequest('/api/admin/verify/'+foundUser.user._id,{method:'POST'});
      showToast(d.message,'success');
      searchUser();
    }catch(e){showToast(e.message,'error')}
  };

  window.toggleAdmin=async function(){
    try{
      const d=await apiRequest('/api/admin/set-admin/'+foundUser.user._id,{method:'POST'});
      showToast(d.message,'success');
      searchUser();
    }catch(e){showToast(e.message,'error')}
  };

  window.deleteUser=async function(){
    if(!confirm('Удалить аккаунт @'+foundUser.user.username+'? Это необратимо!'))return;
    try{
      await apiRequest('/api/admin/user/'+foundUser.user._id,{method:'DELETE'});
      showToast('Аккаунт удалён','success');
      document.getElementById('userCard').classList.remove('show');
    }catch(e){showToast(e.message,'error')}
  };

  // Back
  document.getElementById('backToFeed').addEventListener('click',()=>goTo('/pages/feed.html'));

  init();
});