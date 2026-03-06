// Конфигурация
const CONFIG = {
    UNIVERSE_ID: '9678437015',
    API_URL: 'https://games.roproxy.com/v1/games?universeIds=9678437015',
    CACHE_KEY: 'roblox_game_data',
    CACHE_DURATION: 300000, // 5 минут
    AUTO_SLIDE_INTERVAL: 5000 // 5 секунд
};

// Состояние приложения
let currentLang = 'en';
let currentSlide = 0;
let autoSlideInterval;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLanguage();
    fetchGameData();
    setupEventListeners();
    initAutoSlide();
});

// ========== ТЕМА ==========
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) themeBtn.textContent = '☀️';
    }
}

function toggleTheme() {
    const html = document.documentElement;
    const themeButton = document.getElementById('themeToggle');

    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        themeButton.textContent = '☀️';
        localStorage.setItem('theme', 'light');
    } else {
        html.classList.add('dark');
        themeButton.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
    }
}

// ========== ЯЗЫК ==========
function initLanguage() {
    const savedLang = localStorage.getItem('language') || 'en';
    currentLang = savedLang;
    updateLanguage();
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ru' : 'en';
    localStorage.setItem('language', currentLang);
    updateLanguage();
}

function updateLanguage() {
    const langButton = document.getElementById('langToggle');
    if (langButton) langButton.textContent = currentLang === 'en' ? 'RU' : 'EN';

    document.querySelectorAll('[data-lang-en]').forEach(el => {
        const text = el.getAttribute(`data-lang-${currentLang}`);
        if (text) el.textContent = text;
    });
}

// ========== СЛАЙДЕР ==========
function changeSlide(direction) {
    const wrapper = document.getElementById('sliderWrapper');
    if (!wrapper) return;

    const totalSlides = wrapper.children.length;
    if (totalSlides === 0) return;

    currentSlide = (currentSlide + direction + totalSlides) % totalSlides;
    wrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
}

function initAutoSlide() {
    if (autoSlideInterval) clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(() => changeSlide(1), CONFIG.AUTO_SLIDE_INTERVAL);
}

function setupSliderHover() {
    const slider = document.querySelector('.slider-container');
    if (slider) {
        slider.addEventListener('mouseenter', () => clearInterval(autoSlideInterval));
        slider.addEventListener('mouseleave', () => initAutoSlide());
    }
}

// ========== FETCH ==========
async function fetchGameData() {
    try {
        showLoadingState();
        const cached = getCache();
        if (cached) {
            updateUI(cached);
            hideLoadingState();
            return;
        }

        const response = await fetch(CONFIG.API_URL);
        if (!response.ok) throw new Error('Failed to fetch game data');

        const data = await response.json();
        if (data.data && data.data.length > 0) {
            const gameData = data.data[0];
            setCache(gameData);
            updateUI(gameData);
        }
        hideLoadingState();
    } catch (error) {
        console.error('Error fetching game data:', error);
        handleFetchError(error);
    }
}

function showLoadingState() {
    document.querySelectorAll('.stat-card').forEach(el => el.classList.add('loading'));
}

function hideLoadingState() {
    document.querySelectorAll('.stat-card').forEach(el => el.classList.remove('loading'));
}

function handleFetchError(error) {
    const titleEl = document.getElementById('gameTitle');
    const descEl = document.getElementById('gameDescription');
    if (titleEl) titleEl.textContent = 'Error loading game data';
    if (descEl) descEl.textContent = currentLang === 'en' ? 'Failed to load game data. Please try again later.' : 'Не удалось загрузить данные игры. Пожалуйста, попробуйте позже.';
}

// ========== КЭШ ==========
function getCache() {
    try {
        const cached = localStorage.getItem(CONFIG.CACHE_KEY);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CONFIG.CACHE_DURATION) return data;
        localStorage.removeItem(CONFIG.CACHE_KEY);
        return null;
    } catch (error) {
        console.error('Cache read error:', error);
        return null;
    }
}

