// Paziņojuma josla — aizver līdz lapas pārlādei (nekas netiek saglabāts)
const pazinojums = document.getElementById('pazinojums');
pazinojums?.querySelector('.p-aizv').addEventListener('click', () => pazinojums.classList.add('paslepts'));

// Galvenes fons ritinot
const galvene = document.getElementById('galvene');
const atjaunoGalveni = () => galvene.classList.toggle('ritinats', scrollY > 30);
addEventListener('scroll', atjaunoGalveni, {passive:true}); atjaunoGalveni();

// Mobilā izvēlne
const burgers = document.getElementById('burgers');
const izvelne = document.getElementById('izvelne');
burgers.addEventListener('click', () => {
  const atverta = izvelne.classList.toggle('atverta');
  burgers.setAttribute('aria-expanded', atverta);
});
izvelne.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  izvelne.classList.remove('atverta'); burgers.setAttribute('aria-expanded', false);
}));

// Parādīšanās ritinot
const novērotājs = new IntersectionObserver(ieraksti => {
  ieraksti.forEach(e => { if (e.isIntersecting) { e.target.classList.add('redzams'); novērotājs.unobserve(e.target); } });
}, {threshold:.12});
document.querySelectorAll('.paradit').forEach(el => novērotājs.observe(el));

// Kategoriju cilnes
const cilnes = document.querySelectorAll('.cilne');
cilnes.forEach(c => c.addEventListener('click', () => {
  cilnes.forEach(x => x.setAttribute('aria-selected', 'false'));
  document.querySelectorAll('.panelis').forEach(p => p.classList.remove('aktivs'));
  c.setAttribute('aria-selected', 'true');
  document.getElementById(c.getAttribute('aria-controls')).classList.add('aktivs');
}));

// Transportlīdzekļu filtrs
const filtri = document.querySelectorAll('.filtrs');
filtri.forEach(f => f.addEventListener('click', () => {
  filtri.forEach(x => x.setAttribute('aria-pressed', 'false'));
  f.setAttribute('aria-pressed', 'true');
  const izvele = f.dataset.filtrs;
  document.querySelectorAll('.tl').forEach(t => {
    t.classList.toggle('paslepts', izvele !== 'visi' && t.dataset.kat !== izvele);
  });
}));

// Palīgfunkcija: atrod bildes pēc kārtas (vards-1, vards-2, ...)
// Der .jpg, .jpeg, .png, .webp — arī ar lielajiem burtiem
const PAPLASINAJUMI = ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'JPEG', 'PNG', 'WEBP'];
function ieladet(src) {
  return new Promise(ok => {
    const i = new Image();
    i.onload = () => ok(src); i.onerror = () => ok(null); i.src = src;
  });
}
async function atrastVienu(bez) {
  const r = await Promise.all(PAPLASINAJUMI.map(p => ieladet(`${bez}.${p}`)));
  return r.find(Boolean) || null;
}
async function atrastBildes(sakums, max = 40) {
  const atrastas = [];
  for (let n = 1; n <= max; n++) {
    const src = await atrastVienu(`${sakums}${n}`);
    if (!src) break;          // apstājas pie pirmā trūkstošā numura
    atrastas.push(src);
  }
  return atrastas;
}

// ===== Transportlīdzekļa bildes =====
// 1) data-mape="KTM_390_Duke"  -> bildes no mapes pictures/KTM_390_Duke/
//    (nosaukumi var būt jebkādi, ja serveris rāda mapes saturu; citādi 1.jpg, 2.jpg, ...)
// 2) data-bildes="a.jpg, b.jpg" -> tieši šie faili (no mapes, ja data-mape ir norādīta)
// 3) nekas no augšējā           -> pictures/<data-foto>-1.jpg, -2.jpg, ...
const BILDES_RE = /\.(jpe?g|png|webp)$/i;

async function mapesSaturs(mape) {
  try {
    const r = await fetch(mape);
    if (!r.ok) return [];
    const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
    const bazes = new URL(mape, location.href);
    const saites = [...doc.querySelectorAll('a[href]')]
      .map(a => new URL(a.getAttribute('href'), bazes).href)
      .filter(h => BILDES_RE.test(decodeURIComponent(h.split('?')[0])) && h.startsWith(bazes.href));
    return [...new Set(saites)].sort((a, b) => a.localeCompare(b, 'lv', {numeric: true}));
  } catch { return []; }
}

