const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

const flash = $('#flash');
function screenFlash(){ flash.classList.remove('show'); void flash.offsetWidth; flash.classList.add('show'); }

window.addEventListener('load', () => {
  setTimeout(() => $('#preloader')?.classList.add('hide'), 1450);
});

// Theme switcher — now changes the whole page, not only accents
const savedTheme = localStorage.getItem('nafunny-theme') || 'electric';
document.body.dataset.theme = savedTheme;
$$('[data-theme-choice]').forEach(btn => {
  btn.classList.toggle('active', btn.dataset.themeChoice === savedTheme);
  btn.addEventListener('click', () => {
    const theme = btn.dataset.themeChoice;
    document.body.dataset.theme = theme;
    localStorage.setItem('nafunny-theme', theme);
    $$('[data-theme-choice]').forEach(b => b.classList.toggle('active', b === btn));
    screenFlash();
    showToast(theme === 'purple' ? 'Cyber Purple enabled' : theme === 'storm' ? 'Night Storm enabled' : 'Electric Blue enabled');
  });
});

// Ambient sound — real rain through WebAudio gain, so the volume slider works on iPhone/Telegram too
let ambientAudio = null;
let audioCtx = null;
let rainSource = null;
let rainGain = null;
let thunderMaster = null;
let ambientOn = false;
const ambientToggle = $('#ambientToggle');
const ambientVolume = $('#ambientVolume');
let ambientLevel = Number(localStorage.getItem('nafunny-ambient-volume') || '85') / 100;
if(ambientVolume) ambientVolume.value = String(Math.round(ambientLevel * 100));

function applyAmbientVolume(){
  const v = Math.max(0, Math.min(1, ambientLevel));
  if(ambientAudio) ambientAudio.volume = 1; // iOS may ignore this, so GainNode is the real control
  if(rainGain && audioCtx){
    rainGain.gain.setTargetAtTime(v * 0.92, audioCtx.currentTime, 0.04);
  }
  if(thunderMaster && audioCtx){
    thunderMaster.gain.setTargetAtTime(v * 0.24, audioCtx.currentTime, 0.05);
  }
}

function ensureAmbientAudio(){
  if(ambientAudio) return ambientAudio;
  ambientAudio = new Audio('rain.mp3');
  ambientAudio.loop = true;
  ambientAudio.preload = 'auto';
  ambientAudio.volume = 1;
  ambientAudio.setAttribute('playsinline', '');
  return ambientAudio;
}

function ensureAudioContext(){
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if(audioCtx.state === 'suspended') audioCtx.resume();

  const audio = ensureAmbientAudio();
  if(!rainSource){
    rainSource = audioCtx.createMediaElementSource(audio);
    rainGain = audioCtx.createGain();
    rainGain.gain.value = 0;
    rainSource.connect(rainGain).connect(audioCtx.destination);
  }
  if(!thunderMaster){
    thunderMaster = audioCtx.createGain();
    thunderMaster.gain.value = ambientLevel * 0.24;
    thunderMaster.connect(audioCtx.destination);
  }
  applyAmbientVolume();
}

async function startAmbient(){
  const audio = ensureAmbientAudio();
  ensureAudioContext();
  try{
    await audio.play();
    ambientOn = true;
    applyAmbientVolume();
    ambientToggle.textContent = '♪ Ambient ON';
    ambientToggle.classList.add('on');
    ambientToggle.setAttribute('aria-pressed','true');
    showToast('Soft rain ON');
  }catch(err){
    showToast('Tap again to enable sound');
  }
}

function stopAmbient(){
  if(ambientAudio){ ambientAudio.pause(); }
  ambientOn = false;
  ambientToggle.textContent = '♪ Ambient OFF';
  ambientToggle.classList.remove('on');
  ambientToggle.setAttribute('aria-pressed','false');
  showToast('Ambient OFF');
}

ambientVolume?.addEventListener('input', () => {
  ambientLevel = Number(ambientVolume.value) / 100;
  localStorage.setItem('nafunny-ambient-volume', String(Math.round(ambientLevel * 100)));
  applyAmbientVolume();
});

