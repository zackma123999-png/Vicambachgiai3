/* ViCamBachGiai — persistent notification center v2. */
(function(){
  let sb=null,busy=false,lastRoute='';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function client(){
    if(sb)return sb;
    const cfg=window.VCBG_CONFIG||{};
    if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseAnonKey)return null;
    sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return sb;
  }
  function bell(){
    if(!window.VCBG)return;
    const a=$('a[href="#/thong-bao"]');if(!a)return;
    const count=Number(VCBG.unreadCount?.()||0);
    a.classList.add('vc-notification-bell');
    a.setAttribute('aria-label',count?count+' thông báo chưa đọc':'Thông báo');
    a.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>'+(count?'<span class="vc-notification-badge">'+(count>99?'99+':count)+'</span>':'');
  }
  function adminNav(){
    const nav=$('.admin-nav');if(!nav||nav.querySelector('[href="#/admin/thong-bao"]'))return;
    const a=document.createElement('a');a.href='#/admin/thong-bao';a.textContent='Thông báo';
    const inbox=nav.querySelector('[href="#/admin/hop-thu"]');inbox?nav.insertBefore(a,inbox):nav.appendChild(a);
  }
  function adminPage(){
    if(!/^#\/admin\/thong-bao(?:\?|$)/.test(location.hash)||!window.VCBG?.isAdmin?.())return;
    const host=$('.admin-shell>div');if(!host||host.querySelector('#vcAdminNotif'))return;
    $$('.admin-nav a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#/admin/thong-bao'));
    const users=VCBG.adminUsers?.()||[], stories=VCBG.adminListStories?.()||[];
    host.innerHTML='<section class="vc-admin-notification" id="vcAdminNotif"><h2>Gửi thông báo</h2><p class="sub">Gửi đến toàn bộ thành viên, một thành viên hoặc độc giả theo dõi một truyện.</p><form><div class="field"><label>Người nhận</label><select name="audience"><option value="all">Tất cả thành viên</option><option value="user">Một thành viên</option><option value="story">Người theo dõi một truyện</option></select></div><div class="field vc-target-user" hidden><label>Thành viên</label><select name="user_id">'+users.map(u=>'<option value="'+esc(u.id)+'">'+esc(u.profile.display_name)+' · '+esc(u.email)+'</option>').join('')+'</select></div><div class="field vc-target-story" hidden><label>Truyện</label><select name="story_id">'+stories.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.title)+'</option>').join('')+'</select></div><div class="field"><label>Tiêu đề</label><input name="title" maxlength="100" required></div><div class="field"><label>Nội dung</label><textarea name="body" maxlength="500" required></textarea></div><div class="field"><label>Đường dẫn khi bấm (không bắt buộc)</label><input name="href" placeholder="#/truyen/..."></div><button class="btn btn-primary" type="submit">Gửi thông báo</button></form></section>';
    const form=$('form',host), audience=form.audience;
    const toggle=()=>{$('.vc-target-user',form).hidden=audience.value!=='user';$('.vc-target-story',form).hidden=audience.value!=='story'};audience.onchange=toggle;toggle();
    form.onsubmit=async e=>{e.preventDefault();const btn=$('button[type="submit"]',form);btn.disabled=true;try{const fd=new FormData(form),aud=fd.get('audience');let ids=[];if(aud==='user')ids=[fd.get('user_id')];else if(aud==='story'){const q=await client().from('follows').select('user_id').eq('story_id',fd.get('story_id'));if(q.error)throw q.error;ids=(q.data||[]).map(x=>x.user_id)}else ids=users.filter(u=>u.status==='active').map(u=>u.id);ids=[...new Set(ids.filter(Boolean))];if(!ids.length)throw new Error('Không có thành viên phù hợp.');const rows=ids.map(user_id=>({id:crypto.randomUUID(),user_id,title:String(fd.get('title')||'').trim(),body:String(fd.get('body')||'').trim(),href:String(fd.get('href')||'#/').trim()||'#/',read:false}));const out=await client().from('notifications').insert(rows);if(out.error)throw out.error;window.toast?.('Đã gửi đến '+rows.length+' thành viên.');form.reset();toggle()}catch(err){window.toast?.(err.message||'Không gửi được thông báo.')}finally{btn.disabled=false}};
  }
  function memberTools(){
    if(!/^#\/thong-bao(?:\?|$)/.test(location.hash)||!window.VCBG)return;
    const main=$('#app main.wrap');if(!main||main.dataset.vcNotifReady)return;main.dataset.vcNotifReady='1';main.classList.add('vc-notification-page');
    const list=VCBG.myNotifications?.()||[], cards=$$('.comment',main);
    cards.forEach((card,i)=>{const n=list[i];if(!n)return;card.classList.add('vc-notification-item');if(!n.read)card.classList.add('is-unread');const dot=document.createElement('span');dot.className='vc-notification-dot';card.prepend(dot);const del=document.createElement('button');del.type='button';del.className='vc-notification-delete';del.textContent='×';del.setAttribute('aria-label','Xóa thông báo');del.onclick=async e=>{e.preventDefault();e.stopPropagation();const out=await client().from('notifications').delete().eq('id',n.id);if(!out.error)card.remove()};card.appendChild(del)});
    if(list.length){const clear=document.createElement('button');clear.className='btn btn-ghost vc-clear-notifications';clear.textContent='Xóa tất cả';clear.onclick=async()=>{if(!confirm('Xóa toàn bộ thông báo?'))return;const u=VCBG.currentUser();const out=await client().from('notifications').delete().eq('user_id',u.id);if(!out.error){$$('.vc-notification-item',main).forEach(x=>x.remove());clear.remove()}};main.querySelector('h1')?.insertAdjacentElement('afterend',clear)}
  }
  function run(){if(busy)return;busy=true;requestAnimationFrame(()=>{busy=false;bell();adminNav();adminPage();memberTools();lastRoute=location.hash})}
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('hashchange',()=>setTimeout(run,40));window.addEventListener('load',run);setTimeout(run,80);setTimeout(run,500);
})();