function kartitesBildes(k) {
  if (k._bildes) return k._bildes;               // atceras, lai nemeklē atkārtoti
  const mape = k.dataset.mape ? `pictures/${k.dataset.mape.replace(/\/$/, '')}/` : null;
  const saraksts = (k.dataset.bildes || '').split(',').map(s => s.trim()).filter(Boolean);
  k._bildes = (async () => {
    if (saraksts.length) return saraksts.map(s => (mape || 'pictures/') + s);
    if (mape) {
      const no_mapes = await mapesSaturs(mape);
      if (no_mapes.length) return no_mapes;
      return atrastBildes(mape);                  // 1.jpg, 2.jpg, ... mapē
    }
    return atrastBildes(`pictures/${k.dataset.foto}-`);
  })();
  return k._bildes;
}

// Kartītē parāda pirmo bildi
document.querySelectorAll('.tl[data-foto]').forEach(async k => {
  const bildes = await kartitesBildes(k);
  if (!bildes.length) return;
  let img = k.querySelector('.tl-bilde img');
  if (!img) {
    img = document.createElement('img');
    img.alt = k.querySelector('h3').textContent;
    k.querySelector('.tl-bilde').appendChild(img);
  }
  img.src = bildes[0];
});

// ===== Galerijas lapa: bildes ielādējas automātiski =====
const galRezgis = document.getElementById('galerija-rezgis');
if (galRezgis) {
  atrastBildes('pictures/galerija-', 80).then(bildes => {
    document.getElementById('gal-tukss').hidden = bildes.length > 0;
    bildes.forEach((src, i) => {
      const b = document.createElement('button');
      b.className = 'gal'; b.type = 'button';
      b.setAttribute('aria-label', `Palielināt ${i + 1}. foto`);
      b.innerHTML = `<img src="${src}" alt="" loading="lazy">`;
      galRezgis.appendChild(b);
    });
  });
}
const lb = document.getElementById('lightbox');
if (lb) {
  const lbImg = lb.querySelector('img');
  document.addEventListener('click', e => {
    const g = e.target.closest('.gal');
    if (g && g.querySelector('img')) { lbImg.src = g.querySelector('img').src; lb.classList.add('atverts'); }
  });
  lb.addEventListener('click', () => lb.classList.remove('atverts'));
  addEventListener('keydown', e => { if (e.key === 'Escape') lb.classList.remove('atverts'); });
}

