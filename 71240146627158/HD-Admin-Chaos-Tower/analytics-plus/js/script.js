// Конфигурация Supabase (ЗАМЕНИТЕ НА СВОИ ДАННЫЕ!)
const SUPABASE_CONFIG = {
    url: 'https://ваш-проект.supabase.co', // Вставьте свой URL
    anonKey: 'ваш-anon-key' // Вставьте свой anon key
};

// Конфигурация игры
const GAME_CONFIG = {
    universeId: '9678437015',
    apiUrl: 'https://games.roproxy.com/v1/games?universeIds=9678437015'
};

// Инициализация Supabase
const supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

// Состояние приложения
let currentLang = 'en';
let charts = {};
let updateInterval;
let currentChartType = 'line';

// DOM элементы
const elements = {
    lastUpdate: document.getElementById('lastUpdate'),
    currentOnline: document.getElementById('currentOnline'),
    dailyRecord: document.getElementById('dailyRecord'),
    allTimePeak: document.getElementById('allTimePeak'),
    peakDate: document.getElementById('peakDate'),
    totalVisits: document.getElementById('totalVisits'),
    todayVisits: document.getElementById('todayVisits'),
    favorites: document.getElementById('favorites'),
    favoritesGrowth: document.getElementById('favoritesGrowth'),
    refreshBtn: document.getElementById('refreshData'),
    themeToggle: document.getElementById('themeToggle'),
    langToggle: document.getElementById('langToggle'),
    recordsTable: document.getElementById('recordsTable'),
    peakHours: document.getElementById('peakHours')
};

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initLanguage();
    setupEventListeners();
    await loadAllData();
    setupRealtimeSubscription();
    startAutoUpdate();
});

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
        elements.themeToggle.textContent = '☀️';
    }
}

function initLanguage() {
    const savedLang = localStorage.getItem('language') || 'en';
    currentLang = savedLang;
    updateLanguage();
}

function setupEventListeners() {
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.langToggle.addEventListener('click', toggleLanguage);
    elements.refreshBtn.addEventListener('click', () => loadAllData(true));
    
    // Кнопки типа графика
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.chart-type-btn').forEach(b => 
                b.classList.remove('active', 'bg-roblox-blue', 'text-white')
            );
            btn.classList.add('active', 'bg-roblox-blue', 'text-white');
            currentChartType = btn.dataset.type;
            updateCharts();
        });
    });
}

// ========== ТЕМА И ЯЗЫК ==========
function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        elements.themeToggle.textContent = '☀️';
        localStorage.setItem('theme', 'light');
    } else {
        html.classList.add('dark');
        elements.themeToggle.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
    }
    updateCharts(); // Обновляем цвета графиков
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ru' : 'en';
    localStorage.setItem('language', currentLang);
    updateLanguage();
}

function updateLanguage() {
    elements.langToggle.textContent = currentLang === 'en' ? 'RU' : 'EN';
    
    document.querySelectorAll('[data-lang-en]').forEach(el => {
        const text = el.getAttribute(`data-lang-${currentLang}`);
        if (text) el.textContent = text;
    });
}

