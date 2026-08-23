/* ViCamBachGiai — account avatar picker using the approved raster demo pool. */
(function(){
  function isAccount(){return /^\/?tai-khoan(?:\?|$)/.test((location.hash||'').replace(/^#/,''));}
  function close(){document.querySelector('.vc-avatar-picker-backdrop')?.remove();}
  function openPicker(){
    if(!window.VCBG||!VCBG.currentUser()||!window.VICAM_AVATARS)return;
    close();
    const me=VCBG.currentUser();
    const isAdmin=me&&me.role==='admin';
    const adminIndex=Number.isInteger(VICAM_AVATARS.adminAvatarIndex)?VICAM_AVATARS.adminAvatarIndex:-1;
    const opts=(VICAM_AVATARS.options||[]).map((name,index)=>({name,index})).filter(item=>item.index!==adminIndex||isAdmin);
    const back=document.createElement('div');back.className='vc-avatar-picker-backdrop';
    back.innerHTML='<section class="vc-avatar-picker" role="dialog" aria-modal="true" aria-label="Đổi avatar"><header><div><h2>Đổi avatar</h2><p>Chọn một avatar từ kho ViCam</p></div><button type="button" class="vc-avatar-close" aria-label="Đóng">×</button></header><div class="vc-avatar-grid">'+opts.map(item=>'<button type="button" class="vc-avatar-option'+(item.index===adminIndex?' is-admin-only':'')+'" data-i="'+item.index+'" aria-label="'+item.name+'"><img src="'+VICAM_AVATARS.srcByIndex(item.index)+'" alt=""><span>'+item.name+'</span>'+(item.index===adminIndex?'<small>Chỉ quản trị</small>':'')+'</button>').join('')+'</div><footer><span>Avatar sẽ được đồng bộ ở mọi nơi.</span><button type="button" class="vc-avatar-save" disabled>Lưu avatar</button></footer></section>';
    document.body.appendChild(back);
    let chosen=-1;
    back.querySelector('.vc-avatar-close').onclick=close;back.onclick=e=>{if(e.target===back)close()};
    back.querySelectorAll('.vc-avatar-option').forEach(btn=>btn.onclick=()=>{back.querySelectorAll('.vc-avatar-option').forEach(x=>x.classList.remove('is-selected'));btn.classList.add('is-selected');chosen=Number(btn.dataset.i);back.querySelector('.vc-avatar-save').disabled=false});
    back.querySelector('.vc-avatar-save').onclick=()=>{if(chosen<0)return;if(chosen===adminIndex&&(!VCBG.currentUser()||VCBG.currentUser().role!=='admin')){alert('Avatar này chỉ dành cho quản trị viên.');return}try{VCBG.updateProfile({avatar:'vca:'+chosen});VICAM_AVATARS.sync();document.querySelectorAll('.vc-avatar-account-preview').forEach(preview=>preview.src=VICAM_AVATARS.srcByIndex(chosen));close();if(window.toast)toast('Đã đổi avatar.');}catch(e){alert(e&&e.message?e.message:'Không đổi được avatar.')}};
  }
  function inject(){
    if(!isAccount()||!window.VCBG||!VCBG.currentUser())return;
    if(document.querySelector('.vc-avatar-account'))return;
    const main=document.querySelector('#app main.wrap');if(!main)return;
    const u=VCBG.currentUser();const srcNow=(window.VICAM_AVATARS&&VICAM_AVATARS.indexFor&&VICAM_AVATARS.srcByIndex)?VICAM_AVATARS.srcByIndex(VICAM_AVATARS.indexFor(u.profile||{})):(window.VICAM_AVATARS&&VICAM_AVATARS.srcFor?VICAM_AVATARS.srcFor(u.profile):'');
    const card=document.createElement('section');card.className='vc-avatar-account';
    card.innerHTML='<img class="vc-avatar-account-preview" src="'+srcNow+'" alt="Avatar"><div class="vc-avatar-account-copy"><strong>Avatar</strong><span>Ảnh đại diện dùng cho tài khoản và bình luận</span></div><button type="button" class="vc-avatar-account-btn">Đổi avatar</button>';
    const firstP=main.querySelector(':scope > p');if(firstP)firstP.insertAdjacentElement('afterend',card);else main.prepend(card);
    card.querySelector('.vc-avatar-account-btn').onclick=openPicker;
  }
  new MutationObserver(()=>setTimeout(inject,0)).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(inject,50));window.addEventListener('load',()=>setTimeout(inject,80));setTimeout(inject,120);
})();
