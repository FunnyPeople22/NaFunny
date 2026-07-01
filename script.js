const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

const flash = $('#flash');
function screenFlash(){ flash.classList.remove('show'); void flash.offsetWidth; flash.classList.add('show'); }

window.addEventListener('load', () => {
  setTimeout(() => $('#preloader')?.classList.add('hide'), 1500);
});

// Theme switcher
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
  });
});

// Ambient sound (WebAudio, no files)
let audioCtx, noiseNode, gainNode, rumbleOsc, ambientOn = false;
const ambientToggle = $('#ambientToggle');
function startAmbient(){
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if(audioCtx.state === 'suspended') audioCtx.resume();
  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const out = noiseBuffer.getChannelData(0);
  for(let i=0;i<bufferSize;i++) out[i] = (Math.random()*2-1) * 0.22;
  noiseNode = audioCtx.createBufferSource();
  noiseNode.buffer = noiseBuffer;
  noiseNode.loop = true;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 850;
  gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.028;
  rumbleOsc = audioCtx.createOscillator();
  const rumbleGain = audioCtx.createGain();
  rumbleOsc.type = 'sine'; rumbleOsc.frequency.value = 42; rumbleGain.gain.value = 0.012;
  noiseNode.connect(filter).connect(gainNode).connect(audioCtx.destination);
  rumbleOsc.connect(rumbleGain).connect(audioCtx.destination);
  noiseNode.start(); rumbleOsc.start(); ambientOn = true;
  ambientToggle.textContent = '♪ Ambient ON'; ambientToggle.classList.add('on'); ambientToggle.setAttribute('aria-pressed','true');
}
function stopAmbient(){
  try{ noiseNode?.stop(); rumbleOsc?.stop(); }catch{}
  ambientOn = false; ambientToggle.textContent = '♪ Ambient OFF'; ambientToggle.classList.remove('on'); ambientToggle.setAttribute('aria-pressed','false');
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
function showToast(text){ toast.textContent = text; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),1250); }
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
$('.qr-close').addEventListener('click', () => qrModal.classList.remove('open'));
qrModal.addEventListener('click', e => { if(e.target === qrModal) qrModal.classList.remove('open'); });

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
function setupParticles(){ const n = Math.min(120, Math.floor(innerWidth/11)); particles = Array.from({length:n}, () => ({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*2+0.5,vx:(Math.random()-.5)*.28,vy:(Math.random()-.5)*.35,a:Math.random()*.55+.18})); }
function drawParticles(){ ctx.clearRect(0,0,innerWidth,innerHeight); const storm = document.body.classList.contains('electric-mode'); for(const p of particles){ p.x+=p.vx*(storm?2.4:1); p.y+=p.vy*(storm?2.6:1) + (storm?0.15:0); if(p.x<0)p.x=innerWidth;if(p.x>innerWidth)p.x=0;if(p.y<0)p.y=innerHeight;if(p.y>innerHeight)p.y=0; ctx.beginPath(); ctx.fillStyle=`rgba(58,226,255,${storm?Math.min(1,p.a+.25):p.a})`; ctx.shadowBlur=storm?22:12; ctx.shadowColor='#29e9ff'; ctx.arc(p.x,p.y,p.r*(storm?1.25:1),0,Math.PI*2); ctx.fill(); } requestAnimationFrame(drawParticles); }

// Rain canvas
const rainCanvas = $('#rainCanvas'); const rctx = rainCanvas.getContext('2d');
let rain=[];
function setupRain(){ const n = Math.min(260, Math.floor(innerWidth/4)); rain = Array.from({length:n}, () => ({x:Math.random()*innerWidth,y:Math.random()*innerHeight,l:Math.random()*32+14,s:Math.random()*10+12,o:Math.random()*.45+.18})); }
function drawRain(){ rctx.clearRect(0,0,innerWidth,innerHeight); if(document.body.classList.contains('electric-mode')){ rctx.save(); rctx.strokeStyle='rgba(122,218,255,.62)'; rctx.lineWidth=1; rctx.shadowBlur=8; rctx.shadowColor='#29e9ff'; for(const d of rain){ d.x += 1.8; d.y += d.s; if(d.y>innerHeight+40){d.y=-40; d.x=Math.random()*innerWidth;} if(d.x>innerWidth+40)d.x=-40; rctx.globalAlpha=d.o; rctx.beginPath(); rctx.moveTo(d.x,d.y); rctx.lineTo(d.x-8,d.y+d.l); rctx.stroke(); } rctx.restore(); } requestAnimationFrame(drawRain); }

