export function setupNavigation(products,services,onSearch){
 const header=document.querySelector('header');
 const actions=header.querySelector('.header-actions');
 actions.insertAdjacentHTML('beforebegin',`<form class="header-search" role="search"><div class="header-search-field"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="site-search" type="search" role="combobox" aria-label="Search products and services" aria-autocomplete="list" aria-expanded="false" aria-controls="site-suggestions" autocomplete="off" placeholder="Search products & services…"/><button type="submit" aria-label="Search catalogue">→</button></div><div class="suggestion-panel" hidden><p class="suggestion-label">POPULAR SEARCHES</p><div id="site-suggestions" role="listbox" aria-label="Search suggestions"></div><p class="search-help">↑ ↓ to explore · Enter to select</p></div><span class="sr-only search-status" role="status"></span></form>`);
 const form=header.querySelector('.header-search'),input=form.querySelector('input'),panel=form.querySelector('.suggestion-panel'),list=form.querySelector('[role=listbox]');
 const entries=[...products.map(p=>({name:p.name,type:'Product',id:p.id,search:`${p.name} ${p.category} ${p.desc} ${p.details.join(' ')}`,attr:'data-product'})),...services.map(s=>({name:s.title,type:'Service',id:s.id,search:`${s.title} ${s.copy} ${s.features.join(' ')}`,attr:'data-service'}))];
 const normalize=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'');
 let selected=-1;
 function close(){panel.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');selected=-1}
 function render(){
  const q=normalize(input.value.trim());
  const matches=(q?entries.filter(e=>normalize(e.search).includes(q)):[entries[0],entries[2],entries[1],entries[12],entries[14]]).slice(0,7);
  list.replaceChildren();selected=-1;input.removeAttribute('aria-activedescendant');
  form.querySelector('.suggestion-label').textContent=q?'SUGGESTED RESULTS':'POPULAR SEARCHES';
  for(const [i,e] of matches.entries()){
   const b=document.createElement('button');b.type='button';b.id=`search-option-${i}`;b.setAttribute('role','option');b.setAttribute('aria-selected','false');b.setAttribute(e.attr,e.id);b.tabIndex=-1;
   const name=document.createElement('span');name.textContent=e.name;const type=document.createElement('small');type.textContent=e.type;b.append(name,type);list.append(b);
  }
  if(!matches.length){const empty=document.createElement('p');empty.className='suggestion-empty';empty.textContent='No matches. Try “Wi-Fi”, “camera”, or “cabling”.';list.append(empty)}
  panel.hidden=false;input.setAttribute('aria-expanded','true');form.querySelector('.search-status').textContent=`${matches.length} suggestions available`;
 }
 input.addEventListener('input',render);input.addEventListener('focus',render);
 // Keep input focus until the click completes; WebKit otherwise closes the
 // popup on pointer-down before its non-tabbable suggestion can receive click.
 list.addEventListener('pointerdown',e=>{if(e.target.closest('[role=option]'))e.preventDefault()});
 input.addEventListener('keydown',e=>{
  const options=[...list.querySelectorAll('[role=option]')];
  if(e.key==='Escape'){e.preventDefault();close();return}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   e.preventDefault();if(panel.hidden)render();const opts=[...list.querySelectorAll('[role=option]')];if(!opts.length)return;
   selected=(selected+(e.key==='ArrowDown'?1:-1)+opts.length)%opts.length;
   opts.forEach((o,i)=>o.setAttribute('aria-selected',String(i===selected)));input.setAttribute('aria-activedescendant',opts[selected].id);opts[selected].scrollIntoView({block:'nearest'});
  }
  if(e.key==='Enter'&&!panel.hidden&&options.length){e.preventDefault();options[selected>=0?selected:0].click()}
 });
 form.addEventListener('submit',e=>{e.preventDefault();close();onSearch(input.value.trim());location.hash='shop'});
 document.addEventListener('click',e=>{if(!form.contains(e.target)||e.target.closest('[role=option]'))close()});
 form.addEventListener('focusout',()=>queueMicrotask(()=>{if(!form.contains(document.activeElement))close()}));
 const links=[...header.querySelectorAll('nav a')];
 const sections=links.map(a=>({link:a,node:a.hash?document.querySelector(a.hash):document.querySelector('.hero')}));
 function activate(link){links.forEach(a=>{const active=a===link;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')})}
 let frame,pending=null,pendingUntil=0;
 function update(){
  frame=null;const offset=header.getBoundingClientRect().height+40;
  if(pending&&Date.now()<pendingUntil&&Math.abs(pending.node.getBoundingClientRect().top-offset)>60)return;
  pending=null;let active=sections[0];for(const section of sections){if(section.node.getBoundingClientRect().top<=offset)active=section}
  if(innerHeight+scrollY>=document.documentElement.scrollHeight-3)active=sections.at(-1);
  activate(active.link);
 }
 function fromHash(){const match=sections.find(s=>(s.link.hash||'')===(location.hash==='#'?'':location.hash));if(match){activate(match.link);pending=match;pendingUntil=Date.now()+1200;setTimeout(update,1250)}}
 links.forEach(link=>link.addEventListener('click',()=>{activate(link);pending=sections.find(s=>s.link===link);pendingUntil=Date.now()+1200;setTimeout(update,1250)}));
 window.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(update)},{passive:true});
 window.addEventListener('hashchange',fromHash);
 new ResizeObserver(()=>{document.documentElement.style.setProperty('--site-header-height',`${header.getBoundingClientRect().height+22}px`);update()}).observe(header);
 update();fromHash();
}
