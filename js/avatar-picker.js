/* ViCamBachGiai — account avatar picker. Adds only the avatar chooser UI. */
(function(){
  const POOL=[
    ['Vịt vàng','#ffd75b','#e9a92c','duck'],['Gấu trắng','#f6f0e7','#d7cfc4','bear'],['Gấu nâu','#b98255','#6e4733','bear'],['Cánh cụt','#222936','#f2efe9','penguin'],
    ['Mèo xám','#aab3c5','#596276','cat'],['Cáo cam','#ef8b3d','#9b4d20','fox'],['Thỏ trắng','#f4eee9','#d7b6c8','rabbit'],['Capybara','#b98255','#73513a','capy'],
    ['Khủng long','#70b58c','#44785d','dino'],['Gấu trúc','#f4efe8','#20242d','panda'],['Gà con','#ffd66a','#e6a728','chick'],['Nhím','#c89b68','#7a5438','hedgehog'],
    ['Rái cá','#c49a72','#76563f','otter'],['Corgi','#e99a4a','#9b5a2b','corgi'],['Ếch xanh','#80b782','#49764d','frog'],['Koala','#aeb8c4','#66707c','koala']
  ];
  function svg(spec){const [name,c1,c2,t]=spec;let ears='';if(/bear|panda|koala/.test(t))ears='<circle cx="28" cy="28" r="10" fill="'+c2+'"/><circle cx="72" cy="28" r="10" fill="'+c2+'"/>';if(/cat|fox|corgi/.test(t))ears='<path d="M22 34L28 13l16 18M78 34L72 13 56 31" fill="'+c2+'"/>';if(t==='rabbit')ears='<ellipse cx="34" cy="18" rx="8" ry="18" fill="'+c1+'"/><ellipse cx="66" cy="18" rx="8" ry="18" fill="'+c1+'"/>';const face=t==='penguin'?'<ellipse cx="50" cy="54" rx="28" ry="34" fill="#252c39"/><ellipse cx="50" cy="60" rx="21" ry="25" fill="#f4efe9"/><path d="M45 57h10l-5 5z" fill="#f0a63d"/>':t==='duck'||t==='chick'?'<ellipse cx="50" cy="52" rx="30" ry="31" fill="'+c1+'"/><ellipse cx="50" cy="61" rx="13" ry="7" fill="#e9a33b"/>':'<circle cx="50" cy="52" r="31" fill="'+c1+'"/><ellipse cx="50" cy="63" rx="15" ry="11" fill="rgba(255,255,255,.35)"/>';const extras=t==='frog'?'<circle cx="34" cy="29" r="9" fill="'+c1+'"/><circle cx="66" cy="29" r="9" fill="'+c1+'"/>':t==='hedgehog'?'<path d="M18 52Q17 24 50 16q33 8 32 36-5-10-13-14-8-14-19-20-12 7-19 20-8 4-13 14z" fill="'+c2+'"/>':'';return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#262a45"/><stop offset="1" stop-color="#111628"/></linearGradient></defs><circle cx="50" cy="50" r="49" fill="url(#g)"/><circle cx="50" cy="50" r="46" fill="none" stroke="rgba(174,143,255,.45)"/>'+ears+extras+face+'<circle cx="39" cy="50" r="3.2" fill="#26231f"/><circle cx="61" cy="50" r="3.2" fill="#26231f"/><path d="M45 69q5 5 10 0" fill="none" stroke="#5d4435" stroke-width="2.2" stroke-linecap="round"/></svg>'}
  const src=s=>'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg(s));
  function isAccount(){return /^#?\/tai-khoan(?:\?|$)/.test(location.hash.replace(/^#/,''));}
  function close(){document.querySelector('.vc-avatar-picker-backdrop')?.remove();}
  function openPicker(){
    if(!window.VCBG||!VCBG.currentUser())return;
    close();
    const u=VCBG.currentUser();
    const current=(u.profile&&u.profile.avatar)||'';
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