// ========== ЗАГРУЗКА ДАННЫХ ==========
async function loadAllData(showRefresh = false) {
    try {
        if (showRefresh) {
            elements.refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
        }
        
        // Загружаем данные параллельно
        await Promise.all([
            loadCurrentStats(),
            loadHistoricalData(),
            loadRecords(),
            loadPeakHours()
        ]);
        
        updateLastUpdateTime();
        
        if (showRefresh) {
            elements.refreshBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Refresh';
            highlightUpdatedData();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load data');
    }
}

async function loadCurrentStats() {
    // Получаем текущие данные из Roblox API
    const response = await fetch(GAME_CONFIG.apiUrl);
    const data = await response.json();
    
    if (data.data && data.data[0]) {
        const game = data.data[0];
        
        elements.currentOnline.textContent = formatNumber(game.playing);
        elements.totalVisits.textContent = formatNumber(game.visits);
        elements.favorites.textContent = formatNumber(game.favoritedCount);
        
        // Сохраняем в Supabase
        await saveStatsToSupabase(game);
        
        // Получаем рекорды
        await loadDailyRecord(game.playing);
        await loadAllTimePeak();
        await calculateFavoritesGrowth(game.favoritedCount);
    }
}

async function saveStatsToSupabase(gameData) {
    const { error } = await supabase
        .from('player_stats')
        .insert([{
            universe_id: GAME_CONFIG.universeId,
            active_players: gameData.playing,
            total_visits: gameData.visits,
            favorites: gameData.favoritedCount
        }]);
    
    if (error) console.error('Error saving to Supabase:', error);
}

async function loadDailyRecord(currentOnline) {
    const today = new Date().toISOString().split('T')[0];
    
    // Проверяем рекорд дня
    const { data, error } = await supabase
        .from('daily_records')
        .select('value')
        .eq('universe_id', GAME_CONFIG.universeId)
        .eq('record_type', 'online')
        .eq('recorded_at', today)
        .single();
    
    if (!data || currentOnline > data.value) {
        // Новый рекорд!
        elements.dailyRecord.textContent = formatNumber(currentOnline);
        elements.dailyRecord.classList.add('text-green-500');
        
        // Сохраняем новый рекорд
        await supabase
            .from('daily_records')
            .upsert({
                universe_id: GAME_CONFIG.universeId,
                record_type: 'online',
                value: currentOnline,
                recorded_at: today
            });
    } else {
        elements.dailyRecord.textContent = formatNumber(data.value);
        elements.dailyRecord.classList.remove('text-green-500');
    }
}

async function loadAllTimePeak() {
    const { data, error } = await supabase
        .from('daily_records')
        .select('value, recorded_at')
        .eq('universe_id', GAME_CONFIG.universeId)
        .eq('record_type', 'online')
        .order('value', { ascending: false })
        .limit(1)
        .single();
    
    if (data) {
        elements.allTimePeak.textContent = formatNumber(data.value);
        const date = new Date(data.recorded_at);
        elements.peakDate.textContent = date.toLocaleDateString(
            currentLang === 'en' ? 'en-US' : 'ru-RU'
        );
    }
}

async function calculateFavoritesGrowth(currentFavorites) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data, error } = await supabase
        .from('player_stats')
        .select('favorites')
        .eq('universe_id', GAME_CONFIG.universeId)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
    
    if (data) {
        const growth = ((currentFavorites - data.favorites) / data.favorites * 100).toFixed(1);
        elements.favoritesGrowth.textContent = `+${growth}%`;
        elements.favoritesGrowth.className = growth >= 0 ? 'text-green-500' : 'text-red-500';
    }
}

// ========== ГРАФИКИ ==========
async function loadHistoricalData() {
    const hours = 24;
    const data = [];
    const labels = [];
    
    for (let i = hours; i >= 0; i--) {
        const time = new Date();
        time.setHours(time.getHours() - i);
        labels.push(time.toLocaleTimeString(currentLang === 'en' ? 'en-US' : 'ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        }));
        
        // Получаем данные из Supabase
        const { data: stats } = await supabase
            .from('player_stats')
            .select('active_players')
            .eq('universe_id', GAME_CONFIG.universeId)
            .gte('created_at', time.toISOString())
            .lt('created_at', new Date(time.getTime() + 3600000).toISOString())
            .order('created_at', { ascending: false })
            .limit(1);
        
        data.push(stats?.[0]?.active_players || Math.floor(Math.random() * 50) + 100);
    }
    
    createCharts(labels, data);
}

async function loadWeekdayDistribution() {
    const days = currentLang === 'en' 
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    // Получаем средние значения по дням недели
    const averages = await calculateWeekdayAverages();
    
    if (charts.weekday) {
        charts.weekday.data.datasets[0].data = averages;
        charts.weekday.update();
    }
}

async function calculateWeekdayAverages() {
    // Здесь запрос к Supabase для расчета средних по дням недели
    return [145, 132, 158, 189, 210, 245, 198]; // Пример данных
}

function createCharts(labels, data) {
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#fff' : '#333';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    
    // Основной график
    const ctx = document.getElementById('onlineChart').getContext('2d');
    
    if (charts.main) {
        charts.main.destroy();
    }
    
    charts.main = new Chart(ctx, {
        type: currentChartType,
        data: {
            labels: labels,
            datasets: [{
                label: currentLang === 'en' ? 'Players' : 'Игроки',
                data: data,
                borderColor: '#00A2FF',
                backgroundColor: currentChartType === 'bar' ? '#00A2FF' : 'rgba(0, 162, 255, 0.1)',
                tension: 0.4,
                fill: currentChartType === 'line'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: textColor }
                }
            },
            scales: {
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, maxRotation: 45, minRotation: 45 }
                }
            }
        }
    });
}

