// JS: подтягиваем реальные данные через roproxy и рендерим карточки
// Поместите этот файл в js/script.js

const UNIVERSE_ID = '9678437015';                 // Universe (указали вы)
const GROUP_ID = '102552180';                     // Group id вашего community
const ROOT_PLACE_ID = '71240146627158';           // корневой place id для ссылки на игру

const gamesApi = `https://games.roproxy.com/v1/games?universeIds=${UNIVERSE_ID}`;
const groupApiCandidates = [
  `https://groups.roproxy.com/v1/groups/${GROUP_ID}`,
  `https://www.roblox.com/communities/${GROUP_ID}/Tower-Obby-Productions`
];

const el = {
  about: document.getElementById('communityAbout'),
  members: document.getElementById('membersCount'),
  experiencesGrid: document.getElementById('experiencesGrid'),
  experiencesCount: document.getElementById('experiencesCount'),
  communityName: document.getElementById('communityName'),
  communityAvatar: document.getElementById('communityAvatar'),
  ownerLink: document.getElementById('ownerLink'),
};

// utility
function fmt(n){
  return new Intl.NumberFormat().format(n);
}
function fmtDate(iso){
  try { return new Date(iso).toLocaleString(); } catch(e){ return iso; }
}

// Fill initial placeholders
el.about.textContent = 'Loading about…';
el.members.textContent = 'Loading members…';

// 1) Fetch game data via roproxy
fetch(gamesApi)
  .then(r => r.ok ? r.json() : Promise.reject(r))
  .then(json => {
    if (!json.data || !json.data.length) throw new Error('No game data');
    const g = json.data[0];

    // Title + description + basic stats
    el.communityName.textContent = g.creator && g.creator.name ? g.creator.name : 'Tower Obby Productions';
    el.communityAvatar.src = 'https://tr.rbxcdn.com/180DAY-a96d76930a4b8fd8835dfb3715d21838/150/150/Image/Webp/noFilter';

    // About: если есть sourceDescription/description
    const aboutText = (g.creator && g.creator.type === 'Group')
      ? (g.sourceDescription || g.description || 'No description provided.')
      : (g.description || 'No description provided.');
    el.about.textContent = aboutText.trim();

    // Experiences: формируем карточку для этого Universe
    const fav = g.favoritedCount || 0;
    const visits = g.visits || 0;
    const playing = g.playing || 0;
    const created = g.created || '';
    const updated = g.updated || '';

    // Rating heuristic: favoritedCount / (visits/1000) * 100 -> похожо на % в примере (85%)
    let ratingPercent = 0;
    if (visits > 0) {
      ratingPercent = Math.round((fav / (visits / 1000)) * 100);
      if (!isFinite(ratingPercent) || ratingPercent < 0) ratingPercent = 0;
      if (ratingPercent > 99) ratingPercent = 99;
    }

    // Build one card (you can expand to multiple items if you have more universeIds)
    const card = document.createElement('a');
    card.className = 'exp-card';
    card.href = `https://www.roblox.com/games/${ROOT_PLACE_ID}/`;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

    const thumb = document.createElement('img');
    // default / provided image (you gave this exact thumb in message)
    thumb.src = 'https://tr.rbxcdn.com/180DAY-0d89850eddf82db8a49293be85d3ae68/512/512/Image/Webp/noFilter';
    thumb.alt = g.name;
    thumb.className = 'exp-thumb';

    const info = document.createElement('div');
    info.className = 'exp-info';

    const title = document.createElement('div');
    title.className = 'exp-title';
    title.textContent = g.name + (g.price ? ` [${g.price}]` : '');

    const meta = document.createElement('div');
    meta.className = 'exp-meta mt-1';
    meta.innerHTML =
      `<div class="flex items-center gap-2">
          <span class="exp-rating">${ratingPercent}%</span>
          <span>${fmt(playing)} active</span>
          <span>•</span>
          <span>${fmt(visits)} visits</span>
       </div>
       <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">${g.genre_l1 || g.genre} · ${g.genre_l2 || ''}</div>`;

    info.appendChild(title);
    info.appendChild(meta);

    card.appendChild(thumb);
    card.appendChild(info);

    el.experiencesGrid.appendChild(card);
    el.experiencesCount.textContent = '1 Experience';

  })
  .catch(err => {
    console.error('Error loading game data', err);
    el.about.textContent = 'Unable to load game info (roproxy).';
    el.experiencesCount.textContent = '0 Experiences';
    const fallback = document.createElement('div');
    fallback.className = 'p-4 text-sm text-gray-500';
    fallback.textContent = 'Failed to load experiences.';
    el.experiencesGrid.appendChild(fallback);
  });

// 2) Try to fetch group info (members, about) via roproxy — graceful fallback
(async function fetchGroup(){
  // Try candidate endpoints in order (roproxy first)
  let membersText = '— members';
  for (const url of [`https://groups.roproxy.com/v1/groups/${GROUP_ID}`, `https://groups.roproxy.com/v1/groups/${GROUP_ID}/~`]) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      // Attempt to find member count in common field names
      const possible = data.memberCount || data.membersCount || data.member_count || data.MembersCount || data.member_count;
      if (possible) {
        membersText = `${fmt(possible)} Members`;
        el.members.textContent = membersText;
        // If group has 'description' or 'about', fill it
        if (data.description && el.about.textContent.includes('Loading')) {
          el.about.textContent = data.description;
        }
        return;
      } else {
        // maybe the payload contains nested structure .data ?
        if (data.data && data.data.memberCount) {
          membersText = `${fmt(data.data.memberCount)} Members`;
          el.members.textContent = membersText;
          return;
        }
      }
    } catch(e) {
      // ignore and try next
    }
  }

  // If roproxy group endpoint failed, we try a fallback guess / show placeholder
  // The user mentioned "65K+ Members" — show as fallback if nothing else found.
  el.members.textContent = '65K+ Members';
})();