// Lightning canvas
const lcan = $('#lightningCanvas'); const lctx = lcan.getContext('2d'); let bolts=[];
function resizeCanvas(c, cctx){ c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; c.style.width = innerWidth+'px'; c.style.height = innerHeight+'px'; cctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); }
function resize(){ resizeCanvas(canvas, ctx); resizeCanvas(rainCanvas, rctx); resizeCanvas(lcan, lctx); setupParticles(); setupRain(); }
function makeBolt(fromX, fromY, toX, toY, intensity=1){ const pts=[]; const steps=14; for(let i=0;i<=steps;i++){ const t=i/steps; const x=fromX+(toX-fromX)*t+(Math.random()-.5)*52*intensity; const y=fromY+(toY-fromY)*t+(Math.random()-.5)*52*intensity; pts.push({x,y}); } bolts.push({pts,life:1,intensity}); }
function autoBolt(){ const storm = document.body.classList.contains('electric-mode'); const y = Math.random()*innerHeight*.72+20; makeBolt(-40,y,innerWidth+40,y+Math.random()*220-110, storm?1.4:1); if(storm || Math.random()>.4) screenFlash(); }
function drawLightning(){ lctx.clearRect(0,0,innerWidth,innerHeight); bolts = bolts.filter(b => b.life > 0); for(const b of bolts){ lctx.save(); lctx.globalAlpha=b.life; lctx.lineWidth=3*b.intensity; lctx.shadowBlur=30*b.intensity; lctx.shadowColor='#29e9ff'; lctx.strokeStyle='rgba(255,255,255,.98)'; lctx.beginPath(); b.pts.forEach((p,i)=> i?lctx.lineTo(p.x,p.y):lctx.moveTo(p.x,p.y)); lctx.stroke(); lctx.lineWidth=9*b.intensity; lctx.strokeStyle='rgba(41,233,255,.25)'; lctx.stroke(); lctx.restore(); b.life-=.032; } requestAnimationFrame(drawLightning); }
let autoLightningTimer = setInterval(autoBolt, 8500);
function setLightningRate(ms){ clearInterval(autoLightningTimer); autoLightningTimer = setInterval(autoBolt, ms); }

// Electric mode: 15 seconds storm
const logoBtn = $('#logoButton'); const easter = $('#easter'); const stormWidget=$('#stormWidget'); const stormTimer=$('#stormTimer');
let taps = 0, tapTimer, stormTimeout, stormInterval, stormSeconds=15;
function activateElectricMode(strong=false){
  clearTimeout(stormTimeout); clearInterval(stormInterval);
  stormSeconds = 15;
  document.body.classList.add('electric-mode'); stormWidget.classList.add('show'); stormTimer.textContent = `${stormSeconds}s`;
  setLightningRate(strong?650:900);
  if(strong){ easter.classList.add('show'); setTimeout(()=>easter.classList.remove('show'),2300); }
  for(let i=0;i<(strong?5:3);i++) setTimeout(autoBolt, i*220);
  stormInterval = setInterval(()=>{ stormSeconds--; stormTimer.textContent = `${stormSeconds}s`; if(stormSeconds<=0) deactivateElectricMode(); },1000);
  stormTimeout = setTimeout(deactivateElectricMode, 15200);
}
function deactivateElectricMode(){
  clearTimeout(stormTimeout); clearInterval(stormInterval);
  document.body.classList.remove('electric-mode'); stormWidget.classList.remove('show'); setLightningRate(8500); showToast('Storm dissipated...');
}
logoBtn.addEventListener('click', () => {
  logoBtn.classList.remove('clicked'); void logoBtn.offsetWidth; logoBtn.classList.add('clicked');
  const r = logoBtn.getBoundingClientRect();
  makeBolt(r.left+r.width*.12, r.top+r.height*.35, r.right-r.width*.12, r.bottom-r.height*.35, 1.2);
  screenFlash(); activateElectricMode(false);
  taps++; clearTimeout(tapTimer); tapTimer = setTimeout(()=>taps=0, 1700);
  if(taps >= 5){ taps=0; activateElectricMode(true); if(navigator.vibrate) navigator.vibrate([50,30,80,30,120]); }
});

window.addEventListener('resize', resize);
resize(); drawParticles(); drawRain(); drawLightning();