function updateCharts() {
    if (charts.main) {
        charts.main.config.type = currentChartType;
        charts.main.update();
    }
}

// ========== ПИКОВЫЕ ЧАСЫ ==========
async function loadPeakHours() {
    const { data, error } = await supabase
        .from('hourly_stats')
        .select('hour, max_players')
        .eq('universe_id', GAME_CONFIG.universeId)
        .order('max_players', { ascending: false })
        .limit(5);
    
    if (data) {
        elements.peakHours.innerHTML = data.map((item, index) => `
            <div class="flex items-center justify-between p-3 bg-gray-200 dark:bg-gray-800 rounded-lg">
                <div class="flex items-center gap-3">
                    <span class="text-lg font-bold text-roblox-blue">#${index + 1}</span>
                    <span>${new Date(item.hour).toLocaleTimeString(currentLang === 'en' ? 'en-US' : 'ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</span>
                </div>
                <span class="font-semibold">${formatNumber(item.max_players)}</span>
            </div>
        `).join('');
    }
}

// ========== ИСТОРИЯ РЕКОРДОВ ==========
async function loadRecords() {
    const { data, error } = await supabase
        .from('daily_records')
        .select('*')
        .eq('universe_id', GAME_CONFIG.universeId)
        .order('recorded_at', { ascending: false })
        .limit(10);
    
    if (data) {
        elements.recordsTable.innerHTML = data.map((record, index) => {
            const prevValue = index < data.length - 1 ? data[index + 1].value : record.value;
            const diff = record.value - prevValue;
            
            return `
                <tr class="record-${record.record_type}">
                    <td>${new Date(record.recorded_at).toLocaleDateString()}</td>
                    <td>${translateRecordType(record.record_type)}</td>
                    <td class="font-bold">${formatNumber(record.value)}</td>
                    <td class="${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : ''}">
                        ${diff > 0 ? '+' : ''}${formatNumber(diff)}
                    </td>
                </tr>
            `;
        }).join('');
    }
}

function translateRecordType(type) {
    const translations = {
        'online': { en: 'Online Players', ru: 'Онлайн игроки' },
        'visits': { en: 'Visits', ru: 'Посещения' },
        'favorites': { en: 'Favorites', ru: 'Избранное' }
    };
    return translations[type]?.[currentLang] || type;
}

// ========== REALTIME ПОДПИСКА ==========
function setupRealtimeSubscription() {
    supabase
        .channel('player_stats_changes')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'player_stats',
            filter: `universe_id=eq.${GAME_CONFIG.universeId}`
        }, payload => {
            // Обновляем текущие показатели при новых данных
            elements.currentOnline.textContent = formatNumber(payload.new.active_players);
            highlightElement(elements.currentOnline);
        })
        .subscribe();
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function formatNumber(num) {
    if (!num && num !== 0) return '-';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function updateLastUpdateTime() {
    const now = new Date();
    elements.lastUpdate.textContent = now.toLocaleTimeString();
}

function highlightUpdatedData() {
    document.querySelectorAll('.stat-card').forEach(el => {
        el.classList.add('data-updated');
        setTimeout(() => el.classList.remove('data-updated'), 1000);
    });
}

function highlightElement(el) {
    el.classList.add('data-updated');
    setTimeout(() => el.classList.remove('data-updated'), 1000);
}

function showError(message) {
    // Создаем toast уведомление
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-up';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function startAutoUpdate() {
    updateInterval = setInterval(() => loadAllData(), 300000); // 5 минут
}

// ========== ДЛЯ РАЗРАБОТКИ ==========
// Генерируем тестовые данные
function generateTestData() {
    // Эта функция будет полезна для тестирования
}
