/* ViCamBachGiai — account avatar picker using the approved demo-style pool. */
(function(){
  function isAccount(){return /^\/?tai-khoan(?:\?|$)/.test((location.hash||'').replace(/^#/,''));}
  function close(){document.querySelector('.vc-avatar-picker-backdrop')?.remove();}
  function openPicker(){
    if(!window.VCBG||!VCBG.currentUser()||!window.VICAM_AVATARS)return;
    close();
    const opts=VICAM_AVATARS.options||[];
    const back=document.createElement('div');back.className='vc-avatar-picker-backdrop';
    back.innerHTML='<section class="vc-avatar-picker" role="dialog" aria-modal="true" aria-label="Đổi avatar"><header><div><h2>Đổi avatar</h2><p>Chọn một avatar từ kho ViCam</p></div><button type="button" class="vc-avatar-close" aria-label="Đóng">×</button></header><div class="vc-avatar-grid">'+opts.map((s,i)=>'<button type="button" class="vc-avatar-option" data-i="'+i+'" aria-label="'+s[0]+'"><img src="'+VICAM_AVATARS.srcByIndex(i)+'" alt=""><span>'+s[0]+'</span></button>').join('')+'</div><footer><span>Avatar sẽ được đồng bộ ở mọi nơi.</span><button type="button" class="vc-avatar-save" disabled>Lưu avatar</button></footer></section>';
    document.body.appendChild(back);
    let chosen='';
    back.querySelector('.vc-avatar-close').onclick=close;back.onclick=e=>{if(e.target===back)close()};
    back.querySelectorAll('.vc-avatar-option').forEach(btn=>btn.onclick=()=>{back.querySelectorAll('.vc-avatar-option').forEach(x=>x.classList.remove('is-selected'));btn.classList.add('is-selected');chosen=VICAM_AVATARS.srcByIndex(Number(btn.dataset.i));back.querySelector('.vc-avatar-save').disabled=false});
    back.querySelector('.vc-avatar-save').onclick=()=>{if(!chosen)return;try{VCBG.updateProfile({avatar:chosen});VICAM_AVATARS.sync();const preview=document.querySelector('.vc-avatar-account-preview');if(preview)preview.src=chosen;close();if(window.toast)toast('Đã đổi avatar.');}catch(e){alert(e&&e.message?e.message:'Không đổi được avatar.')}};
  }
  function inject(){
    if(!isAccount()||!window.VCBG||!VCBG.currentUser())return;
    if(document.querySelector('.vc-avatar-account'))return;
    const main=document.querySelector('#app main.wrap');if(!main)return;
    const u=VCBG.currentUser();const srcNow=(window.VICAM_AVATARS&&VICAM_AVATARS.srcFor)?VICAM_AVATARS.srcFor(u.profile):'';
    const card=document.createElement('section');card.className='vc-avatar-account';
    card.innerHTML='<img class="vc-avatar-account-preview" src="'+srcNow+'" alt="Avatar"><div class="vc-avatar-account-copy"><strong>Avatar</strong><span>Ảnh đại diện dùng cho tài khoản và bình luận</span></div><button type="button" class="vc-avatar-account-btn">Đổi avatar</button>';
    const firstP=main.querySelector(':scope > p');if(firstP)firstP.insertAdjacentElement('afterend',card);else main.prepend(card);
    card.querySelector('.vc-avatar-account-btn').onclick=openPicker;
  }
  new MutationObserver(()=>setTimeout(inject,0)).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(inject,50));window.addEventListener('load',()=>setTimeout(inject,80));setTimeout(inject,120);
})();