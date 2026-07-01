const toast = document.getElementById('toast');
function showToast(text = 'Copied') {
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}

window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('intro')?.classList.add('hide'), 1450);
});

document.querySelectorAll('.wallet .copy').forEach((button) => {
  button.addEventListener('click', async () => {
    const address = button.closest('.wallet').dataset.address;
    try {
      await navigator.clipboard.writeText(address);
      if (navigator.vibrate) navigator.vibrate(35);
      showToast('Wallet copied ✔');
      button.textContent = 'Copied';
      setTimeout(() => (button.textContent = 'Copy'), 1200);
    } catch (e) { showToast('Copy manually'); }
  });
});

const modal = document.getElementById('qrModal');
const qrImage = document.getElementById('qrImage');
document.querySelectorAll('.wallet .qr').forEach((button) => {
  button.addEventListener('click', () => {
    qrImage.src = button.dataset.qr;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  });
});
document.querySelector('.qr-close').addEventListener('click', closeQr);
modal.addEventListener('click', (e) => { if (e.target === modal) closeQr(); });
function closeQr() { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }

const navLinks = document.querySelectorAll('.bottom-nav a');
const sections = [...navLinks].map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
  });
}, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
sections.forEach(section => observer.observe(section));

// Soft card tilt on desktop
if (matchMedia('(hover:hover)').matches) {
  document.querySelectorAll('[data-tilt], .social-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - .5) * 6;
      const y = ((e.clientY - r.top) / r.height - .5) * -6;
      card.style.transform = `translateY(-3px) rotateX(${y}deg) rotateY(${x}deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

// Electric logo easter egg
const logoButton = document.getElementById('logoButton');
const flash = document.getElementById('screenFlash');
const easter = document.getElementById('easter');
let taps = 0, tapTimer;
function electricBurst() {
  flash.classList.remove('show'); void flash.offsetWidth; flash.classList.add('show');
}
logoButton?.addEventListener('click', () => {
  electricBurst();
  taps += 1;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => taps = 0, 900);
  if (taps >= 5) {
    taps = 0;
    easter.classList.add('show');
    if (navigator.vibrate) navigator.vibrate([40,40,80]);
    setTimeout(() => easter.classList.remove('show'), 1800);
  }
});
setInterval(electricBurst, 22000);

// Particles canvas
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let particles = [];
function resizeCanvas(){ canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); }
function initParticles(){
  const count = Math.min(90, Math.floor(innerWidth / 18));
  particles = Array.from({length:count}, () => ({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*2+0.6,vx:(Math.random()-.5)*0.22,vy:Math.random()*0.38+0.05,a:Math.random()*0.55+0.12}));
}
function drawParticles(){
  ctx.clearRect(0,0,innerWidth,innerHeight);
  for (const p of particles){
    p.x += p.vx; p.y += p.vy;
    if (p.y > innerHeight + 10) { p.y = -10; p.x = Math.random()*innerWidth; }
    if (p.x < -10) p.x = innerWidth + 10; if (p.x > innerWidth + 10) p.x = -10;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle = `rgba(56,220,255,${p.a})`; ctx.fill();
  }
  requestAnimationFrame(drawParticles);
}
resizeCanvas(); initParticles(); drawParticles();
addEventListener('resize', () => { resizeCanvas(); initParticles(); });
