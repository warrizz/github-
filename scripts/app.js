const $ = (s,ctx=document)=>ctx.querySelector(s);
const $$ = (s,ctx=document)=>Array.from(ctx.querySelectorAll(s));

async function loadData(){
  const res = await fetch('/data/portfolio.json', { cache: 'no-store' });
  if(!res.ok) throw new Error('Failed to load portfolio.json');
  return res.json();
}

function applyTheme(pref){
  const root = document.documentElement;
  if(pref === 'light') root.classList.add('light'); else root.classList.remove('light');
  localStorage.setItem('theme', pref);
  $('#themeToggle').textContent = pref === 'light' ? '🌞' : '🌙';
}

function initTheme(){
  const stored = localStorage.getItem('theme');
  if(stored){ applyTheme(stored); return; }
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(prefersLight ? 'light' : 'dark');
}

function renderHeader(profile){
  $('#brandName').textContent = profile.name;
  $('#headline').textContent = profile.headline;
  $('#bio').textContent = profile.bio;
  $('#avatar').src = profile.avatar || '';
  $('#primaryCta').href = '#projects';
  $('#secondaryCta').href = '#contact';

  const socials = $('#socialLinks');
  socials.innerHTML = '';
  (profile.links || []).forEach(link => {
    const a = document.createElement('a');
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = link.label;
    socials.appendChild(a);
  });
}

function uniqueTags(projects){
  const set = new Set();
  projects.forEach(p => (p.tags || []).forEach(t => set.add(t)));
  return Array.from(set).sort((a,b)=>a.localeCompare(b));
}

function renderTagFilters(tags){
  const el = $('#tagFilters');
  el.innerHTML = '';
  tags.forEach(tag => {
    const b = document.createElement('button');
    b.className = 'tag';
    b.textContent = tag;
    b.dataset.tag = tag;
    el.appendChild(b);
  });
}

function renderProjects(projects){
  const grid = $('#projectsGrid');
  grid.innerHTML = '';
  projects.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="thumb">${p.thumbnail ? '' : 'No image'}</div>
      <div class="body">
        <h3>${p.title}</h3>
        <p>${p.summary || ''}</p>
        <div class="meta"></div>
      </div>
      <div class="actions">
        ${p.demo ? `<a class="button" target="_blank" rel="noopener" href="${p.demo}">Live</a>` : ''}
        ${p.repo ? `<a class="button" target="_blank" rel="noopener" href="${p.repo}">Code</a>` : ''}
        ${p.caseStudy ? `<a class="button primary" target="_blank" rel="noopener" href="${p.caseStudy}">Case Study</a>` : ''}
      </div>`;
    if(p.thumbnail){
      const th = card.querySelector('.thumb');
      th.style.backgroundImage = `url(${p.thumbnail})`;
      th.style.backgroundSize = 'cover';
      th.style.backgroundPosition = 'center';
    }
    const meta = card.querySelector('.meta');
    if(p.tags){
      p.tags.forEach(t => {
        const tag = document.createElement('span');
        tag.className = 'badge';
        tag.textContent = t;
        meta.appendChild(tag);
      });
    }
    if(typeof p.stars === 'number'){
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = `★ ${p.stars}`;
      meta.appendChild(badge);
    }
    grid.appendChild(card);
  });
}

function renderAchievements(items){
  const list = $('#achievementsList');
  list.innerHTML = '';
  items.forEach(a => {
    const li = document.createElement('li');
    li.innerHTML = `<div class="date">${a.date || ''}</div><div>${a.title}</div><div class="muted">${a.description || ''}</div>`;
    list.appendChild(li);
  });
}

function renderContact(contact){
  const email = $('#contactEmail');
  email.textContent = contact.email;
  email.href = `mailto:${contact.email}`;
  $('#contactLocation').textContent = contact.location || '';
  const links = $('#contactLinks');
  links.innerHTML = '';
  (contact.links||[]).forEach(l => {
    const a = document.createElement('a');
    a.href = l.url; a.target = '_blank'; a.rel='noopener'; a.textContent = l.label;
    links.appendChild(a);
  });
}

function computeVisibleProjects(projects, state){
  let list = [...projects];
  if(state.search){
    const q = state.search.toLowerCase();
    list = list.filter(p =>
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.summary && p.summary.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some(t=>t.toLowerCase().includes(q)))
    );
  }
  if(state.tags.size > 0){
    list = list.filter(p => (p.tags||[]).some(t => state.tags.has(t)));
  }
  if(state.sort === 'alpha'){
    list.sort((a,b)=>a.title.localeCompare(b.title));
  } else if(state.sort === 'stars'){
    list.sort((a,b)=>(b.stars||0)-(a.stars||0));
  } else {
    list.sort((a,b)=> new Date(b.date||0) - new Date(a.date||0));
  }
  return list;
}

function initInteractions(projects){
  const state = { search:'', tags:new Set(), sort:'recent' };

  $('#searchInput').addEventListener('input', (e)=>{
    state.search = e.target.value;
    renderProjects(computeVisibleProjects(projects, state));
  });

  $('#sortSelect').addEventListener('change', (e)=>{
    state.sort = e.target.value;
    renderProjects(computeVisibleProjects(projects, state));
  });

  $('#tagFilters').addEventListener('click', (e)=>{
    const btn = e.target.closest('.tag');
    if(!btn) return;
    const tag = btn.dataset.tag;
    if(state.tags.has(tag)) state.tags.delete(tag); else state.tags.add(tag);
    $$('.tag', $('#tagFilters')).forEach(b=>{
      b.classList.toggle('active', state.tags.has(b.dataset.tag));
    });
    renderProjects(computeVisibleProjects(projects, state));
  });

  $('#themeToggle').addEventListener('click', ()=>{
    const next = document.documentElement.classList.contains('light') ? 'dark' : 'light';
    applyTheme(next);
  });
}

async function main(){
  initTheme();
  $('#year').textContent = new Date().getFullYear();
  try{
    const data = await loadData();
    renderHeader(data.profile);
    renderTagFilters(uniqueTags(data.projects||[]));
    renderProjects(computeVisibleProjects(data.projects||[], { search:'', tags:new Set(), sort:'recent' }));
    renderAchievements(data.achievements||[]);
    renderContact(data.contact||{});
    initInteractions(data.projects||[]);
  }catch(err){
    console.error(err);
    $('#projectsGrid').innerHTML = '<div class="muted">Failed to load data.</div>';
  }
}

main();
