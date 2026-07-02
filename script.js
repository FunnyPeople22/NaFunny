const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

const flash = $('#flash');
function screenFlash(){ flash.classList.remove('show'); void flash.offsetWidth; flash.classList.add('show'); }

window.addEventListener('load', () => {
  setTimeout(() => $('#preloader')?.classList.add('hide'), 700);
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

// Ambient Engine 2.0 — user's real rain MP3 + fade + saved state
let ambientAudio = null;
let audioCtx = null;
let thunderMaster = null;
let ambientOn = false;
let ambientFadeTimer = null;
const ambientToggle = $('#ambientToggle');
const DEFAULT_AMBIENT_VOLUME = Number(localStorage.getItem('nafunny-ambient-volume') || 42) / 100;

function ensureAmbientAudio(){
  if(ambientAudio) return ambientAudio;
  ambientAudio = new Audio('rain.mp3');
  ambientAudio.loop = true;
  ambientAudio.preload = 'auto';
  ambientAudio.volume = 0;
  return ambientAudio;
}

function ensureAudioContext(){
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if(audioCtx.state === 'suspended') audioCtx.resume();
  if(!thunderMaster){
    thunderMaster = audioCtx.createGain();
    thunderMaster.gain.value = 0.16;
    thunderMaster.connect(audioCtx.destination);
  }
}

function fadeAudio(target, duration = 1800){
  const audio = ensureAmbientAudio();
  clearInterval(ambientFadeTimer);
  const startVol = audio.volume;
  const started = performance.now();
  ambientFadeTimer = setInterval(() => {
    const t = Math.min(1, (performance.now() - started) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    audio.volume = startVol + (target - startVol) * eased;
    if(t >= 1){ clearInterval(ambientFadeTimer); audio.volume = target; }
  }, 40);
}

async function startAmbient(){
  const audio = ensureAmbientAudio();
  ensureAudioContext();
  try{
    await audio.play();
    ambientOn = true;
    localStorage.setItem('nafunny-ambient-enabled','yes');
    fadeAudio(DEFAULT_AMBIENT_VOLUME, 1600);
    syncAmbientButtons?.();
    showToast('Atmosphere ON');
  }catch(err){
    localStorage.setItem('nafunny-ambient-enabled','no');
    showToast('Tap Enable Atmosphere');
    throw err;
  }
}

function stopAmbient(){
  if(ambientAudio){
    fadeAudio(0, 1100);
    setTimeout(() => { if(!ambientOn && ambientAudio) ambientAudio.pause(); }, 1200);
  }
  ambientOn = false;
  localStorage.setItem('nafunny-ambient-enabled','no');
  syncAmbientButtons?.();
  showToast('Ambient OFF');
}

function thunder(level = 1){
  if(!ambientOn || !audioCtx || !thunderMaster) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(32 + Math.random()*10, now);
  osc.frequency.exponentialRampToValueAtTime(18 + Math.random()*5, now + 1.7);
  filter.type = 'lowpass'; filter.frequency.value = 95; filter.Q.value = .2;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.045 * level, now + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.3);
  osc.connect(filter).connect(gain).connect(thunderMaster);
  osc.start(now); osc.stop(now + 2.45);
}

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


// HUB 1.2 — Cinematic intro, mobile settings and audio unlock prompt
const cinematicIntro = $('#cinematicIntro');
const replayIntroBtn = $('#replayIntro');
function playCinematicIntro(force=false){
  if(!cinematicIntro) return;
  if(!force && localStorage.getItem('nafunny-intro-seen-v121') === 'yes') return;
  cinematicIntro.classList.remove('hide');
  cinematicIntro.classList.add('show');
  setTimeout(() => {
    cinematicIntro.classList.add('hide');
    cinematicIntro.classList.remove('show');
    localStorage.setItem('nafunny-intro-seen-v121','yes');
  }, 5000);
}
window.addEventListener('load', () => setTimeout(() => playCinematicIntro(false), 150));
replayIntroBtn?.addEventListener('click', () => { closeHubSettings(); playCinematicIntro(true); });

// Mobile HUB settings
const mobileHubToggle = $('#mobileHubToggle');
const hubSettings = $('#hubSettings');
const hubSettingsClose = $('#hubSettingsClose');
function openHubSettings(){ hubSettings?.classList.add('open'); hubSettings?.setAttribute('aria-hidden','false'); }
function closeHubSettings(){ hubSettings?.classList.remove('open'); hubSettings?.setAttribute('aria-hidden','true'); }
mobileHubToggle?.addEventListener('click', openHubSettings);
hubSettingsClose?.addEventListener('click', closeHubSettings);
hubSettings?.addEventListener('click', e => { if(e.target === hubSettings) closeHubSettings(); });

function syncThemeButtons(){
  const theme = document.body.dataset.theme;
  $$('[data-theme-choice]').forEach(b => b.classList.toggle('active', b.dataset.themeChoice === theme));
}
$$('[data-theme-choice]').forEach(b => b.addEventListener('click', () => setTimeout(syncThemeButtons, 0)));
syncThemeButtons();

// Atmosphere unlock prompt for iPhone / Telegram WebView
const atmospherePrompt = $('#atmospherePrompt');
const atmosphereClose = $('#atmosphereClose');
const enableAtmosphere = $('#enableAtmosphere');
const ambientToggleMobile = $('#ambientToggleMobile');
const ambientVolume = $('#ambientVolume');
if(ambientVolume) ambientVolume.value = Math.round(DEFAULT_AMBIENT_VOLUME * 100);
let atmosphereUnlocked = false;
function openAtmospherePrompt(){ atmospherePrompt?.classList.add('open'); atmospherePrompt?.setAttribute('aria-hidden','false'); }
function closeAtmospherePrompt(){ atmospherePrompt?.classList.remove('open'); atmospherePrompt?.setAttribute('aria-hidden','true'); }
atmosphereClose?.addEventListener('click', closeAtmospherePrompt);
atmospherePrompt?.addEventListener('click', e => { if(e.target === atmospherePrompt) closeAtmospherePrompt(); });
function syncAmbientButtons(){
  [ambientToggle, ambientToggleMobile].forEach(btn => {
    if(!btn) return;
    btn.textContent = ambientOn ? '♪ Ambient ON' : '♪ Ambient OFF';
    btn.classList.toggle('on', ambientOn);
    btn.setAttribute('aria-pressed', ambientOn ? 'true' : 'false');
  });
}
async function requestAmbient(){
  try{
    await startAmbient();
    atmosphereUnlocked = true;
    closeAtmospherePrompt();
    syncAmbientButtons();
  }catch(e){
    openAtmospherePrompt();
  }
  setTimeout(syncAmbientButtons, 100);
}
ambientToggleMobile?.addEventListener('click', () => ambientOn ? (stopAmbient(), syncAmbientButtons()) : openAtmospherePrompt());
enableAtmosphere?.addEventListener('click', requestAmbient);
ambientToggle?.addEventListener('click', () => ambientOn ? (stopAmbient(), syncAmbientButtons()) : openAtmospherePrompt());
ambientVolume?.addEventListener('input', () => {
  const v = Math.max(.05, Math.min(.95, Number(ambientVolume.value) / 100));
  localStorage.setItem('nafunny-ambient-volume', String(Math.round(v*100)));
  if(ambientAudio && ambientOn) ambientAudio.volume = v;
  if(thunderMaster) thunderMaster.gain.value = .06 + v * .22;
});

// If a user taps anywhere after prompt is open, keep sound locked behind Enable button only.
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') { closeHubSettings(); closeAtmospherePrompt(); }
});


