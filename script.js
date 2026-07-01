const toast = document.getElementById('toast');
function showToast(text = 'Copied') {
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}

document.querySelectorAll('.wallet .copy').forEach((button) => {
  button.addEventListener('click', async () => {
    const address = button.closest('.wallet').dataset.address;
    try {
      await navigator.clipboard.writeText(address);
      showToast('Address copied');
      button.textContent = 'Copied';
      setTimeout(() => (button.textContent = 'Copy'), 1200);
    } catch (e) {
      showToast('Copy manually');
    }
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
function closeQr() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

const navLinks = document.querySelectorAll('.bottom-nav a');
const sections = [...navLinks].map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
    }
  });
}, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
sections.forEach(section => observer.observe(section));

window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('bootScreen')?.classList.add('hide'), 650);
});

const canvas = document.getElementById('fxCanvas');
const ctx = canvas.getContext('2d');
let w = 0, h = 0, particles = [], bolts = [];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = canvas.width = Math.floor(innerWidth * dpr);
  h = canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const count = Math.min(90, Math.floor(innerWidth / 10));
  particles = Array.from({length: count}, () => ({
    x: Math.random()*innerWidth, y: Math.random()*innerHeight,
    r: Math.random()*1.8+.5, s: Math.random()*0.35+.12, a: Math.random()*0.55+.12
  }));
}
function makeBolt() {
  const startX = Math.random() * innerWidth;
  const endX = startX + (Math.random() * 360 - 180);
  const y = Math.random() * innerHeight * .62 + 40;
  const points = [];
  const steps = 9 + Math.floor(Math.random()*6);
  for (let i=0;i<=steps;i++) {
    const t = i / steps;
    points.push({ x: startX + (endX-startX)*t + (Math.random()-.5)*44, y: y + t*(Math.random()*220+80) + (Math.random()-.5)*34 });
  }
  bolts.push({ points, life: 1 });
}
let lastBolt = 0;
function draw(now=0) {
  if (reduced) return;
  ctx.clearRect(0,0,innerWidth,innerHeight);
  particles.forEach(p => {
    p.y -= p.s; p.x += Math.sin((now/1000)+p.y*.01)*.15;
    if (p.y < -10) { p.y = innerHeight + 10; p.x = Math.random()*innerWidth; }
    ctx.beginPath();
    ctx.fillStyle = `rgba(71, 216, 255, ${p.a})`;
    ctx.shadowColor = '#22e6ff'; ctx.shadowBlur = 8;
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
  });
  if (now - lastBolt > 4200 + Math.random()*4600) { makeBolt(); lastBolt = now; }
  bolts.forEach(b => {
    ctx.save(); ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.shadowColor = '#22e6ff'; ctx.shadowBlur = 24;
    ctx.strokeStyle = `rgba(255,255,255,${b.life})`;
    ctx.beginPath(); b.points.forEach((p,i)=> i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y)); ctx.stroke();
    ctx.lineWidth = 5; ctx.strokeStyle = `rgba(34,230,255,${b.life*.35})`; ctx.stroke(); ctx.restore();
    b.life -= .035;
  });
  bolts = bolts.filter(b => b.life > 0);
  requestAnimationFrame(draw);
}
resize();
window.addEventListener('resize', resize);
if (!reduced) requestAnimationFrame(draw);