function thunder(level = 1){
  if(!ambientOn || !audioCtx || !thunderMaster) return;
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2.4, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  let last = 0;
  for(let i=0;i<data.length;i++){
    const white = Math.random()*2-1;
    last = last*.94 + white*.06;
    data[i] = last * 0.28;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const noiseFilter = audioCtx.createBiquadFilter();
  const noiseGain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(28 + Math.random()*12, now);
  osc.frequency.exponentialRampToValueAtTime(17 + Math.random()*8, now + 1.6);
  filter.type = 'lowpass'; filter.frequency.value = 95; filter.Q.value = .2;
  noiseFilter.type = 'lowpass'; noiseFilter.frequency.value = 145; noiseFilter.Q.value = .16;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.065 * level, now + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.025 * level, now + 0.2);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.35);

  osc.connect(filter).connect(gain).connect(thunderMaster);
  noise.connect(noiseFilter).connect(noiseGain).connect(thunderMaster);
  osc.start(now); noise.start(now);
  osc.stop(now + 2.2); noise.stop(now + 2.45);
}

ambientToggle?.addEventListener('click', () => ambientOn ? stopAmbient() : startAmbient());

// Active nav
const navLinks = $$('.bottom-nav a');
const sections = ['home','socials','crypto','donate'].map(id => document.getElementById(id));
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if(e.isIntersecting){
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${e.target.id}`));
    }
  });
},{threshold:.35});
sections.forEach(s => s && io.observe(s));

// Copy + QR
const toast = $('#toast');
function showToast(text){ if(!toast) return; toast.textContent = text; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),1300); }
function buttonImpulse(el){ el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
$$('.wallet .copy').forEach(btn => btn.addEventListener('click', async () => {
  const address = btn.closest('.wallet').dataset.address;
  try{ await navigator.clipboard.writeText(address); showToast('Wallet copied ✔'); }
  catch{ showToast('Copy failed'); }
  buttonImpulse(btn);
  if(navigator.vibrate) navigator.vibrate(35);
}));
const qrModal = $('#qrModal'), qrImage = $('#qrImage');
$$('.wallet .qr').forEach(btn => btn.addEventListener('click', () => {
  qrImage.src = btn.dataset.qr; qrModal.classList.add('open'); qrModal.setAttribute('aria-hidden','false'); buttonImpulse(btn);
}));
$('.qr-close')?.addEventListener('click', () => qrModal.classList.remove('open'));
qrModal?.addEventListener('click', e => { if(e.target === qrModal) qrModal.classList.remove('open'); });

// 3D background / hero parallax
let mx=0,my=0;
window.addEventListener('pointermove', e => {
  const x = (e.clientX / innerWidth - .5) * 2;
  const y = (e.clientY / innerHeight - .5) * 2;
  mx += (x*22 - mx) * .14; my += (y*22 - my) * .14;
  document.documentElement.style.setProperty('--mx', `${mx}px`);
  document.documentElement.style.setProperty('--my', `${my}px`);
});
window.addEventListener('deviceorientation', e => {
  if(e.gamma == null || e.beta == null) return;
  mx = Math.max(-18, Math.min(18, e.gamma * .55));
  my = Math.max(-18, Math.min(18, (e.beta-45) * .22));
  document.documentElement.style.setProperty('--mx', `${mx}px`);
  document.documentElement.style.setProperty('--my', `${my}px`);
}, {passive:true});

// Particles canvas
const canvas = $('#spaceCanvas'); const ctx = canvas.getContext('2d');
let particles=[];
function themeParticleColor(alpha){
  const t = document.body.dataset.theme;
  if(t === 'purple') return `rgba(218,110,255,${alpha})`;
  if(t === 'storm') return `rgba(203,216,232,${alpha})`;
  return `rgba(58,226,255,${alpha})`;
}
function setupParticles(){ const n = Math.min(140, Math.floor(innerWidth/9)); particles = Array.from({length:n}, () => ({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*2+0.5,vx:(Math.random()-.5)*.28,vy:(Math.random()-.5)*.35,a:Math.random()*.55+.18})); }
function drawParticles(){ ctx.clearRect(0,0,innerWidth,innerHeight); const storm = document.body.classList.contains('electric-mode'); const shadow = document.body.dataset.theme === 'purple' ? '#d178ff' : document.body.dataset.theme === 'storm' ? '#c5d4e8' : '#29e9ff'; for(const p of particles){ p.x+=p.vx*(storm?3.1:1); p.y+=p.vy*(storm?3.0:1) + (storm?0.36:0); if(p.x<0)p.x=innerWidth;if(p.x>innerWidth)p.x=0;if(p.y<0)p.y=innerHeight;if(p.y>innerHeight)p.y=0; ctx.beginPath(); ctx.fillStyle=themeParticleColor(storm?Math.min(1,p.a+.35):p.a); ctx.shadowBlur=storm?28:12; ctx.shadowColor=shadow; ctx.arc(p.x,p.y,p.r*(storm?1.35:1),0,Math.PI*2); ctx.fill(); } requestAnimationFrame(drawParticles); }

// Rain canvas
const rainCanvas = $('#rainCanvas'); const rctx = rainCanvas.getContext('2d');
let rain=[];
function setupRain(){ const n = Math.min(300, Math.floor(innerWidth/3.1)); rain = Array.from({length:n}, () => ({x:Math.random()*innerWidth,y:Math.random()*innerHeight,l:Math.random()*34+16,s:Math.random()*12+14,o:Math.random()*.32+.12,w:Math.random()*.55+.28})); }
function drawRain(){ rctx.clearRect(0,0,innerWidth,innerHeight); if(document.body.classList.contains('electric-mode')){ rctx.save(); const t = document.body.dataset.theme; rctx.strokeStyle = t === 'purple' ? 'rgba(224,133,255,.46)' : t === 'storm' ? 'rgba(210,225,246,.34)' : 'rgba(122,218,255,.44)'; rctx.shadowColor = t === 'purple' ? '#d178ff' : t === 'storm' ? '#d7e6ff' : '#29e9ff'; rctx.shadowBlur=4; for(const d of rain){ d.x += 2.4; d.y += d.s; if(d.y>innerHeight+60){d.y=-60; d.x=Math.random()*innerWidth;} if(d.x>innerWidth+60)d.x=-60; rctx.globalAlpha=d.o; rctx.lineWidth=d.w; rctx.beginPath(); rctx.moveTo(d.x,d.y); rctx.lineTo(d.x-10,d.y+d.l); rctx.stroke(); } rctx.restore(); } requestAnimationFrame(drawRain); }

// Lightning canvas
const lcan = $('#lightningCanvas'); const lctx = lcan.getContext('2d'); let bolts=[];
function resizeCanvas(c, cctx){ c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; c.style.width = innerWidth+'px'; c.style.height = innerHeight+'px'; cctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); }
function resize(){ resizeCanvas(canvas, ctx); resizeCanvas(rainCanvas, rctx); resizeCanvas(lcan, lctx); setupParticles(); setupRain(); }
function makeBolt(fromX, fromY, toX, toY, intensity=1){ const pts=[]; const steps=14; for(let i=0;i<=steps;i++){ const t=i/steps; const x=fromX+(toX-fromX)*t+(Math.random()-.5)*42*intensity; const y=fromY+(toY-fromY)*t+(Math.random()-.5)*42*intensity; pts.push({x,y}); } bolts.push({pts,life:.85,intensity}); }
function autoBolt(){ const storm = document.body.classList.contains('electric-mode'); const y = Math.random()*innerHeight*.66+20; makeBolt(-50,y,innerWidth+50,y+Math.random()*180-90, storm?1.05:.75); if(storm ? Math.random() < .46 : Math.random() > .72){ screenFlash(); thunder(storm?.55:.35); } }
function drawLightning(){ lctx.clearRect(0,0,innerWidth,innerHeight); bolts = bolts.filter(b => b.life > 0); const t = document.body.dataset.theme; const glow = t === 'purple' ? '#d178ff' : t === 'storm' ? '#d7e6ff' : '#29e9ff'; const soft = t === 'purple' ? 'rgba(209,120,255,.28)' : t === 'storm' ? 'rgba(215,230,255,.2)' : 'rgba(41,233,255,.25)'; for(const b of bolts){ lctx.save(); lctx.globalAlpha=b.life; lctx.lineWidth=2.2*b.intensity; lctx.shadowBlur=22*b.intensity; lctx.shadowColor=glow; lctx.strokeStyle='rgba(255,255,255,.98)'; lctx.beginPath(); b.pts.forEach((p,i)=> i?lctx.lineTo(p.x,p.y):lctx.moveTo(p.x,p.y)); lctx.stroke(); lctx.lineWidth=7*b.intensity; lctx.strokeStyle=soft; lctx.stroke(); lctx.restore(); b.life-=.055; } requestAnimationFrame(drawLightning); }
let autoLightningTimer = setInterval(autoBolt, 9500);
function setLightningRate(ms){ clearInterval(autoLightningTimer); autoLightningTimer = setInterval(autoBolt, ms); }

// Electric mode: SECRET only after 5 quick clicks, 10 seconds storm
const logoBtn = $('#logoButton'); const easter = $('#easter'); const stormWidget=$('#stormWidget'); const stormTimer=$('#stormTimer');
let taps = 0, tapTimer, stormTimeout, stormInterval, stormSeconds=10;
function activateElectricMode(){
  clearTimeout(stormTimeout); clearInterval(stormInterval);
  stormSeconds = 10;
  document.body.classList.add('electric-mode'); stormWidget.classList.add('show'); stormWidget.classList.remove('hint'); stormTimer.textContent = `${stormSeconds}s`;
  setLightningRate(2600);
  easter.classList.add('show'); setTimeout(()=>easter.classList.remove('show'),2200);
  for(let i=0;i<3;i++) setTimeout(autoBolt, i*620);
  if(navigator.vibrate) navigator.vibrate([50,35,85,35,120]);
  stormInterval = setInterval(()=>{ stormSeconds--; stormTimer.textContent = `${stormSeconds}s`; if(stormSeconds<=0) deactivateElectricMode(); },1000);
  stormTimeout = setTimeout(deactivateElectricMode, 10200);
}
function deactivateElectricMode(){
  clearTimeout(stormTimeout); clearInterval(stormInterval);
  document.body.classList.remove('electric-mode'); stormWidget.classList.remove('show'); stormWidget.classList.add('hint'); stormTimer.textContent = `5×`; setLightningRate(9500); showToast('Storm dissipated...');
}
function clickProgress(){
  stormWidget.classList.add('show'); stormWidget.classList.add('hint');
  stormTimer.textContent = `${Math.min(taps,5)}/5`;
  setTimeout(()=>{ if(!document.body.classList.contains('electric-mode') && taps === 0){ stormTimer.textContent='5×'; stormWidget.classList.remove('show'); } }, 1200);
}
logoBtn.addEventListener('click', () => {
  logoBtn.classList.remove('clicked'); void logoBtn.offsetWidth; logoBtn.classList.add('clicked');
  const r = logoBtn.getBoundingClientRect();
  makeBolt(r.left+r.width*.2, r.top+r.height*.38, r.right-r.width*.2, r.bottom-r.height*.38, .45);
  taps++; clickProgress();
  clearTimeout(tapTimer); tapTimer = setTimeout(()=>{ taps=0; if(!document.body.classList.contains('electric-mode')){ stormTimer.textContent='5×'; stormWidget.classList.remove('show'); } }, 1800);
  if(taps >= 5){ taps=0; clearTimeout(tapTimer); activateElectricMode(); }
});

window.addEventListener('resize', resize);
resize(); drawParticles(); drawRain(); drawLightning();


// HUB 1.1 Patch 6: Desktop HUB Menu
const desktopHub = $('#desktopHub');
const hubTrigger = $('#hubTrigger');
const hubPanel = $('#hubPanel');
const hubTip = $('#hubTip');
const hubAmbient = $('#hubAmbient');
const hubVolume = $('#hubVolume');

function setHubOpen(open){
  if(!desktopHub || !hubTrigger || !hubPanel) return;
  desktopHub.classList.toggle('open', open);
  hubTrigger.setAttribute('aria-expanded', String(open));
  hubPanel.setAttribute('aria-hidden', String(!open));
  if(open) localStorage.setItem('nafunny-hub-tip-seen','1');
}
hubTrigger?.addEventListener('click', (e) => { e.stopPropagation(); setHubOpen(!desktopHub.classList.contains('open')); });
document.addEventListener('click', (e) => { if(desktopHub && !desktopHub.contains(e.target)) setHubOpen(false); });
document.addEventListener('keydown', (e) => { if(e.key === 'Escape') setHubOpen(false); });
$$('.hub-links a').forEach(a => a.addEventListener('click', () => setHubOpen(false)));
$$('[data-hub-soon]').forEach(btn => btn.addEventListener('click', () => showToast(`${btn.dataset.hubSoon} coming in HUB 1.2`)));

function syncHubAmbient(){
  if(!hubAmbient || !ambientToggle) return;
  const on = ambientToggle.classList.contains('on');
  hubAmbient.textContent = on ? 'Ambient ON' : 'Ambient OFF';
  hubAmbient.classList.toggle('on', on);
}
hubAmbient?.addEventListener('click', () => { ambientToggle?.click(); setTimeout(syncHubAmbient, 120); });
if(hubVolume && ambientVolume){
  hubVolume.value = ambientVolume.value;
  hubVolume.addEventListener('input', () => {
    ambientVolume.value = hubVolume.value;
    ambientVolume.dispatchEvent(new Event('input', {bubbles:true}));
  });
  ambientVolume.addEventListener('input', () => { hubVolume.value = ambientVolume.value; });
}
if(ambientToggle){ new MutationObserver(syncHubAmbient).observe(ambientToggle, {attributes:true, attributeFilter:['class','aria-pressed']}); syncHubAmbient(); }

if(hubTip && !localStorage.getItem('nafunny-hub-tip-seen') && matchMedia('(min-width:1051px)').matches){
  setTimeout(()=>hubTip.classList.add('show'), 1800);
  setTimeout(()=>hubTip.classList.remove('show'), 7200);
}


/* ===== NaFunny HUB 1.2 FINAL Hotfix — Telegram Feed Loader ===== */
(function(){
  const fallbackFeed = [
    {channel:'@NaFunny', title:'Стримы и анонсы', text:'Новости проекта, расписание стримов, клипы и важные обновления комьюнити.', url:'https://t.me/NaFunny'},
    {channel:'@NaFunny', title:'Community updates', text:'Dota 2, турики, моменты со стримов и всё, что стоит сохранить для своих.', url:'https://t.me/NaFunny'},
    {channel:'@TonNewbie', title:'TON / GRAM watch', text:'Крипто-новости, наблюдения по рынку TON/GRAM и честные заметки по экосистеме.', url:'https://t.me/TonNewbie'},
    {channel:'@TonNewbie', title:'Crypto safety & insights', text:'Разборы, предупреждения, полезная информация и опыт из TON / Web3 мира.', url:'https://t.me/TonNewbie'}
  ];
  function cleanText(text){
    return (text||'').replace(/\s+/g,' ').replace(/Open in Telegram|VIEW IN TELEGRAM/gi,'').trim();
  }
  function titleFrom(text, channel){
    const t = cleanText(text);
    if(!t) return channel === '@NaFunny' ? 'NaFunny update' : 'TonNewbie update';
    const first = t.split(/[.!?\n]/).find(Boolean) || t;
    return first.length > 62 ? first.slice(0,59).trim() + '…' : first;
  }
  function excerptFrom(text){
    const t = cleanText(text);
    if(!t) return 'Открой канал, чтобы посмотреть последний пост.';
    return t.length > 180 ? t.slice(0,177).trim() + '…' : t;
  }
  async function fetchViaProxy(channel){
    const source = `https://t.me/s/${channel}`;
    const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(source)}`;
    const res = await fetch(proxy, {cache:'no-store'});
    if(!res.ok) throw new Error('Telegram proxy failed');
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nodes = Array.from(doc.querySelectorAll('.tgme_widget_message_wrap, .tgme_widget_message'));
    const items = [];
    for(const node of nodes){
      const textEl = node.querySelector('.tgme_widget_message_text');
      const dateEl = node.querySelector('time');
      const linkEl = node.querySelector('.tgme_widget_message_date');
      const text = cleanText(textEl ? textEl.innerText : '');
      const href = linkEl && linkEl.href ? linkEl.href : `https://t.me/${channel}`;
      if(text && !items.some(x => x.text === text)){
        items.push({
          channel:'@'+channel,
          title:titleFrom(text, '@'+channel),
          text:excerptFrom(text),
          date: dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent || '') : '',
          url: href
        });
      }
    }
    return items.slice(-2).reverse();
  }
  function render(items, live){
    const grid = document.querySelector('.feed-grid-gold');
    const section = document.querySelector('#feed');
    if(!grid || !section) return;
    let status = section.querySelector('.feed-live-status');
    if(!status){
      status = document.createElement('div');
      status.className = 'feed-live-status';
      const title = section.querySelector('.section-title');
      if(title) title.insertAdjacentElement('afterend', status);
    }
    status.classList.toggle('is-live', !!live);
    status.classList.toggle('is-fallback', !live);
    status.textContent = live ? 'Live Telegram feed loaded' : 'Telegram feed fallback • open channels for latest posts';
    grid.innerHTML = items.map(item => `
      <article class="feed-card hub-card-lite">
        <small>${item.channel}</small>
        <b>${item.title}</b>
        ${item.date ? `<time>${new Date(item.date).toLocaleDateString('ru-RU', {day:'2-digit', month:'short'})}</time>` : ''}
        <p>${item.text}</p>
        <a href="${item.url}" target="_blank" rel="noopener noreferrer">Read post ↗</a>
      </article>
    `).join('');
  }
  async function initTelegramFeed(){
    const grid = document.querySelector('.feed-grid-gold');
    if(!grid) return;
    try{
      const [na, ton] = await Promise.all([fetchViaProxy('NaFunny'), fetchViaProxy('TonNewbie')]);
      const items = [...na, ...ton].slice(0,4);
      if(items.length >= 2) render(items, true); else render(fallbackFeed, false);
    }catch(e){
      render(fallbackFeed, false);
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initTelegramFeed);
  else initTelegramFeed();
})();
