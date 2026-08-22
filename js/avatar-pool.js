/* ViCamBachGiai — stable illustrated avatar pool. Demo-style chibi artwork, no layout changes. */
(function(){
  const A=[
    ['duck','#FFD95F','#E7A538','duck'],['polar','#FFF7EE','#D9C9BC','polar'],['bear','#B97B55','#704B38','bear'],['penguin','#202737','#F7F1E8','penguin'],
    ['cat','#AAB5C7','#5A6476','cat'],['fox','#F28B3D','#A34E22','fox'],['rabbit','#FFF5F0','#E7C1D0','rabbit'],['capy','#B98560','#6F4C38','capy'],
    ['dino','#7BC596','#43785B','dino'],['panda','#FFF5EB','#202630','panda'],['chick','#FFE06B','#E8AA2B','chick'],['hedgehog','#D1A06E','#7B563B','hedgehog'],
    ['otter','#C79B74','#785640','otter'],['corgi','#F0A04A','#9E572B','corgi'],['frog','#85C38B','#4E7D53','frog'],['koala','#B6C0CE','#69737F','koala']
  ];
  function hash(s){let h=2166136261;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function keyOf(u){return (u&&(u.user_id||u.id||u.email||u.display_name))||'guest'}
  function svg(spec){
    const [n,c1,c2,t]=spec;
    const bg='<defs><radialGradient id="b" cx="35%" cy="25%" r="80%"><stop stop-color="#303654"/><stop offset="1" stop-color="#111626"/></radialGradient><filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#000" flood-opacity=".28"/></filter></defs><circle cx="50" cy="50" r="49" fill="url(#b)"/><circle cx="50" cy="50" r="46.5" fill="none" stroke="#9B7BFF" stroke-opacity=".55" stroke-width="1.5"/>';
    const blush='<ellipse cx="31" cy="61" rx="7" ry="4" fill="#F3A6A6" opacity=".34"/><ellipse cx="69" cy="61" rx="7" ry="4" fill="#F3A6A6" opacity=".34"/>';
    const eyes='<circle cx="39" cy="50" r="3.5" fill="#20201F"/><circle cx="61" cy="50" r="3.5" fill="#20201F"/><circle cx="38" cy="49" r="1" fill="#fff" opacity=".9"/><circle cx="60" cy="49" r="1" fill="#fff" opacity=".9"/>';
    let body='',face='',extra='';
    if(t==='duck'||t==='chick'){
      body='<ellipse cx="50" cy="70" rx="24" ry="20" fill="'+c1+'" filter="url(#s)"/><path d="M31 70q-10 5-8 12 9 1 14-5M69 70q10 5 8 12-9 1-14-5" fill="'+c1+'"/>';
      face='<circle cx="50" cy="47" r="27" fill="'+c1+'" filter="url(#s)"/>'+eyes+blush+'<ellipse cx="50" cy="61" rx="12" ry="6.5" fill="'+c2+'"/><path d="M43 61h14" stroke="#B76D24" stroke-width="1.3" stroke-linecap="round"/>';
      if(t==='chick')extra='<path d="M43 19q7-8 14 0-7-2-14 0" fill="'+c2+'"/>';
    }else if(t==='penguin'){
      body='<ellipse cx="50" cy="70" rx="23" ry="21" fill="#242B39" filter="url(#s)"/>';
      face='<ellipse cx="50" cy="49" rx="28" ry="30" fill="#242B39" filter="url(#s)"/><ellipse cx="50" cy="52" rx="21" ry="23" fill="'+c2+'"/>'+eyes+'<path d="M44 59h12l-6 6z" fill="#F0A23D"/>'+blush;
      extra='<path d="M32 68q-10 6-8 13 8 0 13-6M68 68q10 6 8 13-8 0-13-6" fill="#242B39"/>';
    }else if(t==='rabbit'){
      extra='<ellipse cx="36" cy="19" rx="8.5" ry="19" fill="'+c1+'" filter="url(#s)"/><ellipse cx="64" cy="19" rx="8.5" ry="19" fill="'+c1+'" filter="url(#s)"/><ellipse cx="36" cy="20" rx="3.2" ry="13" fill="'+c2+'"/><ellipse cx="64" cy="20" rx="3.2" ry="13" fill="'+c2+'"/>';
      body='<ellipse cx="50" cy="72" rx="23" ry="18" fill="'+c1+'" filter="url(#s)"/>';
      face='<circle cx="50" cy="50" r="27" fill="'+c1+'" filter="url(#s)"/>'+eyes+blush+'<ellipse cx="50" cy="60" rx="3.8" ry="3" fill="#D998AA"/><path d="M46 65q4 4 8 0" fill="none" stroke="#70534C" stroke-width="2" stroke-linecap="round"/>';
    }else if(t==='cat'||t==='fox'||t==='corgi'){
      extra='<path d="M25 35L30 13l17 18M75 35L70 13 53 31" fill="'+c2+'" filter="url(#s)"/>';
      body='<ellipse cx="50" cy="72" rx="24" ry="18" fill="'+c1+'" filter="url(#s)"/>';
      face='<circle cx="50" cy="50" r="28" fill="'+c1+'" filter="url(#s)"/>'+eyes+blush+'<path d="M47 59h6l-3 3.5z" fill="#705047"/><path d="M45 65q5 4 10 0" fill="none" stroke="#604941" stroke-width="2" stroke-linecap="round"/>';
      if(t==='fox')face+='<path d="M27 47q8 2 12-5M73 47q-8 2-12-5" stroke="#FFF2DD" stroke-width="4" stroke-linecap="round"/>';
      if(t==='corgi')face+='<ellipse cx="50" cy="63" rx="14" ry="10" fill="#FFF1DD" opacity=".9"/>';
    }else if(t==='frog'){
      extra='<circle cx="34" cy="30" r="11" fill="'+c1+'"/><circle cx="66" cy="30" r="11" fill="'+c1+'"/><circle cx="34" cy="30" r="4" fill="#1F261F"/><circle cx="66" cy="30" r="4" fill="#1F261F"/>';
      body='<ellipse cx="50" cy="72" rx="24" ry="18" fill="'+c1+'" filter="url(#s)"/>';
      face='<circle cx="50" cy="52" r="27" fill="'+c1+'" filter="url(#s)"/><ellipse cx="31" cy="61" rx="7" ry="4" fill="#F1A4A4" opacity=".28"/><ellipse cx="69" cy="61" rx="7" ry="4" fill="#F1A4A4" opacity=".28"/><path d="M41 63q9 8 18 0" fill="none" stroke="#385B3D" stroke-width="2.3" stroke-linecap="round"/>';
    }else if(t==='hedgehog'){
      extra='<path d="M18 55Q15 27 50 16q35 11 32 39l-11-9-5-12-10 8-7-14-9 13-9-8-4 13z" fill="'+c2+'" filter="url(#s)"/>';
      body='<ellipse cx="50" cy="72" rx="23" ry="18" fill="'+c1+'" filter="url(#s)"/>';
      face='<circle cx="50" cy="52" r="25" fill="'+c1+'"/>'+eyes+blush+'<ellipse cx="50" cy="62" rx="4" ry="3" fill="#5C4436"/><path d="M45 67q5 4 10 0" fill="none" stroke="#5C4436" stroke-width="2"/>';
    }else if(t==='panda'){
      extra='<circle cx="29" cy="29" r="10" fill="#222832"/><circle cx="71" cy="29" r="10" fill="#222832"/>';
      body='<ellipse cx="50" cy="72" rx="24" ry="18" fill="#F8F0E8" filter="url(#s)"/>';
      face='<circle cx="50" cy="50" r="28" fill="#FFF7EF" filter="url(#s)"/><ellipse cx="38" cy="49" rx="8" ry="11" fill="#222832" transform="rotate(18 38 49)"/><ellipse cx="62" cy="49" rx="8" ry="11" fill="#222832" transform="rotate(-18 62 49)"/><circle cx="39" cy="49" r="3" fill="#fff"/><circle cx="61" cy="49" r="3" fill="#fff"/><ellipse cx="50" cy="61" rx="4" ry="3" fill="#282828"/><path d="M45 67q5 4 10 0" fill="none" stroke="#333" stroke-width="2"/>';
    }else if(t==='dino'){
      extra='<path d="M28 33l-8-7 13 1 1-11 8 10 8-11 7 11 13-2-8 9" fill="'+c2+'" opacity=".9"/>';
      body='<ellipse cx="50" cy="72" rx="24" ry="18" fill="'+c1+'" filter="url(#s)"/>';
      face='<circle cx="50" cy="51" r="27" fill="'+c1+'" filter="url(#s)"/>'+eyes+blush+'<ellipse cx="50" cy="62" rx="13" ry="8" fill="#A8D9B5" opacity=".75"/><path d="M45 65q5 4 10 0" fill="none" stroke="#42644A" stroke-width="2"/>';
    }else{
      if(t==='polar'||t==='bear'||t==='koala')extra='<circle cx="29" cy="29" r="11" fill="'+c2+'" filter="url(#s)"/><circle cx="71" cy="29" r="11" fill="'+c2+'" filter="url(#s)"/>';
      if(t==='capy')extra='<ellipse cx="29" cy="30" rx="8" ry="10" fill="'+c2+'"/><ellipse cx="71" cy="30" rx="8" ry="10" fill="'+c2+'"/>';
      if(t==='otter')extra='<circle cx="29" cy="31" r="9" fill="'+c2+'"/><circle cx="71" cy="31" r="9" fill="'+c2+'"/>';
      body='<ellipse cx="50" cy="72" rx="24" ry="18" fill="'+c1+'" filter="url(#s)"/>';
      face='<circle cx="50" cy="50" r="28" fill="'+c1+'" filter="url(#s)"/>'+eyes+blush+'<ellipse cx="50" cy="62" rx="14" ry="10" fill="#FFF" opacity=".34"/><ellipse cx="50" cy="59" rx="4" ry="3" fill="#5E463A"/><path d="M45 67q5 4 10 0" fill="none" stroke="#5E463A" stroke-width="2" stroke-linecap="round"/>';
      if(t==='koala')face+='<ellipse cx="50" cy="59" rx="5" ry="7" fill="#4C535C"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'+bg+extra+body+face+'<ellipse cx="40" cy="87" rx="7" ry="4" fill="'+c2+'" opacity=".45"/><ellipse cx="60" cy="87" rx="7" ry="4" fill="'+c2+'" opacity=".45"/></svg>';
  }
  function dataFor(u){const i=hash(keyOf(u))%A.length;return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg(A[i]))}
  function realAvatar(u){const a=u&&u.avatar?String(u.avatar):'';return /^(https?:|data:image\/|covers\/|brand\/)/i.test(a)?a:''}
  function srcFor(u){return realAvatar(u)||dataFor(u)}
  function decorate(el,u,admin){if(!el)return;const src=srcFor(u||{});el.classList.add('vc-pool-avatar');if(admin)el.classList.add('vc-admin-avatar');if(el.tagName==='IMG'){el.src=src;return}let img=el.querySelector(':scope > img.vc-avatar-img');if(!img){el.textContent='';img=document.createElement('img');img.className='vc-avatar-img';img.alt='';el.appendChild(img)}img.src=src;}
  function feedMap(){const m={comments:{},replies:{}};try{const f=VCBG.communityFeed({sort:'latest',storyId:''})||[];f.forEach(c=>{m.comments[String(c.id)]=c.user||{};(c.replies||[]).forEach(r=>m.replies[String(r.id)]=r.user||{})})}catch(_){}return m}
  function drawerMap(){const m={};try{const raw=(location.hash||'').replace(/^#/,'');const mt=raw.match(/^\/truyen\/([^/?]+)\/chuong-(\d+)/);if(!mt)return m;const s=VCBG.getStoryBySlug(mt[1]);if(!s)return m;const ch=VCBG.getChapter(s.id,Number(mt[2]));if(!ch)return m;(VCBG.listComments(ch.id)||[]).forEach(c=>m[String(c.id)]=c.user||{})}catch(_){}return m}
  let busy=false;
  function sync(){if(busy)return;busy=true;requestAnimationFrame(()=>{busy=false;if(!window.VCBG)return;const me=VCBG.currentUser&&VCBG.currentUser();document.querySelectorAll('.avatar-chip').forEach(el=>decorate(el,me&&me.profile,me&&me.role==='admin'));const fm=feedMap();document.querySelectorAll('.sig-card[data-cid]').forEach(card=>decorate(card.querySelector(':scope > .sig-ava'),fm.comments[card.dataset.cid],card.querySelector('.sig-badge.staff')));document.querySelectorAll('.sig-reply[data-rid]').forEach(card=>decorate(card.querySelector('.sig-ava'),fm.replies[card.dataset.rid],card.querySelector('.sig-badge.staff')));document.querySelectorAll('.sig-compose .sig-ava').forEach(el=>decorate(el,me&&me.profile,me&&me.role==='admin'));const dm=drawerMap();document.querySelectorAll('.vc-comment[data-comment-id]').forEach(card=>decorate(card.querySelector(':scope > .vc-avatar'),dm[card.dataset.commentId]));document.querySelectorAll('.vc-reply .vc-avatar').forEach((el,i)=>{if(!el.querySelector('img'))decorate(el,{id:'reply-'+i})});document.querySelectorAll('[data-avatar-user]').forEach(el=>decorate(el,{id:el.getAttribute('data-avatar-user')}));});}
  window.VICAM_AVATARS={srcFor,decorate,sync,pool:A.map(x=>x[0]),svg};
  new MutationObserver(sync).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('load',sync);window.addEventListener('hashchange',()=>setTimeout(sync,60));setTimeout(sync,80);
})();