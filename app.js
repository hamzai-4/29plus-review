import {products, videos} from './catalog.mjs?v=october-feedback-v1';
import {cleanCart, totalCart, checkoutUrl, recommend} from './commerce.mjs?v=multi-focus-v2';

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const byHandle = new Map(products.map(p => [p.handle,p]));
const money = n => new Intl.NumberFormat('en-AE',{style:'currency',currency:'AED',maximumFractionDigits:n%100 ? 2 : 0}).format(n/100);
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Keep the existing key so saved bags survive the move to the main URL.
const key = '29plus-v2-bag';
let cart = [], storageAvailable = true, toastTimer;
try { cart = cleanCart(JSON.parse(localStorage.getItem(key)||'[]'),products); } catch { storageAvailable=false; }

function announce(message) {
  const toast=$('.toast'); toast.textContent=message;toast.hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},3200);
}
function saveCart() {
  cart=cleanCart(cart,products);
  try { localStorage.setItem(key,JSON.stringify(cart)); } catch { storageAvailable=false; }
  renderCart();
}
function openDialog(name) {
  const dialog=$(`#${name}-dialog`); if(!dialog || dialog.open)return;
  if(name==='bag')renderCart();
  if(name==='search')renderSearch();
  if(name==='finder')renderFinder();
  dialog.showModal();
  if(name==='search')$('#product-search').focus();
}
function addItem(handle,quantity=1) {
  const p=byHandle.get(handle);
  if(!p?.available)return;
  if(!Number.isInteger(quantity)||quantity<1||quantity>20){announce('Please choose a whole quantity from 1 to 20.');return;}
  const existing=cart.find(x=>x.handle===handle), old=existing?.quantity||0;
  if(old>=20){announce('You already have the maximum quantity of this item.');return;}
  if(existing)existing.quantity=Math.min(20,old+quantity);else cart.push({handle,quantity});
  saveCart(); announce(`${p.name} added to your bag${old+quantity>20?' (maximum 20)':''}.`);
}
function renderCart() {
  const count=cart.reduce((n,row)=>n+row.quantity,0);
  $$('[data-cart-count]').forEach(el=>el.textContent=count);
  $('.cart-items').innerHTML=cart.length ? cart.map(row=>{
    const p=byHandle.get(row.handle);
    return `<article class="cart-item"><a href="${p.url}"><img src="${p.image}" alt="${esc(p.name)}"></a><div><h3><a href="${p.url}">${esc(p.name)}</a></h3><span class="price">${money(p.price*row.quantity)}</span><div class="cart-item-actions"><div class="quantity" aria-label="Quantity for ${esc(p.name)}"><button data-quantity="${p.handle}" data-delta="-1" aria-label="Decrease ${esc(p.name)} quantity" ${row.quantity===1?'disabled':''}>−</button><span>${row.quantity}</span><button data-quantity="${p.handle}" data-delta="1" aria-label="Increase ${esc(p.name)} quantity" ${row.quantity===20?'disabled':''}>+</button></div><button class="remove-item" data-remove="${p.handle}" aria-label="Remove ${esc(p.name)}">Remove</button></div></div></article>`;
  }).join('') : '<div class="empty-cart"><p>Your daily ritual<br>starts with a little care.</p><a class="button" href="/29plus-review/shop/">Explore the collection ↗</a></div>';
  $('.cart-summary').hidden=!cart.length;
  $('[data-cart-total]').textContent=money(totalCart(cart,products));
  const checkout=$('[data-checkout]'), url=checkoutUrl(cart,products);
  if(url)checkout.href=url;else checkout.removeAttribute('href');
  $('[data-storage-note]').textContent=storageAvailable?'Your bag is saved on this device.':'Your browser cannot save the bag. It will remain available while this page is open.';
}
document.addEventListener('click',event=>{
  const opener=event.target.closest('[data-open]');if(opener){opener.focus();openDialog(opener.dataset.open);}
  const close=event.target.closest('[data-close]');if(close)close.closest('dialog').close();
  const add=event.target.closest('[data-add]');if(add){
    const input=add.closest('.buy-row')?.querySelector('input');
    if(input&&!input.reportValidity())return;
    addItem(add.dataset.add,input?Number(input.value):1);
  }
  const remove=event.target.closest('[data-remove]');if(remove){
    const handle=remove.dataset.remove;cart=cart.filter(x=>x.handle!==handle);saveCart();announce('Item removed from your bag.');
    $('.cart-item button')?.focus();
  }
  const quantity=event.target.closest('[data-quantity]');if(quantity){
    const handle=quantity.dataset.quantity,delta=Number(quantity.dataset.delta),row=cart.find(x=>x.handle===handle);
    if(row){row.quantity=Math.min(20,Math.max(1,row.quantity+delta));saveCart();
      const updated=$(`[data-quantity="${handle}"][data-delta="${delta}"]`);(updated?.disabled?updated.parentElement.querySelector('button:not(:disabled)'):updated)?.focus();}
  }
});
$$('dialog').forEach(d=>d.addEventListener('click',ev=>{if(d.id==='welcome-scratch-dialog'||ev.target!==d)return;const r=d.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)d.close();}));
window.addEventListener('storage',event=>{if(event.key===key){try{cart=cleanCart(JSON.parse(event.newValue||'[]'),products);renderCart();}catch{}}});
renderCart();