// ===== Transportlīdzekļu foto logs =====
const fl = document.getElementById('foto-logs');
if (fl) {
  const flImg = document.getElementById('fl-img');
  const flSk = fl.querySelector('.fl-skaits');
  const flSikb = fl.querySelector('.fl-sikbildes');
  const flTukss = fl.querySelector('.fl-tukss');
  let bildes = [], nr = 0, pedejaKartite = null;

  function radit(i) {
    if (!bildes.length) return;
    nr = (i + bildes.length) % bildes.length;
    flImg.src = bildes[nr];
    flSk.textContent = `${nr + 1} / ${bildes.length}`;
    [...flSikb.children].forEach((s, k) => s.setAttribute('aria-current', k === nr));
    flSikb.children[nr]?.scrollIntoView({block:'nearest', inline:'center', behavior:'smooth'});
  }

  function atvert(kartite) {
    pedejaKartite = kartite;
    document.getElementById('fl-kat').textContent = kartite.querySelector('.tl-kat').textContent;
    document.getElementById('fl-virs').textContent = kartite.querySelector('h3').textContent;
    document.getElementById('fl-apr').textContent = kartite.querySelector('.tl-info p').textContent;
    flImg.removeAttribute('src'); flSikb.innerHTML = ''; flSk.textContent = '';
    fl.hidden = false; document.body.style.overflow = 'hidden';
    fl.querySelector('.fl-aizv').focus();

    kartitesBildes(kartite).then(atrastas => {
      const kartitesBilde = kartite.querySelector('.tl-bilde img');
      if (!atrastas.length && kartitesBilde?.naturalWidth) atrastas = [kartitesBilde.src];
      bildes = atrastas;
      flTukss.hidden = bildes.length > 0;
      flImg.hidden = !bildes.length;
      fl.classList.toggle('viena', bildes.length < 2);
      bildes.forEach((src, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.setAttribute('aria-label', `${i + 1}. bilde`);
        b.innerHTML = `<img src="${src}" alt="">`;
        b.addEventListener('click', () => radit(i));
        flSikb.appendChild(b);
      });
      radit(0);
    });
  }
  function aizvert() {
    fl.hidden = true; document.body.style.overflow = '';
    pedejaKartite?.focus();
  }

  document.querySelectorAll('.tl[data-foto]').forEach(k => {
    k.tabIndex = 0; k.setAttribute('role', 'button');
    k.setAttribute('aria-label', `Skatīt bildes: ${k.querySelector('h3').textContent}`);
    k.querySelector('.tl-info').insertAdjacentHTML('beforeend',
      '<span class="tl-skatit"><i class="fa-regular fa-images"></i> Skatīt bildes</span>');
    k.addEventListener('click', () => atvert(k));
    k.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); atvert(k); } });
  });

  fl.querySelector('.fl-aizv').addEventListener('click', aizvert);
  fl.querySelector('.fl-iepr').addEventListener('click', () => radit(nr - 1));
  fl.querySelector('.fl-nak').addEventListener('click', () => radit(nr + 1));
  fl.addEventListener('click', e => { if (e.target === fl) aizvert(); });
  addEventListener('keydown', e => {
    if (fl.hidden) return;
    if (e.key === 'Escape') aizvert();
    if (e.key === 'ArrowLeft') radit(nr - 1);
    if (e.key === 'ArrowRight') radit(nr + 1);
  });
  // telefonā var pavilkt ar pirkstu
  let sakX = null;
  fl.querySelector('.fl-skats').addEventListener('touchstart', e => sakX = e.touches[0].clientX, {passive:true});
  fl.querySelector('.fl-skats').addEventListener('touchend', e => {
    if (sakX === null) return;
    const d = e.changedTouches[0].clientX - sakX;
    if (Math.abs(d) > 40) radit(nr + (d < 0 ? 1 : -1));
    sakX = null;
  });
}

// Video slaidrādis ar pārklāju
const vs = document.getElementById('video-slaideris');
if (vs) {
  const slaidi = [...vs.querySelectorAll('.vs-slaids')];
  const punkti = vs.querySelector('.vs-punkti');
  let nr = 0;

  slaidi.forEach((s, i) => {
    const v = s.querySelector('video');
    // pārklājs pazūd, kad spēlē, un parādās pauzē vai beigās
    const logs = vs.querySelector('.vs-logs');
    v.addEventListener('play',  () => { s.classList.add('spele'); logs.classList.add('spele'); });
    v.addEventListener('pause', () => { s.classList.remove('spele'); logs.classList.remove('spele'); });
    v.addEventListener('ended', () => { s.classList.remove('spele'); vs.querySelector('.vs-logs').classList.remove('spele'); radit(nr + 1); });
    s.querySelector('.vs-parklajs').addEventListener('click', () => v.play());

    const p = document.createElement('button');
    p.type = 'button'; p.setAttribute('aria-label', `${i + 1}. video`);
    p.addEventListener('click', () => radit(i));
    punkti.appendChild(p);
  });

  function radit(i) {
    slaidi[nr].querySelector('video').pause();
    nr = (i + slaidi.length) % slaidi.length;
    slaidi.forEach((s, k) => s.classList.toggle('aktivs', k === nr));
    [...punkti.children].forEach((p, k) => p.setAttribute('aria-current', k === nr));
  }
  vs.querySelector('.vs-iepr').addEventListener('click', () => radit(nr - 1));
  vs.querySelector('.vs-nak').addEventListener('click', () => radit(nr + 1));
  radit(0);
}

document.getElementById('gads').textContent = new Date().getFullYear();