// HUB 1.2.1 — Telegram feed, footer easter egg and saved atmosphere hint
function escapeHtml(str){ return String(str || '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function timeAgo(dateStr){
  const d = dateStr ? new Date(dateStr) : null;
  if(!d || Number.isNaN(+d)) return 'Latest post';
  const sec = Math.floor((Date.now() - d.getTime())/1000);
  if(sec < 3600) return Math.max(1,Math.floor(sec/60)) + ' min ago';
  if(sec < 86400) return Math.floor(sec/3600) + 'h ago';
  return Math.floor(sec/86400) + 'd ago';
}
function fallbackTelegramFeed(){
  const feed = $('#telegramFeed');
  if(!feed) return;
  feed.innerHTML = [1,2,3].map((n) => `
    <a class="feed-item" href="https://t.me/NaFunny" target="_blank" rel="noopener noreferrer">
      <strong>@NaFunny — latest post ${n}</strong>
      <p>Telegram feed could not be loaded inside this browser. Open the channel to view the latest posts.</p>
      <small>Open in Telegram →</small>
    </a>`).join('');
}
async function loadTelegramFeed(){
  const feed = $('#telegramFeed');
  if(!feed) return;
  const url = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://t.me/s/NaFunny');
  try{
    const res = await fetch(url, {cache:'no-store'});
    if(!res.ok) throw new Error('feed failed');
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const messages = [...doc.querySelectorAll('.tgme_widget_message')].slice(-3).reverse();
    if(!messages.length) throw new Error('empty feed');
    feed.innerHTML = messages.map((m) => {
      const text = (m.querySelector('.tgme_widget_message_text')?.textContent || 'Media post from @NaFunny').trim().replace(/\s+/g,' ');
      const link = m.querySelector('.tgme_widget_message_date')?.href || 'https://t.me/NaFunny';
      const dt = m.querySelector('time')?.getAttribute('datetime');
      return `<a class="feed-item" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer"><strong>@NaFunny</strong><p>${escapeHtml(text)}</p><small>${escapeHtml(timeAgo(dt))} • Read →</small></a>`;
    }).join('');
  }catch(e){ fallbackTelegramFeed(); }
}
loadTelegramFeed();

const footerSecret = $('#footerSecret');
const versionModal = $('#versionModal');
const versionClose = $('#versionClose');
footerSecret?.addEventListener('click', () => { versionModal?.classList.add('open'); versionModal?.setAttribute('aria-hidden','false'); });
versionClose?.addEventListener('click', () => { versionModal?.classList.remove('open'); versionModal?.setAttribute('aria-hidden','true'); });
versionModal?.addEventListener('click', e => { if(e.target === versionModal){ versionModal.classList.remove('open'); versionModal.setAttribute('aria-hidden','true'); }});

window.addEventListener('load', () => {
  setTimeout(() => {
    if(localStorage.getItem('nafunny-ambient-enabled') === 'yes') openAtmospherePrompt();
  }, 900);
});