// Homepage-only welcome promotion. It closes after 10 seconds of inactivity;
// scratching or using the accessible reveal control keeps it open until dismissed.
const scratchDialog = $('#welcome-scratch-dialog');
if (scratchDialog) {
  const canvas = $('[data-scratch-canvas]', scratchDialog);
  const revealButton = $('[data-scratch-reveal]', scratchDialog);
  const claimButton = $('[data-scratch-claim]', scratchDialog);
  const status = $('[data-scratch-status]', scratchDialog);
  let idleTimer, interacting = false, revealed = false, drawing = false;

  function clearIdleTimer() { clearTimeout(idleTimer); }
  function markInteracting() {
    if (interacting) return;
    interacting = true;
    clearIdleTimer();
    status.textContent = 'Keep scratching to reveal your welcome offer.';
  }
  function drawCover() {
    if (revealed) return;
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * scale));
    canvas.height = Math.max(1, Math.round(rect.height * scale));
    const context = canvas.getContext('2d');
    context.setTransform(scale, 0, 0, scale, 0, 0);
    const cover = context.createLinearGradient(0, 0, rect.width, rect.height);
    cover.addColorStop(0, '#d8d5cf'); cover.addColorStop(.5, '#bdb9b1'); cover.addColorStop(1, '#e7e4df');
    context.fillStyle = cover; context.fillRect(0, 0, rect.width, rect.height);
    context.globalAlpha = .2; context.strokeStyle = '#ffffff'; context.lineWidth = 1;
    for (let i = -rect.height; i < rect.width; i += 16) { context.beginPath(); context.moveTo(i, 0); context.lineTo(i + rect.height, rect.height); context.stroke(); }
    context.globalAlpha = 1; context.fillStyle = '#353535'; context.textAlign = 'center'; context.font = '500 13px Inter, Arial, sans-serif';
    context.fillText('SCRATCH TO REVEAL', rect.width / 2, rect.height / 2);
  }
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return {x:event.clientX - rect.left, y:event.clientY - rect.top};
  }
  function scratch(event) {
    const context = canvas.getContext('2d');
    const {x, y} = point(event);
    context.save(); context.globalCompositeOperation = 'destination-out'; context.beginPath(); context.arc(x, y, 34, 0, Math.PI * 2); context.fill(); context.restore();
  }
  function reveal() {
    if (revealed) return;
    revealed = true; clearIdleTimer(); canvas.classList.add('is-revealed');
    revealButton.hidden = true; claimButton.hidden = false;
    status.textContent = 'Your offer is revealed. Claim your unique code by email.';
    claimButton.focus();
  }
  function scratchedEnough() {
    const context = canvas.getContext('2d');
    const {width, height} = canvas;
    const pixels = context.getImageData(0, 0, width, height).data;
    let clear = 0, total = 0;
    const step = Math.max(10, Math.round(Math.min(width, height) / 30));
    for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) { total++; if (pixels[(y * width + x) * 4 + 3] < 32) clear++; }
    // Preserve the gradual scratch-card effect. Only complete the reveal once
    // most of the cover has genuinely been removed.
    if (clear / total > .82) reveal();
  }
  function openWelcomeOffer() {
    if (scratchDialog.open) return;
    scratchDialog.showModal();
    requestAnimationFrame(() => {
      drawCover();
      idleTimer = setTimeout(() => { if (!interacting) scratchDialog.close(); }, 10000);
    });
  }
  canvas.addEventListener('pointerdown', event => { markInteracting(); drawing = true; canvas.setPointerCapture(event.pointerId); scratch(event); });
  canvas.addEventListener('pointermove', event => { if (!drawing || revealed) return; scratch(event); scratchedEnough(); });
  canvas.addEventListener('pointerup', () => { drawing = false; scratchedEnough(); });
  canvas.addEventListener('pointercancel', () => { drawing = false; });
  revealButton.addEventListener('click', () => { markInteracting(); reveal(); });
  claimButton.addEventListener('click', () => scratchDialog.close());
  scratchDialog.addEventListener('close', clearIdleTimer);
  window.addEventListener('resize', drawCover);
  window.setTimeout(openWelcomeOffer, 800);
}