function setCache(data) {
    try {
        localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (error) {
        console.error('Cache write error:', error);
    }
}

// ========== UPDATE UI ==========
function updateUI(gameData) {
    // Title & description
    const title = document.getElementById('gameTitle');
    if (title) title.textContent = gameData.name || 'Roblox Game';
    document.title = `${gameData.name || 'Roblox Game'} - Play Online`;

    const desc = document.getElementById('gameDescription');
    if (desc) desc.textContent = gameData.description || 'No description available.';

    // Stats
    const active = document.getElementById('activePlayers');
    if (active) active.textContent = formatNumber(gameData.playing || 0);

    const fav = document.getElementById('favorites');
    if (fav) fav.textContent = formatNumber(gameData.favoritedCount || gameData.favorites || 0);

    const visits = document.getElementById('visits');
    if (visits) visits.textContent = formatNumber(gameData.visits || 0);

    const serverSize = document.getElementById('serverSize');
    if (serverSize) serverSize.textContent = gameData.maxPlayers || gameData.serverSize || '38';

    // Dates
    const created = document.getElementById('created');
    if (created) created.textContent = formatDate(gameData.created || gameData.createdAt || gameData.createdTime);

    const updated = document.getElementById('updated');
    if (updated) updated.textContent = formatDate(gameData.updated || gameData.updatedAt || gameData.updatedTime);

    // Genre & Subgenre: fallback if API returns 'All' or empty
    let genreVal = (gameData.genre || gameData.genreName || '').toString();
    if (!genreVal || genreVal.trim().toLowerCase() === 'all') genreVal = 'Obby & Platformer';
    const genreEl = document.getElementById('genre');
    if (genreEl) genreEl.textContent = genreVal;

    // Subgenre specifically: check subgenre fields, fallback to 'Tower Obby'
    let subgenreVal = (gameData.subGenre || gameData.subgenre || gameData.subGenreName || '').toString();
    if (!subgenreVal || subgenreVal.trim().toLowerCase() === 'all') subgenreVal = 'Tower Obby';
    const subgenreEl = document.getElementById('subgenre');
    if (subgenreEl) subgenreEl.textContent = subgenreVal;

    // Play link
    if (gameData.rootPlaceId) {
        const playLink = document.getElementById('playLink');
        if (playLink) playLink.href = `https://www.roblox.com/games/${gameData.rootPlaceId}/`;
    }

    // Owner: set text + link (force to requested owner)
    const ownerLink = document.getElementById('ownerLink');
    if (ownerLink) {
        ownerLink.textContent = 'Tower Obby Productions';
        ownerLink.href = 'https://towerobbyproductions.github.io/communities/102552180/Tower-Obby-Productions/';
    }

    // Maturity with fallback
    const maturityText = detectMaturity(gameData);
    const matEl = document.getElementById('maturity');
    if (matEl) matEl.innerHTML = `<span class="maturity-badge">${maturityText}</span>`;

    // Images: try API fields then fallback list (include your image3)
    const defaultImages = [
        'https://tr.rbxcdn.com/180DAY-ac99810b043fcc8b90d47a062764b279/768/432/Image/Webp/noFilter?auto=compress&cs=tinysrgb&w=1200',
        'https://tr.rbxcdn.com/180DAY-0319103f58ead123c482d498a9ad2494/768/432/Image/Webp/noFilter?auto=compress&cs=tinysrgb&w=1200',
        'https://tr.rbxcdn.com/180DAY-0ea63b43b51f872ed2a3f00272ab3285/768/432/Image/Webp/noFilter' // Ваша картинка 3
    ];

    let images = [];

    // Возможные поля в ответе API
    if (Array.isArray(gameData.images) && gameData.images.length) {
        images = gameData.images.map(i => i && (i.url || i.imageUrl || i) ).filter(Boolean);
    } else if (Array.isArray(gameData.thumbnailUrls) && gameData.thumbnailUrls.length) {
        images = gameData.thumbnailUrls.slice();
    } else if (gameData.coverImageUrl) {
        images = [gameData.coverImageUrl];
    } else if (gameData.thumbnailUrl) {
        images = [gameData.thumbnailUrl];
    }

    // Merge unique, keep defaults as fallback
    images = [...new Set([...images, ...defaultImages])].slice(0, 6);

    renderSliderImages(images);

    // update meta tags (og/twitter) with primary image
    updateMetaTags(gameData, images[0]);
}

function detectMaturity(gameData) {
    const candidates = [
        gameData.maturity,
        gameData.maturityRating,
        gameData.maturityRatingName,
        (gameData.ageClassification && gameData.ageClassification.classification),
        gameData.minimumAgeRequirement,
        gameData.ageRating,
        (gameData.isAdult ? 'Adult' : null)
    ];
    for (const c of candidates) {
        if (c !== undefined && c !== null && String(c).trim() !== '') return String(c);
    }
    return 'Minimal';
}

function renderSliderImages(images) {
    const wrapper = document.getElementById('sliderWrapper');
    if (!wrapper) return;
    wrapper.innerHTML = images.map((src, idx) => {
        // add classes for responsive height if needed
        return `<img src="${src}" loading="lazy" alt="Screenshot ${idx + 1}" class="slider-image" />`;
    }).join('');
    currentSlide = 0;
    wrapper.style.transform = 'translateX(0%)';
}

// Update meta tags where possible
function updateMetaTags(gameData, image) {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${gameData.name || 'Roblox Game'} - Play Online`);
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', (gameData.description || 'Play this exciting Roblox game online').substring(0, 160));
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && image) ogImage.setAttribute('content', image);
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage && image) twitterImage.setAttribute('content', image);
}

// ========== УТИЛИТЫ ==========
function formatNumber(num) {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    } catch (error) {
        console.error('Date formatting error:', error);
        return 'N/A';
    }
}

document.getElementById("year").textContent = new Date().getFullYear();

// ========== EVENTS ==========
function setupEventListeners() {
    const themeToggle = document.getElementById('themeToggle');
    const langToggle = document.getElementById('langToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (langToggle) langToggle.addEventListener('click', toggleLanguage);
    setupSliderHover();
}

// Экспортируем функции для глобального доступа (для onclick в HTML)

window.changeSlide = changeSlide;

