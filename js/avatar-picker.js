/* ViCamBachGiai — account avatar picker. Demo-style chibi avatar chooser only. */
(function(){
  const POOL=[
    ['Vịt vàng','#FFD95F','#E7A538','duck'],['Gấu trắng','#FFF7EE','#D9C9BC','polar'],['Gấu nâu','#B97B55','#704B38','bear'],['Cánh cụt','#202737','#F7F1E8','penguin'],
    ['Mèo xám','#AAB5C7','#5A6476','cat'],['Cáo cam','#F28B3D','#A34E22','fox'],['Thỏ trắng','#FFF5F0','#E7C1D0','rabbit'],['Capybara','#B98560','#6F4C38','capy'],
    ['Khủng long','#7BC596','#43785B','dino'],['Gấu trúc','#FFF5EB','#202630','panda'],['Gà con','#FFE06B','#E8AA2B','chick'],['Nhím','#D1A06E','#7B563B','hedgehog'],
    ['Rái cá','#C79B74','#785640','otter'],['Corgi','#F0A04A','#9E572B','corgi'],['Ếch xanh','#85C38B','#4E7D53','frog'],['Koala','#B6C0CE','#69737F','koala']
  ];
  function localSvg(spec){
    if(window.VICAM_AVATARS&&VICAM_AVATARS.svg)return VICAM_AVATARS.svg(spec);
    const [n,c1,c2]=spec;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="49" fill="#171d31"/><circle cx="50" cy="50" r="46" fill="none" stroke="#9B7BFF" opacity=".55"/><circle cx="50" cy="51" r="29" fill="'+c1+'"/><circle cx="39" cy="50" r="3.5" fill="#222"/><circle cx="61" cy="50" r="3.5" fill="#222"/><ellipse cx="50" cy="63" rx="13" ry="9" fill="'+c2+'" opacity=".35"/></svg>';
  }
  const src=s=>'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(localSvg(s));
  function isAccount(){return /^\/?tai-khoan(?:\?|$)/.test((location.hash||'').replace(/^#/,''));}
  function close(){document.querySelector('.vc-avatar-picker-backdrop')?.remove();}
  function openPicker(){
    if(!window.VCBG||!VCBG.currentUser())return;
    close();
    const back=document.createElement('div');back.className='vc-avatar-picker-backdrop';
    back.innerHTML='<section class="vc-avatar-picker" role="dialog" aria-modal="true" aria-label="Đổi avatar"><header><div><h2>Đổi avatar</h2><p>Chọn một avatar từ kho ViCam</p></div><button type="button" class="vc-avatar-close" aria-label="Đóng">×</button></header><div class="vc-avatar-grid">'+POOL.map((s,i)=>'<button type="button" class="vc-avatar-option" data-i="'+i+'" aria-label="'+s[0]+'"><img src="'+src(s)+'" alt=""><span>'+s[0]+'</span></button>').join('')+'</div><footer><span>Avatar sẽ được đồng bộ ở mọi nơi.</span><button type="button" class="vc-avatar-save" disabled>Lưu avatar</button></footer></section>';
    document.body.appendChild(back);
    let chosen='';
    back.querySelector('.vc-avatar-close').onclick=close;back.onclick=e=>{if(e.target===back)close()};
    back.querySelectorAll('.vc-avatar-option').forEach(btn=>btn.onclick=()=>{back.querySelectorAll('.vc-avatar-option').forEach(x=>x.classList.remove('is-selected'));btn.classList.add('is-selected');chosen=src(POOL[Number(btn.dataset.i)]);back.querySelector('.vc-avatar-save').disabled=false});
    back.querySelector('.vc-avatar-save').onclick=()=>{if(!chosen)return;try{VCBG.updateProfile({avatar:chosen});if(window.VICAM_AVATARS)VICAM_AVATARS.sync();const preview=document.querySelector('.vc-avatar-account-preview');if(preview)preview.src=chosen;close();if(window.toast)toast('Đã đổi avatar.');}catch(e){alert(e&&e.message?e.message:'Không đổi được avatar.')}};
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