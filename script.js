const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

const flash = $('#flash');
function screenFlash(){ flash.classList.remove('show'); void flash.offsetWidth; flash.classList.add('show'); }

window.addEventListener('load', () => {
  setTimeout(() => $('#preloader')?.classList.add('hide'), 1600);
});

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
function showToast(text){ toast.textContent = text; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),1200); }
$$('.wallet .copy').forEach(btn => btn.addEventListener('click', async () => {
  const address = btn.closest('.wallet').dataset.address;
  try{ await navigator.clipboard.writeText(address); showToast('Wallet copied ✔'); }
  catch{ showToast('Copy failed'); }
  if(navigator.vibrate) navigator.vibrate(35);
}));
const qrModal = $('#qrModal'), qrImage = $('#qrImage');
$$('.wallet .qr').forEach(btn => btn.addEventListener('click', () => {
  qrImage.src = btn.dataset.qr; qrModal.classList.add('open'); qrModal.setAttribute('aria-hidden','false');
}));
$('.qr-close').addEventListener('click', () => qrModal.classList.remove('open'));
qrModal.addEventListener('click', e => { if(e.target === qrModal) qrModal.classList.remove('open'); });

// 3D background / hero parallax
let mx=0,my=0;
window.addEventListener('pointermove', e => {
  const x = (e.clientX / innerWidth - .5) * 2;
  const y = (e.clientY / innerHeight - .5) * 2;
  mx += (x*18 - mx) * .18; my += (y*18 - my) * .18;
  document.documentElement.style.setProperty('--mx', `${mx}px`);
  document.documentElement.style.setProperty('--my', `${my}px`);
});
window.addEventListener('deviceorientation', e => {
  if(e.gamma == null || e.beta == null) return;
  mx = Math.max(-18, Math.min(18, e.gamma * .6));
  my = Math.max(-18, Math.min(18, (e.beta-45) * .25));
  document.documentElement.style.setProperty('--mx', `${mx}px`);
  document.documentElement.style.setProperty('--my', `${my}px`);
}, {passive:true});

// Particles canvas
const canvas = $('#spaceCanvas'); const ctx = canvas.getContext('2d');
let particles=[];
function resize(){ canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; canvas.style.width = innerWidth+'px'; canvas.style.height = innerHeight+'px'; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); setupParticles(); resizeLightning(); }
function setupParticles(){ const n = Math.min(110, Math.floor(innerWidth/12)); particles = Array.from({length:n}, () => ({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*2+0.5,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.35,a:Math.random()*.55+.18})); }
function drawParticles(){ ctx.clearRect(0,0,innerWidth,innerHeight); for(const p of particles){ p.x+=p.vx; p.y+=p.vy; if(p.x<0)p.x=innerWidth;if(p.x>innerWidth)p.x=0;if(p.y<0)p.y=innerHeight;if(p.y>innerHeight)p.y=0; ctx.beginPath(); ctx.fillStyle=`rgba(58,226,255,${p.a})`; ctx.shadowBlur=12; ctx.shadowColor='#29e9ff'; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); } requestAnimationFrame(drawParticles); }

// Lightning canvas
const lcan = $('#lightningCanvas'); const lctx = lcan.getContext('2d'); let bolts=[];
function resizeLightning(){ lcan.width = innerWidth * devicePixelRatio; lcan.height = innerHeight * devicePixelRatio; lcan.style.width=innerWidth+'px'; lcan.style.height=innerHeight+'px'; lctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); }
function makeBolt(fromX, fromY, toX, toY){ const pts=[]; const steps=12; for(let i=0;i<=steps;i++){ const t=i/steps; const x=fromX+(toX-fromX)*t+(Math.random()-.5)*42; const y=fromY+(toY-fromY)*t+(Math.random()-.5)*42; pts.push({x,y}); } bolts.push({pts,life:1}); }
function autoBolt(){ const y = Math.random()*innerHeight*.7+40; makeBolt(-40,y,innerWidth+40,y+Math.random()*220-110); screenFlash(); }
function drawLightning(){ lctx.clearRect(0,0,innerWidth,innerHeight); bolts = bolts.filter(b => b.life > 0); for(const b of bolts){ lctx.save(); lctx.globalAlpha=b.life; lctx.lineWidth=3; lctx.shadowBlur=22; lctx.shadowColor='#29e9ff'; lctx.strokeStyle='rgba(255,255,255,.98)'; lctx.beginPath(); b.pts.forEach((p,i)=> i?lctx.lineTo(p.x,p.y):lctx.moveTo(p.x,p.y)); lctx.stroke(); lctx.lineWidth=8; lctx.strokeStyle='rgba(41,233,255,.28)'; lctx.stroke(); lctx.restore(); b.life-=.035; } requestAnimationFrame(drawLightning); }
setInterval(autoBolt, 9000);

// Logo click: impulse + easter after 5 taps
let taps = 0, tapTimer;
const logoBtn = $('#logoButton'); const easter = $('#easter');
logoBtn.addEventListener('click', () => {
  logoBtn.classList.remove('clicked'); void logoBtn.offsetWidth; logoBtn.classList.add('clicked');
  const r = logoBtn.getBoundingClientRect();
  makeBolt(r.left+r.width*.15, r.top+r.height*.35, r.right-r.width*.15, r.bottom-r.height*.35);
  screenFlash();
  taps++; clearTimeout(tapTimer); tapTimer = setTimeout(()=>taps=0, 1600);
  if(taps >= 5){ taps=0; easter.classList.add('show'); autoBolt(); setTimeout(()=>easter.classList.remove('show'),1800); if(navigator.vibrate) navigator.vibrate([50,30,80]); }
});

window.addEventListener('resize', resize);
resize(); drawParticles(); drawLightning();
