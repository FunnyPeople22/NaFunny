/* NaFunny HUB — Latest YouTube renderer */
(() => {
  const title=document.getElementById('youtubeLatestTitle'), meta=document.getElementById('youtubeLatestMeta'), link=document.getElementById('youtubeLatestLink'), thumbLink=document.getElementById('youtubeLatestThumbLink'), thumb=document.getElementById('youtubeLatestThumb');
  if(!title||!meta||!link||!thumbLink||!thumb)return;
  const fallback='https://www.youtube.com/@nafunny22';
  const formatDate=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',year:'numeric'}).format(d)};
  fetch(`feed/youtube-latest.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error();return r.json()}).then(data=>{
    if(!data?.video?.id)throw new Error(); const v=data.video, url=v.url||`https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`;
    title.textContent=v.title||'Latest NaFunny video'; meta.textContent=[formatDate(v.published),'@nafunny22'].filter(Boolean).join(' • '); link.href=url; thumbLink.href=url;
    if(v.thumbnail){thumb.src=v.thumbnail;thumbLink.classList.add('ready')}
  }).catch(()=>{title.textContent='Videos & Highlights';meta.textContent='@nafunny22 • YouTube';link.href=fallback;thumbLink.href=fallback});
})();
