// JS: подтягиваем реальные данные через roproxy и рендерим карточки
// Поместите в js/script.js (заменяет предыдущую версию)

const UNIVERSE_ID = '9678437015';
const GROUP_ID = '102552180';
const ROOT_PLACE_ID = '71240146627158';

const gamesApi = `https://games.roproxy.com/v1/games?universeIds=${UNIVERSE_ID}`;

const el = {
  about: document.getElementById('communityAbout'),
  members: document.getElementById('membersCount'),
  experiencesGrid: document.getElementById('experiencesGrid'),
  experiencesCount: document.getElementById('experiencesCount'),
  communityName: document.getElementById('communityName'),
  communityAvatar: document.getElementById('communityAvatar'),
  ownerLink: document.getElementById('ownerLink'),
  themeToggle: document.getElementById('themeToggle'),
  langToggle: document.getElementById('langToggle'),
  viewOnRoblox: document.getElementById('viewOnRoblox')
};

// Language dictionary (extend as needed)
const I18N = {
  en: {
    by: 'By',
    view_roblox: 'View Community in Roblox',
    about: 'About',
    experiences: 'Experiences',
    members_suffix: 'Members',
    loading_about: 'Loading about…',
    experience_singular: '1 Experience',
    experience_plural: (n) => `${n} Experiences`,
    active_suffix: 'active',
    visits_suffix: 'visits'
  },
  ru: {
    by: 'Автор',
    view_roblox: 'Открыть сообщество в Roblox',
    about: 'О нас',
    experiences: 'Игры',
    members_suffix: 'участников',
    loading_about: 'Загрузка описания…',
    experience_singular: '1 игра',
    experience_plural: (n) => `${n} игр`,
    active_suffix: 'активных',
    visits_suffix: 'посещений'
  }
};

let currentLang = localStorage.getItem('siteLang') || window.__SITE_LANG || 'en';

// Apply static translations
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(elm => {
    const key = elm.getAttribute('data-i18n');
    if (I18N[currentLang] && I18N[currentLang][key]) {
      elm.textContent = I18N[currentLang][key];
    }
  });

  // Update dynamic buttons
  el.langToggle.textContent = currentLang.toUpperCase();
  el.viewOnRoblox.textContent = I18N[currentLang].view_roblox;
  // "By" label before owner link
  const bySpan = document.querySelector('[data-i18n="by"]');
  if (bySpan) bySpan.textContent = I18N[currentLang].by;
}
applyTranslations();

// Theme toggle logic (persist)
function getCurrentTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
function applyThemeButton() {
  el.themeToggle.textContent = getCurrentTheme() === 'dark' ? '🌙' : '☀️';
}
el.themeToggle.addEventListener('click', () => {
  const now = getCurrentTheme() === 'dark' ? 'light' : 'dark';
  if (now === 'dark') document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  localStorage.setItem('theme', now);
  applyThemeButton();
});
applyThemeButton();

// Language toggle button
el.langToggle.addEventListener('click', () => {
  currentLang = currentLang === 'en' ? 'ru' : 'en';
  localStorage.setItem('siteLang', currentLang);
  document.documentElement.lang = currentLang;
  applyTranslations();
});

// Utilities
function fmt(n){ return new Intl.NumberFormat().format(n); }

// Fill placeholders
el.about.textContent = I18N[currentLang].loading_about;
el.members.textContent = 'Loading…';

// Fetch game data and render
fetch(gamesApi)
  .then(r => r.ok ? r.json() : Promise.reject(r))
  .then(json => {
    if (!json.data || !json.data.length) throw new Error('No game data');
    const g = json.data[0];

    // Use provided values or fallbacks
    el.communityName.textContent = 'Tower Obby Productions';
    el.communityAvatar.src = 'https://tr.rbxcdn.com/180DAY-a96d76930a4b8fd8835dfb3715d21838/150/150/Image/Webp/noFilter';

    // About text (prefer group/creator description if present)
    const aboutText = g.sourceDescription || g.description || 'No description provided.';
    el.about.textContent = aboutText;

    // Build experience card
    const fav = g.favoritedCount || 0;
    const visits = g.visits || 0;
    const playing = g.playing || 0;

    let ratingPercent = 0;
    if (visits > 0) {
      ratingPercent = Math.round((fav / (visits / 1000)) * 100);
      if (!isFinite(ratingPercent) || ratingPercent < 0) ratingPercent = 0;
      if (ratingPercent > 99) ratingPercent = 99;
    }

    const card = document.createElement('a');
    card.className = 'exp-card';
    card.href = `https://www.roblox.com/games/${ROOT_PLACE_ID}/`;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

    const thumb = document.createElement('img');
    thumb.src = 'https://tr.rbxcdn.com/180DAY-0d89850eddf82db8a49293be85d3ae68/512/512/Image/Webp/noFilter';
    thumb.alt = g.name || 'Experience';
    thumb.className = 'exp-thumb';

    const info = document.createElement('div');
    info.className = 'exp-info';

    const title = document.createElement('div');
    // ensure title inherits color (so dark theme works)
    title.className = 'exp-title';
    // If price field exists on g, show price in bracket (Robux). Fallback: empty.
    const priceStr = (g.price && g.price > 0) ? ` [${g.price} Robux]` : (g.price === 0 ? ' [Free]' : '');
    title.textContent = (g.name || 'HD Admin Chaos Tower') + priceStr;

    const meta = document.createElement('div');
    meta.className = 'exp-meta mt-1';
    // build meta text with language-aware suffixes
    const activeText = `${fmt(playing)} ${I18N[currentLang].active_suffix}`;
    const visitsText = `${fmt(visits)} ${I18N[currentLang].visits_suffix}`;

    meta.innerHTML =
      `<div class="flex items-center gap-2">
          <span class="exp-rating">${ratingPercent}%</span>
          <span>${activeText}</span>
          <span>•</span>
          <span>${visitsText}</span>
       </div>
       <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">${g.genre_l1 || g.genre || ''} · ${g.genre_l2 || ''}</div>`;

    info.appendChild(title);
    info.appendChild(meta);

    card.appendChild(thumb);
    card.appendChild(info);

    el.experiencesGrid.appendChild(card);
    el.experiencesCount.textContent = I18N[currentLang].experience_singular;

  })
  .catch(err => {
    console.error('Error loading game data', err);
    el.about.textContent = 'Unable to load game info.';
    el.experiencesCount.textContent = '0';
    const fallback = document.createElement('div');
    fallback.className = 'p-4 text-sm text-gray-500';
    fallback.textContent = 'Failed to load experiences.';
    el.experiencesGrid.appendChild(fallback);
  });

// Try to fetch group data (best-effort); fallback to known "65K+ Members" if unavailable
(async function fetchGroup(){
  try {
    const res = await fetch(`https://groups.roproxy.com/v1/groups/${GROUP_ID}`);
    if (!res.ok) throw new Error('group fetch failed');
    const data = await res.json();
    // try common fields
    const members = data.memberCount || data.membersCount || (data.data && data.data.memberCount);
    const about = data.description || data.about;
    if (members) el.members.textContent = `${fmt(members)} ${I18N[currentLang].members_suffix}`;
    else el.members.textContent = '65K+ ' + I18N[currentLang].members_suffix;

    if (about && el.about.textContent.includes('Loading')) el.about.textContent = about;
  } catch(e) {
    el.members.textContent = '65K+ ' + I18N[currentLang].members_suffix;
  }
})();