function renderSearch() {
 const q=$('#product-search').value.trim().toLowerCase();
 const found=products.filter(p=>[p.name,p.skin,p.texture,p.group,...p.ingredients].join(' ').toLowerCase().includes(q));
 $('#search-count').textContent=`${found.length} ${found.length===1?'product':'products'}${q?' found':''}.`;
 $('#search-results').innerHTML=found.length?found.map(p=>`<a class="search-item" href="${p.url}"><img src="${p.image}" alt="" loading="lazy"><span>${esc(p.name)}<small>${esc(p.skin)}</small></span><span class="price">${money(p.price)}</span></a>`).join(''):'<p>No products found. Try “serum”, “cream”, “INNER” or “refill”.</p><a class="text-link" href="/29plus-review/contact/">Ask us for guidance ↗</a>';
}
$('#product-search').addEventListener('input',renderSearch);

$$('[data-shop]').forEach(shop=>{
 const buttons=$$('[data-filter]',shop);
 function filter(value){
  let count=0;
  $$('[data-product]',shop).forEach(card=>{const show=value==='All'||(value==='Essentials'?card.dataset.essential==='true':card.dataset.group===value);card.hidden=!show;if(show)count++;});
  buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===value)));
  $('.shop-count',shop).textContent=`${count} ${value==='Essentials'?'essentials':count===1?'product':'products'}`;
 }
 buttons.forEach(button=>button.addEventListener('click',()=>filter(button.dataset.filter)));
 const query=new URLSearchParams(location.search).get('category');
 filter(buttons.some(b=>b.dataset.filter===query)?query:shop.dataset.default);
});
$$('[role="tablist"]').forEach(list=>{
 const tabs=$$('[role="tab"]',list);
 function activate(tab){tabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!active;});}
 tabs.forEach((t,i)=>{t.addEventListener('click',()=>activate(t));t.addEventListener('keydown',ev=>{let n;if(ev.key==='ArrowRight')n=(i+1)%tabs.length;if(ev.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;if(ev.key==='Home')n=0;if(ev.key==='End')n=tabs.length-1;if(n!==undefined){ev.preventDefault();activate(tabs[n]);tabs[n].focus();}});});
});
$$('[data-image]').forEach(button=>button.addEventListener('click',()=>{$('#product-image').src=button.dataset.image;$('#product-image').alt=button.querySelector('img').alt;$$('[data-image]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));

const guide={
 rich:['The Rich ritual.','On cleansed skin, apply one pump of Eye Serum around the eye contours, followed by one pump of Rich Serum and then one pump of Rich Cream. Morning and evening. Use a separate sunscreen during the day.'],
 ultra:['The Ultra Rich ritual.','On cleansed skin, apply one pump of Eye Serum around the eye contours, followed by one pump of Ultra Rich Serum and then one pump of Ultra Rich Cream. Morning and evening. Use a separate sunscreen during the day.'],
 refill:['Refill your ritual.','Retain your original outer bottle, cap and pump. Replace the inner capsule with its matching refill. Follow the mechanism shown in the demonstration.'],
 inner:['Your daily INNER ritual.','Take one sachet daily. Follow the current directions on your pack for duration and breaks. For adults 18+. Do not exceed the recommended dose.'],
 tool:['A moment with Gua Sha.','Apply skincare first so the tool can glide. Use gentle, outward strokes without dragging the skin. Clean before and after use. Avoid irritated or broken skin.']
};
$$('[data-video]').forEach(button=>button.addEventListener('click',()=>{
 const id=button.dataset.video;$('#video-title').textContent=guide[id][0];$('#video-guide').textContent=guide[id][1];
 const player=$('#video-dialog video');player.src=videos[id];openDialog('video');player.play().catch(()=>{});
}));
$('#video-dialog').addEventListener('close',()=>{const v=$('#video-dialog video');v.pause();v.removeAttribute('src');v.load();});
$$('#brand-film, #refill-film').forEach(film=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let inView=false;
 film.muted=true;
 const syncPlayback=()=>{
  if(reduced.matches||document.hidden||!inView){film.pause();return;}
  film.play().catch(()=>{});
 };
 // Keep the hero quiet offscreen and resume naturally when it returns.
 new IntersectionObserver(entries=>{
  inView=entries[0].isIntersecting&&entries[0].intersectionRatio>=.05;
  syncPlayback();
 },{threshold:[0,.05]}).observe(film);
 film.addEventListener('play',()=>{if(reduced.matches||document.hidden||!inView)film.pause();});
 reduced.addEventListener('change',syncPlayback);
 document.addEventListener('visibilitychange',syncPlayback);
 window.addEventListener('pageshow',syncPlayback);
});

const questions=[
 {key:'skin',title:'How does your skin usually feel?',options:[['combo','Shiny or combination','My skin feels oily in some areas; I prefer lighter textures.'],['dry','Dry or in need of comfort','My skin often feels dry; I enjoy richer textures.'],['unsure','Balanced or hard to describe','I’d like a lighter-texture starting point to explore.']]},
 {key:'focus',multi:true,title:'What would you like to focus on?',options:[['hydration','Moisture and comfort','Care for a soft, comfortable feel.'],['texture','Smoother-looking skin','Texture and the appearance of fine lines.'],['eyes','A refreshed eye contour','The look of dark circles and puffiness.'],['all','All of the above','Bring these skin priorities together.']]},
 {key:'existing',title:'What is already working in your routine?',options:[['none','I’m exploring my options','Guide me by my skin priorities.'],['serum','I have a face serum I like','Help me find complementary care.'],['cream','I have a face cream I like','Help me choose the other steps.']]}

];
let step=0,answers={};
function renderFinder(){
 const host=$('#finder-content');
 if(step<questions.length){
  const q=questions[step];host.innerHTML=`<div class="finder-progress">STEP ${step+1} OF ${questions.length}</div><div class="finder-step"><h3 tabindex="-1">${q.title}</h3>${q.multi?'<p class="small">Choose one or more concerns, or select all of the above.</p>':''}<div class="finder-options" role="group" aria-label="${esc(q.title)}">${q.options.map(([value,title,desc])=>`<button class="finder-option" data-answer="${value}" aria-pressed="${q.multi?(answers[q.key]||[]).includes(value):answers[q.key]===value}"><strong>${title}</strong><span>${desc}</span></button>`).join('')}</div></div><div class="finder-controls"><button class="text-link" data-back ${step===0?'hidden':''}>← Back</button><button class="button" data-next ${(q.multi?answers[q.key]?.length:answers[q.key])?'':'disabled'}>${step===questions.length-1?'See my ritual':'Continue'} ↗</button></div>`;
  $$('[data-answer]',host).forEach(b=>b.addEventListener('click',()=>{if(q.multi){let values=answers[q.key]||[];const v=b.dataset.answer;values=v==='all'?(values.includes('all')?[]:['all']):values.includes(v)?values.filter(x=>x!==v):[...values.filter(x=>x!=='all'),v];answers[q.key]=values;$$('[data-answer]',host).forEach(x=>x.setAttribute('aria-pressed',String(values.includes(x.dataset.answer))));$('[data-next]',host).disabled=!values.length;}else{answers[q.key]=b.dataset.answer;$$('[data-answer]',host).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('[data-next]',host).disabled=false;}}));
  $('[data-next]',host).addEventListener('click',()=>{step++;renderFinder();$('#finder-content h3')?.focus();});
  $('[data-back]',host)?.addEventListener('click',()=>{step--;renderFinder();$('#finder-content h3')?.focus();});
 }else{
  const result=recommend(answers,products);
  host.innerHTML=`<div class="finder-result"><span class="eyebrow">A ritual, considered for you</span><h3 tabindex="-1">Your connection starts here.</h3><p>${esc(result.reason)}</p><div class="product-grid">${result.items.map(p=>`<article class="product-card"><a class="product-photo" href="${p.url}"><img src="${p.image}" alt="${esc(p.name)}"></a><div class="product-meta"><h4><a href="${p.url}">${esc(p.name)}</a></h4><span class="price">${money(p.price)}</span></div><p class="small">${esc(p.size)}</p></article>`).join('')}</div><p class="result-total">Your selected ritual <strong>${money(result.total)}</strong></p><div class="actions"><button class="button" data-add-routine ${result.items.length?'':'disabled'}>Add selected ritual to bag +</button><button class="text-link" data-restart>Start again</button></div><p class="small" style="margin-top:20px">This finder offers shopping guidance, not a skin diagnosis. <a href="/29plus-review/contact/">Our team can help you choose.</a></p></div>`;
  $('[data-add-routine]',host).addEventListener('click',()=>{result.items.forEach(p=>addItem(p.handle));$('#finder-dialog').close();openDialog('bag');});
  $('[data-restart]',host).addEventListener('click',()=>{step=0;answers={};renderFinder();$('#finder-content h3')?.focus();});
 }
}

// Size opening sections against the actual navigation and announcement height.
const measureOpening=()=>{
 const top=($('.header')?.getBoundingClientRect().height||0)+($('.announcement')?.getBoundingClientRect().height||0);
 document.documentElement.style.setProperty('--opening-space',`calc(100svh - ${top}px)`);
};
new ResizeObserver(measureOpening).observe($('.header'));
new ResizeObserver(measureOpening).observe($('.announcement'));
measureOpening();
