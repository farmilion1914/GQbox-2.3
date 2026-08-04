  // ================================================================
// GQbox — Полное приложение (GQbox отгрузки + Order Calculator)
// ================================================================

window.isXLSXLoaded = function() { return typeof XLSX !== 'undefined'; };

var firebaseConfig = {
    apiKey: "AIzaSyBCGOXZtpRY_aWOkcUWuW34uJBsNgrgdDA",
    authDomain: "shipments-f48c2.firebaseapp.com",
    projectId: "shipments-f48c2",
    storageBucket: "shipments-f48c2.firebasestorage.app",
    messagingSenderId: "994289127760",
    appId: "1:994289127760:web:539f3ca770a1e6d4705c55"
};
firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();
try { db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED, merge: true }); } catch(e) {}

// ============ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ============
var currentUser = null;
var wbShipments = [], ozonShipments = [], logEntries = [], vedSupplies = [], weekCapacities = {};
var isOnline = false;
var currentPage = 'schedule', currentSubPage = 'weeks';
var wbStockData = [], ozonStockData = [], msStockData = [];
var msStockPage = 1, msStockPerPage = 50;
var msStockLastUpdate = null, msStockSource = 'firebase', msStockFileName = '';
var wbStockLastUpdate = null, wbStockSource = 'firebase', wbStockFileName = '';
var ozonStockLastUpdate = null, ozonStockSource = 'firebase', ozonStockFileName = '';
var wbViewMode = 'week', ozonViewMode = 'week';
var wbWeekOffset = 0, ozonWeekOffset = 0, wbMonthOffset = 0, ozonMonthOffset = 0;
var wbExpandedDay = null, ozonExpandedDay = null;
var currentWbSubPage = 'shipments', currentOzonSubPage = 'shipments', currentLogSubPage = 'shipments';
var warehouseExpenses = [], warehouseTransfers = [];
var editingShipmentId = null;
var vedTempLists = [null], vedSearchQuery = '', vedExpandedId = null;

// Order Calculator state
var orderFilter = 'all';
var lastOrderResult = null;

// ============ OZON API (несколько ИП, прямо из браузера) ============
var OZON_ACCOUNTS = [
    { clientId: '28560', apiKey: '57fd9f69-1931-4633-8186-dec9496a2d09', label: 'ИП КЮА' },
    { clientId: '753500', apiKey: '51e6f7da-1a9f-4109-8756-cc6322768ba4', label: 'ИП КАА' },
    { clientId: '559028', apiKey: '4b64bc96-65e0-4b64-878a-5440b6771759', label: 'ИП БМС' }
];
var OZON_API_BASE = 'https://api-seller.ozon.ru';
var ozonApiInProgress = false;
var ozonApiLastUpdate = null;
var ozonApiLastError = null;
var ozonApiProductsCache = null; // { articles: {}, skus: {} }

var routesDB = {
    'Казань': { schedule: 'В любой день', delivery: '1-2 дня' },
    'Краснодар': { schedule: 'Пн-Ср, Ср-Пт, Пт-Вс', delivery: '2-3 дня' },
    'Невинномысск': { schedule: 'Пн-Ср, Ср-Пт, Пт-Вс', delivery: '2-3 дня' },
    'Екатеринбург': { schedule: 'Ср-Сб, Сб-Вт, Вт-Пт', delivery: '2-3 дня' },
    'Санкт-Петербург': { schedule: 'Пн-Вт, Вт-Ср, Чт-Пт, Пт-Вс', delivery: '1-2 дня' },
    'Челябинск': { schedule: 'Ср-Сб, Сб-Вт', delivery: '2-3 дня' },
    'Минск': { schedule: 'Пн-Пт — след. день', delivery: '2 дня' },
    'Тула': { schedule: 'В любой день', delivery: 'день в день' },
    'Коледино': { schedule: 'В любой день', delivery: 'день в день' },
    'Электросталь': { schedule: 'В любой день', delivery: 'день в день' },
    'Волгоград': { schedule: 'Ср-Пт', delivery: '2-3 дня' },
    'Владимир': { schedule: 'В любой день', delivery: '2 дня' },
    'Рязань': { schedule: 'В любой день', delivery: 'день в день' },
    'Воронеж': { schedule: 'Пн-Чт, Ср-Сб, Пт-Пн', delivery: '3-4 дня' },
    'Новосибирск': { schedule: 'Пн-Сб, Пт-Ср', delivery: '5-6 дней' },
    'Сарапул': { schedule: 'Пн-Чт', delivery: '4 дня' },
    'Котовск': { schedule: 'Пн-Пт — след. день', delivery: '2 дня' },
    'Москва': { schedule: 'В любой день', delivery: 'день в день' },
    'Шушары': { schedule: 'Пн-Вт, Вт-Ср, Чт-Пт, Пт-Вс', delivery: '1-2 дня' },
    'Чехов': { schedule: 'В любой день', delivery: 'день в день' },
    'Пушкино': { schedule: 'В любой день', delivery: '1-2 дня' },
    'Хоругвино': { schedule: 'В любой день', delivery: '1-2 дня' },
    'Петровское': { schedule: 'В любой день', delivery: '1-2 дня' },
    'Радумля': { schedule: 'В любой день', delivery: '1-2 дня' },
    'Ногинск': { schedule: 'В любой день', delivery: '1-2 дня' },
    'Софьино': { schedule: 'В любой день', delivery: '1-2 дня' },
    'Домодедово': { schedule: 'В любой день', delivery: '1-2 дня' },
    'Жуковский': { schedule: 'В любой день', delivery: '1-2 дня' },
    'Гривно': { schedule: 'В любой день', delivery: '1-2 дня' },
    'Ватутинки': { schedule: 'В любой день', delivery: '1-2 дня' },
    'Великий Камень (Минск)': { schedule: 'Пн-Пт — след. день', delivery: '2 дня' }
};
var VALID_CITIES = new Set(Object.keys(routesDB));

var STATUSES = [
    { value: 'in_work', label: 'В работе', 'class': 'status-work' },
    { value: 'waiting', label: 'Ожидает', 'class': 'status-wait' },
    { value: 'rejected', label: 'Не принят', 'class': 'status-reject' },
    { value: 'sent', label: 'Отправлено', 'class': 'status-sent' },
    { value: 'ready', label: 'Готово', 'class': 'status-ready' }
];

var VED_STATUSES = {
    transit: { label: 'В пути', 'class': 'status-transit' },
    customs: { label: 'Таможня', 'class': 'status-customs' },
    svh: { label: 'На СВХ', 'class': 'status-svh' },
    arrived: { label: 'Прибыла', 'class': 'status-arrived' }
};

var SUPPLIERS = ['', 'Большие Амбиции', 'ИП Орищенко', 'НордТрансСклад', 'Тессар'];
var MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
var FORECAST_MONTHS = ['Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
var MAX_VED_LISTS = 4;

var warehouseData = {
    totalCapacity: 2267,
    currentOccupancy: 1408,
    constantVolume: 85,
    baseExpense: 51.50,
    marchPlan: 311000000,
    salesPlan: { "Апрель": 343000000, "Май": 387000000, "Июнь": 428300000, "Июль": 494000000, "Август": 565000000, "Сентябрь": 629000000, "Октябрь": 697000000, "Ноябрь": 775000000, "Декабрь": 1149000000 }
};

// ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============
function safeGetElement(id) { var el = document.getElementById(id); if (!el) console.warn('#' + id); return el; }
function getLocalDateString() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function generateUniqueId() { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9); }
function escapeHtml(s) { if (!s) return ''; return s.replace(/[&<>]/g, function(m) { return { '&': '&', '<': '<', '>': '>' }[m] || m; }); }
function formatAmount(n) { if (n >= 1000000) return (n / 1000000).toFixed(2) + ' млн'; if (n >= 1000) return (n / 1000).toFixed(0) + ' тыс.'; return n.toLocaleString('ru-RU'); }
function formatTime() { var d = new Date(); return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }
function downloadCSV(csv, fn) { var b = new Blob([csv], { type: 'text/csv;charset=utf-8;' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fn; a.click(); setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000); }

function showToast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function() { t.classList.remove('show'); }, 2500);
}

function updateSyncStatus(s) {
    var el = document.getElementById('syncStatus'), dot = document.getElementById('syncDot');
    if (!el || !dot) return;
    dot.className = 'sync-dot';
    if (s === 'online') { dot.classList.add('online'); el.textContent = 'Онлайн'; }
    else if (s === 'offline') { dot.classList.add('offline'); el.textContent = 'Офлайн'; }
    else { dot.classList.add('loading'); el.textContent = 'Загрузка...'; }
}

function validateCityInput(el) {
    // Города больше не валидируются — можно вводить любой
    if (!el) return;
    el.classList.remove('invalid');
}

function normalizeDateString(ds) {
    if (!ds || typeof ds !== 'string') return null;
    ds = ds.trim();
    var m = ds.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (m) { var d = m[1].padStart(2, '0'), mo = m[2].padStart(2, '0'), y = m[3]; if (y.length === 2) y = '20' + y; var r = y + '-' + mo + '-' + d; if (!isNaN(new Date(r).getTime())) return r; }
    if (/^\d{4}-\d{2}-\d{2}$/.test(ds) && !isNaN(new Date(ds).getTime())) return ds;
    var pd = new Date(ds);
    if (!isNaN(pd.getTime())) return pd.toISOString().slice(0, 10);
    return null;
}

// ============ AUTH ============
firebase.auth().onAuthStateChanged(function(user) {
    var ab = document.getElementById('authBlock'), ma = document.getElementById('mainApp');
    if (user) {
        currentUser = user;
        if (ab) ab.style.display = 'none';
        if (ma) ma.style.display = 'block';
        var st = document.getElementById('syncStatus');
        if (st) st.textContent = '👤 ' + (user.email || user.uid) + ' · Загрузка...';
        if (!isOnline) loadFromFirebase();
    } else {
        currentUser = null;
        if (ab) ab.style.display = 'block';
        if (ma) ma.style.display = 'none';
        updateSyncStatus('offline');
    }
});

function handleAuthLogin() {
    var email = document.getElementById('authEmail').value.trim(), pw = document.getElementById('authPassword').value, er = document.getElementById('authError');
    if (!email || !pw) { if (er) { er.textContent = 'Заполните поля'; er.style.display = 'block'; } return; }
    firebase.auth().signInWithEmailAndPassword(email, pw).catch(function(err) { if (er) { er.textContent = err.message; er.style.display = 'block'; } });
}

function handleAuthRegister() {
    var email = document.getElementById('regEmail').value.trim(), pw = document.getElementById('regPassword').value, pw2 = document.getElementById('regPassword2').value, er = document.getElementById('regError');
    if (!email || !pw) { if (er) { er.textContent = 'Заполните поля'; er.style.display = 'block'; } return; }
    if (pw.length < 6) { if (er) { er.textContent = 'Минимум 6 символов'; er.style.display = 'block'; } return; }
    if (pw !== pw2) { if (er) { er.textContent = 'Пароли не совпадают'; er.style.display = 'block'; } return; }
    firebase.auth().createUserWithEmailAndPassword(email, pw).then(function() { showToast('Аккаунт создан!'); }).catch(function(err) { if (er) { er.textContent = err.message; er.style.display = 'block'; } });
}

// ============ LOCAL STORAGE ============
function loadAllFromLocalStorage() {
    try {
        wbShipments = JSON.parse(localStorage.getItem('wb') || '[]').map(function(s) { s.status = s.status || 'in_work'; s.linkId = s.linkId || null; s.source = s.source || 'Wildberries'; return s; });
        ozonShipments = JSON.parse(localStorage.getItem('ozon') || '[]').map(function(s) { s.status = s.status || 'in_work'; s.linkId = s.linkId || null; s.source = s.source || 'Ozon'; return s; });
        logEntries = JSON.parse(localStorage.getItem('log') || '[]').map(function(e) { e.paid = e.paid || false; e.linkId = e.linkId || null; return e; });
        vedSupplies = JSON.parse(localStorage.getItem('ved') || '[]').map(function(s) { s.includeInModel = s.includeInModel !== undefined ? s.includeInModel : true; return s; });
        weekCapacities = JSON.parse(localStorage.getItem('cap') || '{}');
        wbStockData = JSON.parse(localStorage.getItem('wbStock') || '[]');
        ozonStockData = JSON.parse(localStorage.getItem('ozonStock') || '[]');
        msStockData = JSON.parse(localStorage.getItem('msStock') || '[]');
        msStockLastUpdate = localStorage.getItem('msStockLastUpdate') || null;
        msStockSource = localStorage.getItem('msStockSource') || 'firebase';
        msStockFileName = localStorage.getItem('msStockFileName') || '';
        wbStockLastUpdate = localStorage.getItem('wbStockLastUpdate') || null;
        wbStockSource = localStorage.getItem('wbStockSource') || 'firebase';
        wbStockFileName = localStorage.getItem('wbStockFileName') || '';
        ozonStockLastUpdate = localStorage.getItem('ozonStockLastUpdate') || null;
        ozonStockSource = localStorage.getItem('ozonStockSource') || 'firebase';
        ozonStockFileName = localStorage.getItem('ozonStockFileName') || '';
        warehouseExpenses = JSON.parse(localStorage.getItem('warehouseExpenses') || '[]');
        warehouseTransfers = JSON.parse(localStorage.getItem('warehouseTransfers') || '[]');
        var sw = localStorage.getItem('warehouseData');
        if (sw) { var d = JSON.parse(sw); warehouseData.totalCapacity = d.totalCapacity || 2267; warehouseData.currentOccupancy = d.currentOccupancy || 1408; warehouseData.constantVolume = d.constantVolume || 85; warehouseData.baseExpense = d.baseExpense || 51.50; warehouseData.marchPlan = d.marchPlan || 311000000; warehouseData.salesPlan = d.salesPlan || warehouseData.salesPlan; }
    } catch(e) {}
}

function saveAllToLocalStorage() {
    try {
        localStorage.setItem('wb', JSON.stringify(wbShipments));
        localStorage.setItem('ozon', JSON.stringify(ozonShipments));
        localStorage.setItem('log', JSON.stringify(logEntries));
        localStorage.setItem('ved', JSON.stringify(vedSupplies));
        localStorage.setItem('cap', JSON.stringify(weekCapacities));
        localStorage.setItem('warehouseData', JSON.stringify(warehouseData));
        localStorage.setItem('wbStock', JSON.stringify(wbStockData));
        localStorage.setItem('ozonStock', JSON.stringify(ozonStockData));
        localStorage.setItem('msStock', JSON.stringify(msStockData));
        localStorage.setItem('msStockLastUpdate', msStockLastUpdate || '');
        localStorage.setItem('msStockSource', msStockSource);
        localStorage.setItem('msStockFileName', msStockFileName);
        localStorage.setItem('wbStockLastUpdate', wbStockLastUpdate || '');
        localStorage.setItem('wbStockSource', wbStockSource);
        localStorage.setItem('wbStockFileName', wbStockFileName);
        localStorage.setItem('ozonStockLastUpdate', ozonStockLastUpdate || '');
        localStorage.setItem('ozonStockSource', ozonStockSource);
        localStorage.setItem('ozonStockFileName', ozonStockFileName);
        localStorage.setItem('currentPage', currentPage);
        localStorage.setItem('currentSubPage', currentSubPage);
    } catch(e) {}
}

// ============ ЗАГРУЗКА ИЗ FIREBASE ============
async function loadFromFirebase() {
    var T = 5000, ef = false;
    var efT = setTimeout(function() { if (!ef) { ef = true; loadAllFromLocalStorage(); isOnline = false; updateSyncStatus('offline'); renderAllDebounced(); showToast('Офлайн-режим'); } }, T);
    try {
        updateSyncStatus('loading');
        var r = await Promise.all([
            db.collection('shipments_wb').orderBy('date').get().catch(function() { return { empty: true, docs: [] }; }),
            db.collection('shipments_ozon').orderBy('date').get().catch(function() { return { empty: true, docs: [] }; }),
            db.collection('logistics').orderBy('date').get().catch(function() { return { empty: true, docs: [] }; }),
            db.collection('ved_supplies').orderBy('eta').get().catch(function() { return { empty: true, docs: [] }; }),
            db.collection('settings').doc('capacities').get().catch(function() { return { exists: false }; }),
            db.collection('settings').doc('warehouseData').get().catch(function() { return { exists: false }; }),
            db.collection('settings').doc('wbStock').get().catch(function() { return { exists: false }; }),
            db.collection('settings').doc('ozonStock').get().catch(function() { return { exists: false }; }),
            db.collection('settings').doc('msStock').get().catch(function() { return { exists: false }; }),
            db.collection('settings').doc('warehouseTransfers').get().catch(function() { return { exists: false }; }),
            db.collection('settings').doc('warehouseExpenses').get().catch(function() { return { exists: false }; })
        ]);
        clearTimeout(efT);
        if (ef) return;
        wbShipments = r[0].docs.map(function(d) { var x = d.data(); x.id = d.id; x.status = x.status || 'in_work'; x.linkId = x.linkId || null; x.source = x.source || 'Wildberries'; return x; });
        ozonShipments = r[1].docs.map(function(d) { var x = d.data(); x.id = d.id; x.status = x.status || 'in_work'; x.linkId = x.linkId || null; x.source = x.source || 'Ozon'; return x; });
        logEntries = r[2].docs.map(function(d) { var x = d.data(); x.id = d.id; x.paid = x.paid || false; x.linkId = x.linkId || null; return x; });
        vedSupplies = r[3].docs.map(function(d) { var x = d.data(); x.id = d.id; x.includeInModel = x.includeInModel !== undefined ? x.includeInModel : true; return x; });
        weekCapacities = r[4].exists ? (r[4].data().capacities || {}) : {};
        if (r[5].exists) { var sd = r[5].data(); warehouseData.totalCapacity = sd.totalCapacity || 2267; warehouseData.currentOccupancy = sd.currentOccupancy || 1408; warehouseData.constantVolume = sd.constantVolume || 85; warehouseData.baseExpense = sd.baseExpense || 51.50; warehouseData.marchPlan = sd.marchPlan || 311000000; warehouseData.salesPlan = sd.salesPlan || warehouseData.salesPlan; }
        if (r[6].exists) { var wbd = r[6].data(); if (wbStockSource !== 'excel') { wbStockData = wbd.items || []; if (wbd.updatedAt) wbStockLastUpdate = wbd.updatedAt.toDate ? wbd.updatedAt.toDate().toISOString() : wbd.updatedAt; } }
        if (r[7].exists) { var ozd = r[7].data(); if (ozonStockSource !== 'excel') { ozonStockData = ozd.items || []; if (ozd.updatedAt) ozonStockLastUpdate = ozd.updatedAt.toDate ? ozd.updatedAt.toDate().toISOString() : ozd.updatedAt; } }
        if (r[8].exists) { var msd = r[8].data(); if (msStockSource !== 'excel') { msStockData = msd.items || []; if (msd.updatedAt) msStockLastUpdate = msd.updatedAt.toDate ? msd.updatedAt.toDate().toISOString() : msd.updatedAt; } }
        if (r[9].exists) { var trd = r[9].data(); if (trd && trd.items) { warehouseTransfers = trd.items; } }
        if (r[10].exists) { var exd = r[10].data(); if (exd && exd.items) { warehouseExpenses = exd.items; } }
        isOnline = true;
        updateSyncStatus('online');
        saveAllToLocalStorage();
        renderAllDebounced();
        showToast('Синхронизировано');
    } catch(e) {
        clearTimeout(efT);
        if (!ef) { loadAllFromLocalStorage(); isOnline = false; updateSyncStatus('offline'); renderAllDebounced(); }
    }
}

var renderScheduled = false;

function renderAllDebounced() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(function() { renderAll(); renderScheduled = false; });
}

// ============ SHIPMENTS (WB / Ozon) ============
function showRouteInfo() {
    var ci = document.getElementById('shipCityWildberries');
    if (!ci) return;
    validateCityInput(ci);
    var city = ci.value.trim();
    var route = routesDB[city];
    var info = document.getElementById('routeInfoWildberries');
    if (route && info) {
        info.classList.add('show');
        var t = document.getElementById('routeTitleWildberries'), d = document.getElementById('routeDetailWildberries'), s = document.getElementById('routeScheduleWildberries');
        if (t) t.textContent = city;
        if (d) d.textContent = 'Срок: ' + route.delivery;
        if (s) s.innerHTML = route.schedule.split(', ').map(function(x) { return '<span class="route-chip">' + escapeHtml(x) + '</span>' }).join('');
    } else if (info) { info.classList.remove('show'); }
}

async function saveShipment(mp) {
    var de = document.getElementById('shipDate' + mp), ce = document.getElementById('shipCity' + mp), qe = document.getElementById('shipQty' + mp);
    if (!de || !ce || !qe) return;
    var date = de.value, city = ce.value.trim(), qty = parseInt(qe.value) || 0;
    if (!date || !city || qty <= 0) { alert('Заполните дату, город и количество'); return; }
    var linkId = generateUniqueId();
    var s = { id: generateUniqueId(), date: date, city: city, qty: qty, source: mp, status: 'in_work', linkId: linkId, qtyHistory: [] };
    var arr = mp === 'Wildberries' ? wbShipments : ozonShipments;
    arr.push(s);
    var le = { id: generateUniqueId(), date: date, marketplace: mp, type: 'FBO', supplier: '', city: city, qty: qty, boxes: 0, amount: 0, amountFull: 0, paid: false, nds: '22%', source: 'Авто из ' + mp, linkId: linkId };
    logEntries.push(le);
    if (isOnline) {
        var col = mp === 'Wildberries' ? 'shipments_wb' : 'shipments_ozon';
        try { await db.collection(col).doc(s.id).set(s); await db.collection('logistics').doc(le.id).set(le); } catch(e) {}
    }
    saveAllToLocalStorage();
    renderAllDebounced();
    clearShipmentForm(mp);
    showToast(city + ' — ' + qty.toLocaleString('ru-RU') + ' ед.');
}

function clearShipmentForm(mp) {
    var de = document.getElementById('shipDate' + mp), ce = document.getElementById('shipCity' + mp), qe = document.getElementById('shipQty' + mp);
    if (de) de.value = getLocalDateString();
    if (ce) { ce.value = ''; ce.classList.remove('invalid'); }
    if (qe) qe.value = '';
    if (mp === 'Wildberries') { var info = document.getElementById('routeInfoWildberries'); if (info) info.classList.remove('show'); }
}

async function deleteShipment(mp, id) {
    if (!confirm('Удалить?')) return;
    var arr = mp === 'Wildberries' ? wbShipments : ozonShipments;
    var sh = arr.find(function(s) { return String(s.id) === String(id); });
    var linkId = sh ? sh.linkId : null;
    if (mp === 'Wildberries') wbShipments = wbShipments.filter(function(s) { return String(s.id) !== String(id); });
    else ozonShipments = ozonShipments.filter(function(s) { return String(s.id) !== String(id); });
    if (linkId) {
        var ll = logEntries.find(function(l) { return l.linkId === linkId; });
        if (ll) { logEntries = logEntries.filter(function(l) { return l.linkId !== linkId; }); if (isOnline) try { await db.collection('logistics').doc(String(ll.id)).delete(); } catch(e) {} }
    }
    if (isOnline) {
        var col = mp === 'Wildberries' ? 'shipments_wb' : 'shipments_ozon';
        try { await db.collection(col).doc(String(id)).delete(); } catch(e) {}
    }
    saveAllToLocalStorage();
    renderAllDebounced();
    showToast('Удалено');
}

function startEditQty(mp, id) {
    editingShipmentId = String(id);
    renderCurrentView(mp);
    setTimeout(function() {
        var inp = document.getElementById('qty-input-' + id);
        if (inp) { inp.focus(); inp.select(); }
    }, 50);
}

function saveEditQty(mp, id) {
    var inp = document.getElementById('qty-input-' + id);
    if (!inp) return;
    var nq = parseInt(inp.value) || 0;
    if (nq <= 0) { showToast('Количество должно быть > 0'); return; }
    var arr = mp === 'Wildberries' ? wbShipments : ozonShipments;
    var sh = arr.find(function(s) { return String(s.id) === String(id); });
    if (!sh) { editingShipmentId = null; renderCurrentView(mp); return; }
    var oldQty = sh.qty;
    if (oldQty === nq) { editingShipmentId = null; renderCurrentView(mp); return; }
    sh.qty = nq;
    sh.qtyHistory = sh.qtyHistory || [];
    sh.qtyHistory.push({ oldQty: oldQty, newQty: nq, diff: nq - oldQty, time: formatTime(), user: currentUser ? currentUser.email || currentUser.uid : 'Неизвестно' });
    if (sh.linkId) { var le = logEntries.find(function(l) { return l.linkId === sh.linkId; }); if (le) le.qty = nq; }
    if (isOnline) {
        var col = mp === 'Wildberries' ? 'shipments_wb' : 'shipments_ozon';
        try { db.collection(col).doc(String(id)).update({ qty: nq, qtyHistory: sh.qtyHistory }); if (sh.linkId) { var le2 = logEntries.find(function(l) { return l.linkId === sh.linkId; }); if (le2) db.collection('logistics').doc(String(le2.id)).update({ qty: nq }); } } catch(e) {}
    }
    saveAllToLocalStorage();
    editingShipmentId = null;
    renderAllDebounced();
    showToast(oldQty > nq ? 'Уменьшено на ' + (oldQty - nq) + ' ед.' : 'Увеличено на ' + (nq - oldQty) + ' ед.');
}

function renderCurrentView(mp) {
    if (mp === 'Wildberries') {
        if (wbViewMode === 'week') renderWeekView('Wildberries');
        else renderShipmentCards('Wildberries');
    } else {
        if (ozonViewMode === 'week') renderWeekView('Ozon');
        else renderShipmentCards('Ozon');
    }
}

function getMonthBounds(offset) {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth() + offset;
    if (m < 0) { m += 12; y--; } else if (m > 11) { m -= 12; y++; }
    var label = MONTHS[m] + ' ' + y;
    var start = y + '-' + String(m + 1).padStart(2, '0') + '-01';
    var end = new Date(y, m + 1, 0);
    var endStr = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(end.getDate()).padStart(2, '0');
    return { label: label, start: start, end: endStr };
}

function changeMonth(mp, delta) {
    if (mp === 'Wildberries') { wbMonthOffset += delta; renderShipmentCards('Wildberries'); }
    else { ozonMonthOffset += delta; renderShipmentCards('Ozon'); }
}

// ============ MONTH VIEW ============
function renderShipmentCards(mp) {
    var arr = mp === 'Wildberries' ? wbShipments : ozonShipments;
    var cid = mp === 'Wildberries' ? 'wbCards' : 'ozonCards';
    var offset = mp === 'Wildberries' ? wbMonthOffset : ozonMonthOffset;
    var bounds = getMonthBounds(offset);
    var filtered = arr.filter(function(s) { return s.date >= bounds.start && s.date <= bounds.end; });
    var srt = filtered.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
    var totalQty = filtered.reduce(function(sum, s) { return sum + (s.qty || 0); }, 0);
    var c = document.getElementById(cid);
    if (!c) return;
    var h = '';
    h += '<div class="month-nav"><button type="button" class="month-nav-btn" data-month-nav="' + mp + '" data-delta="-1">◀</button><span class="month-nav-label">' + bounds.label + '</span><button type="button" class="month-nav-btn" data-month-nav="' + mp + '" data-delta="1">▶</button><span class="month-nav-total">Всего: ' + totalQty.toLocaleString('ru-RU') + ' ед. · ' + filtered.length + ' отгр.</span></div>';
    if (!srt.length) { h += '<div class="empty-state">Нет отгрузок</div>'; }
    else {
        h += '<div class="cards-grid">';
        for (var i = 0; i < srt.length; i++) {
            var e = srt[i];
            var cs = e.status || 'in_work';
            var so = STATUSES.find(function(s) { return s.value === cs; }) || STATUSES[0];
            var route = mp === 'Wildberries' ? (routesDB[e.city] || null) : null;
            var ac = mp === 'Wildberries' ? 'wb' : 'ozon';
            var ie = editingShipmentId === String(e.id);
            var hasHistory = e.qtyHistory && e.qtyHistory.length > 0;
            h += '<div class="shipment-card"><div class="card-accent ' + ac + '"></div><div class="card-body"><div class="card-header"><div><div class="card-city">' + escapeHtml(e.city) + '</div><div class="card-date">' + escapeHtml(e.date) + '</div></div><div class="card-actions"><button type="button" class="card-edit" data-edit-mp="' + mp + '" data-edit-id="' + e.id + '">✎</button><button type="button" class="card-delete" data-mp="' + mp + '" data-id="' + e.id + '">&times;</button></div></div><div class="card-qty-section">';
            if (ie) { h += '<div class="card-qty-row"><input type="number" class="card-qty-input" id="qty-input-' + e.id + '" value="' + e.qty + '" min="1"><button type="button" class="btn-confirm-edit" style="padding:6px 14px;font-size:18px;border-radius:8px" data-confirm-edit="' + mp + '" data-confirm-id="' + e.id + '">✓</button></div>'; }
            else { h += '<div class="card-qty">' + e.qty.toLocaleString('ru-RU') + '</div>'; }
            h += '<div class="card-qty-label">единиц</div></div>';
            if (hasHistory) {
                var lastChange = e.qtyHistory[e.qtyHistory.length - 1];
                var diff = lastChange.diff;
                var diffClass = diff > 0 ? 'positive' : 'negative';
                var diffSign = diff > 0 ? '+' : '';
                h += '<div class="qty-history"><span>📝</span><span>Было ' + lastChange.oldQty.toLocaleString('ru-RU') + ' → ' + lastChange.newQty.toLocaleString('ru-RU') + '</span><span class="qty-diff ' + diffClass + '">' + diffSign + diff + ' ед.</span><span class="qty-editor">' + escapeHtml(lastChange.user) + '</span><span class="qty-time">' + escapeHtml(lastChange.time) + '</span></div>';
            } else { h += '<div class="qty-history-placeholder">Нет изменений</div>'; }
            h += '<div class="card-footer"><div class="card-status"><select class="status-select ' + so['class'] + '" data-mp="' + mp + '" data-id="' + e.id + '">' + STATUSES.map(function(s) { return '<option value="' + s.value + '" ' + (cs === s.value ? 'selected' : '') + '>' + s.label + '</option>'; }).join('') + '</select></div><div class="route-section">';
            if (route) { h += '<span class="route-badge">' + route.delivery + '</span>'; }
            h += '</div></div></div></div>';
        }
        h += '</div>';
    }
    c.innerHTML = h;
}

// ============ WEEK VIEW ============
function getWeekBounds(offset) {
    var now = new Date();
    var day = now.getDay();
    var dfm = day === 0 ? 6 : day - 1;
    var mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dfm + offset * 7);
    var sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
    var months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    var label = mon.getDate() + ' ' + months[mon.getMonth()] + ' – ' + sun.getDate() + ' ' + months[sun.getMonth()] + ' ' + sun.getFullYear();
    function fmt(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    return { monDate: fmt(mon), sunDate: fmt(sun), label: label };
}

function renderWeekView(mp) {
    var arr = mp === 'Wildberries' ? wbShipments : ozonShipments;
    var offset = mp === 'Wildberries' ? wbWeekOffset : ozonWeekOffset;
    var expDay = mp === 'Wildberries' ? wbExpandedDay : ozonExpandedDay;
    var container = document.getElementById(mp === 'Wildberries' ? 'wbWeekView' : 'ozonWeekView');
    if (!container) return;
    var bounds = getWeekBounds(offset);
    var filtered = arr.filter(function(s) { return s.date >= bounds.monDate && s.date <= bounds.sunDate; });
    var totalQty = filtered.reduce(function(sum, s) { return sum + (s.qty || 0); }, 0);
    var accent = mp === 'Wildberries' ? 'wb' : 'ozon';
    var dayNames = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
    var months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    var byDay = {};
    for (var i = 0; i < 7; i++) { var d = new Date(bounds.monDate + 'T00:00:00'); d.setDate(d.getDate() + i); var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); byDay[key] = []; }
    filtered.forEach(function(s) { if (byDay[s.date]) byDay[s.date].push(s); });
    var h = '';
    h += '<div class="week-nav"><button type="button" class="week-nav-btn" data-week-nav="' + mp + '" data-delta="-1">◀</button><span class="week-nav-label">' + bounds.label + '</span><button type="button" class="week-nav-btn" data-week-nav="' + mp + '" data-delta="1">▶</button><span class="week-nav-total">Всего: ' + totalQty.toLocaleString('ru-RU') + ' ед. · ' + filtered.length + ' отгр.</span></div>';
    h += '<div class="week-columns ' + accent + '-week">';
    var keys = Object.keys(byDay).sort();
    for (var di = 0; di < keys.length; di++) {
        var dayKey = keys[di];
        var items = byDay[dayKey];
        var dd = new Date(dayKey + 'T00:00:00');
        var dayLabel = dayNames[di] + ' ' + dd.getDate() + ' ' + months[dd.getMonth()];
        var dayId = 'day-' + mp + '-' + dayKey;
        var isExpanded = expDay === dayId;
        var visible = isExpanded ? items : items.slice(0, 1);
        var hidden = items.length - visible.length;
        h += '<div class="day-column"><div class="day-col-header"><span class="dow">' + dayNames[di] + '</span>' + dd.getDate() + ' ' + months[dd.getMonth()] + '</div><div class="day-col-body">';
        if (items.length === 0) { h += '<div class="day-col-empty">Нет отгрузок</div>'; }
        else {
            for (var vi = 0; vi < visible.length; vi++) {
                var s = visible[vi];
                var cs = s.status || 'in_work';
                var so = STATUSES.find(function(st) { return st.value === cs; }) || STATUSES[0];
                var route = routesDB[s.city];
                var delivery = route ? route.delivery : '';
                var ieMini = editingShipmentId === String(s.id);
                h += '<div class="mini-card"><div class="mc-accent ' + accent + '"></div><div class="mc-body"><div class="mc-header"><span class="mc-city">' + escapeHtml(s.city) + '</span><div class="mc-actions"><button type="button" class="card-edit" data-edit-mp="' + mp + '" data-edit-id="' + s.id + '">✎</button><button type="button" class="card-delete" data-mp="' + mp + '" data-id="' + s.id + '">&times;</button></div></div>' + (ieMini ? '<div class="mini-qty-row"><input type="number" class="mini-qty-input" id="qty-input-' + s.id + '" value="' + s.qty + '" min="1"><button type="button" class="btn-confirm-edit" style="padding:3px 8px;font-size:14px;border-radius:6px" data-confirm-edit="' + mp + '" data-confirm-id="' + s.id + '">✓</button></div>' : '<div class="mc-qty">' + s.qty.toLocaleString('ru-RU') + ' ед.</div>');
                h += '<div class="mc-status"><select class="status-select ' + so['class'] + '" data-mp="' + mp + '" data-id="' + s.id + '">' + STATUSES.map(function(st) { return '<option value="' + st.value + '" ' + (cs === st.value ? 'selected' : '') + '>' + st.label + '</option>'; }).join('') + '</select></div><div class="mc-route">Срок: ' + escapeHtml(delivery || '—') + '</div></div></div>';
            }
            if (hidden > 0) { h += '<div class="day-col-more" data-day-expand="' + mp + '" data-day-id="' + dayId + '">' + (isExpanded ? 'Свернуть' : '+ ещё ' + hidden + '') + '</div>'; }
        }
        h += '</div><div class="day-col-footer">' + items.length + ' отгр.</div></div>';
    }
    h += '</div>';
    container.innerHTML = h;
}

function getViewMode(mp) {
    if (mp === 'Wildberries') return wbViewMode;
    if (mp === 'Ozon') return ozonViewMode;
    return 'week';
}

function switchWbView(mode) {
    wbViewMode = mode;
    document.querySelectorAll('#wbViewToggle .view-mode-btn').forEach(function(b) { b.classList.remove('active'); if (b.dataset.wbView === mode) b.classList.add('active'); });
    var cg = document.getElementById('wbCards'), wv = document.getElementById('wbWeekView');
    if (cg) cg.style.display = mode === 'month' ? 'block' : 'none';
    if (wv) wv.style.display = mode === 'week' ? 'block' : 'none';
    if (mode === 'week') { wbWeekOffset = 0; wbExpandedDay = null; renderWeekView('Wildberries'); }
    else { wbMonthOffset = 0; renderShipmentCards('Wildberries'); }
}

function switchOzonView(mode) {
    ozonViewMode = mode;
    document.querySelectorAll('#ozonViewToggle .view-mode-btn').forEach(function(b) { b.classList.remove('active'); if (b.dataset.ozonView === mode) b.classList.add('active'); });
    var cg = document.getElementById('ozonCards'), wv = document.getElementById('ozonWeekView');
    if (cg) cg.style.display = mode === 'month' ? 'block' : 'none';
    if (wv) wv.style.display = mode === 'week' ? 'block' : 'none';
    if (mode === 'week') { ozonWeekOffset = 0; ozonExpandedDay = null; renderWeekView('Ozon'); }
    else { ozonMonthOffset = 0; renderShipmentCards('Ozon'); }
}

function changeWeek(mp, delta) {
    if (mp === 'Wildberries') { wbWeekOffset += delta; wbExpandedDay = null; renderWeekView('Wildberries'); }
    else { ozonWeekOffset += delta; ozonExpandedDay = null; renderWeekView('Ozon'); }
}

function toggleDayExpand(mp, dayId) {
    if (mp === 'Wildberries') { wbExpandedDay = wbExpandedDay === dayId ? null : dayId; renderWeekView('Wildberries'); }
    else { ozonExpandedDay = ozonExpandedDay === dayId ? null : dayId; renderWeekView('Ozon'); }
}

function handleStatusChange(ev) {
    var s = ev.target;
    if (!s.classList.contains('status-select')) return;
    var mp = s.dataset.mp, id = s.dataset.id, st = s.value;
    var arr = mp === 'Wildberries' ? wbShipments : ozonShipments;
    var sh = arr.find(function(x) { return String(x.id) === String(id); });
    if (sh) {
        sh.status = st;
        saveAllToLocalStorage();
        if (isOnline) { var col = mp === 'Wildberries' ? 'shipments_wb' : 'shipments_ozon'; db.collection(col).doc(String(id)).update({ status: st }).catch(function() {}); }
    }
}

// ============ STOCK PARSER ============
function StockParserJS() { }
StockParserJS.prototype.parseStockReport = function(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = new Uint8Array(e.target.result), wb = XLSX.read(data, { type: 'array', cellFormula: false, cellNF: true });
                var sheet = wb.Sheets[wb.SheetNames[0]], rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
                var f = this.findHeaderRow(rows);
                if (!f.columnIndices || Object.keys(f.columnIndices).length < 2) throw new Error("Заголовки не найдены");
                var items = this.parseDataRows(rows, f.headerRowIndex, f.columnIndices);
                resolve({ items: items, fileName: file.name, totalBalance: items.reduce(function(s, i) { return s + i.balance; }, 0), totalWaiting: items.reduce(function(s, i) { return s + i.waiting; }, 0) });
            } catch (err) { reject(err); }
        }.bind(this);
        reader.onerror = function() { reject('Ошибка'); };
        reader.readAsArrayBuffer(file);
    }.bind(this));
};
StockParserJS.prototype.findHeaderRow = function(rows) {
    for (var i = 0; i < Math.min(20, rows.length); i++) {
        var row = rows[i]; if (!row) continue;
        var mc = 0, ind = {};
        for (var col = 0; col < row.length; col++) {
            var cell = String(row[col] || '').trim();
            if (cell.includes('Артикул')) { ind['Артикул'] = col; mc++; }
            if (cell.includes('Наименование') || cell.includes('Номенклатура')) { ind['Наименование'] = col; mc++; }
            if (cell.includes('Ожидание') || cell.includes('В пути')) { ind['Ожидание'] = col; mc++; }
            if (cell.includes('Остаток') || cell.includes('Доступно')) { ind['Остаток'] = col; mc++; }
        }
        if (mc >= 2) return { headerRowIndex: i, columnIndices: ind };
    }
    return { headerRowIndex: 0, columnIndices: null };
};
StockParserJS.prototype.parseDataRows = function(rows, hri, ci) {
    var items = [];
    for (var i = hri + 1; i < rows.length; i++) {
        var row = rows[i]; if (!row) continue;
        var a = this.getCellString(row, ci['Артикул']), n = this.getCellString(row, ci['Наименование']);
        if (!a && !n) continue;
        items.push({ article: a.trim(), name: n.trim(), waiting: this.getCellNumber(row, ci['Ожидание']), balance: this.getCellNumber(row, ci['Остаток']) });
    }
    return items;
};
StockParserJS.prototype.getCellString = function(row, ci) { if (ci === undefined || ci >= row.length) return ''; var c = row[ci]; return c === undefined || c === null ? '' : String(c).trim(); };
StockParserJS.prototype.getCellNumber = function(row, ci) {
    if (ci === undefined || ci >= row.length) return 0;
    var c = row[ci];
    if (c === undefined || c === null) return 0;
    if (typeof c === 'number') return Math.round(c);
    var s = String(c).trim();
    if (!s) return 0;
    var n = parseInt(s.replace(/[^\d.-]/g, ''), 10);
    return isNaN(n) ? 0 : n;
};
var stockParser = new StockParserJS();

// ============ STOCK FUNCTIONS ============
function updateStockStatusBar(prefix) {
    var dot = document.getElementById(prefix + 'StatusDot'), text = document.getElementById(prefix + 'StatusText');
    var fileTag = document.getElementById(prefix + 'FileTag'), fileName = document.getElementById(prefix + 'FileName');
    var excelBtn = document.getElementById(prefix === 'ms' ? 'btnUploadMsExcel' : 'btnUpload' + (prefix === 'wb' ? 'Wb' : 'Ozon') + 'Excel');
    var lastUpdate = prefix === 'ms' ? msStockLastUpdate : (prefix === 'wb' ? wbStockLastUpdate : ozonStockLastUpdate);
    var source = prefix === 'ms' ? msStockSource : (prefix === 'wb' ? wbStockSource : ozonStockSource);
    var stockFileName = prefix === 'ms' ? msStockFileName : (prefix === 'wb' ? wbStockFileName : ozonStockFileName);
    if (!dot || !text) return;
    if (source === 'excel') {
        dot.className = 'status-dot fresh';
        text.textContent = 'Загружено из файла';
        if (fileTag) fileTag.style.display = 'inline-flex';
        if (fileName) fileName.textContent = '📄 ' + stockFileName;
        if (excelBtn) excelBtn.innerHTML = '<span class="excel-icon">📎</span> Заменить файл';
        return;
    }
    if (fileTag) fileTag.style.display = 'none';
    if (excelBtn) excelBtn.innerHTML = '<span class="excel-icon">📎</span> Загрузить Excel';
    if (!lastUpdate) { dot.className = 'status-dot old'; text.textContent = 'Нет данных об остатках'; return; }
    var lastUpdateDate = new Date(lastUpdate);
    var now = new Date();
    var diffMin = Math.floor((now - lastUpdateDate) / 60000);
    if (diffMin < 1) { dot.className = 'status-dot fresh'; text.textContent = 'Обновлено только что'; }
    else if (diffMin < 5) { dot.className = 'status-dot fresh'; text.textContent = 'Обновлено ' + diffMin + ' мин. назад'; }
    else if (diffMin < 15) { dot.className = 'status-dot normal'; text.textContent = 'Обновлено ' + diffMin + ' мин. назад'; }
    else { dot.className = 'status-dot old'; text.textContent = 'Обновлено ' + diffMin + ' мин. назад'; }
}

async function refreshStockFromFirebase(prefix) {
    var docName = prefix === 'ms' ? 'msStock' : (prefix === 'wb' ? 'wbStock' : 'ozonStock');
    var source = prefix === 'ms' ? msStockSource : (prefix === 'wb' ? wbStockSource : ozonStockSource);
    try {
        var doc = await db.collection('settings').doc(docName).get();
        if (doc.exists) {
            var d = doc.data();
            if (source !== 'excel') {
                if (prefix === 'ms') msStockData = d.items || [];
                else if (prefix === 'wb') wbStockData = d.items || [];
                else ozonStockData = d.items || [];
                if (d.updatedAt) {
                    var lu = d.updatedAt.toDate ? d.updatedAt.toDate().toISOString() : d.updatedAt;
                    if (prefix === 'ms') msStockLastUpdate = lu;
                    else if (prefix === 'wb') wbStockLastUpdate = lu;
                    else ozonStockLastUpdate = lu;
                }
                saveAllToLocalStorage();
                if (prefix === 'ms') renderMsStock();
                else if (prefix === 'wb') renderWbStock();
                else renderOzonStock();
            }
            updateStockStatusBar(prefix);
            showToast('Остатки обновлены');
        } else { showToast('Данные не найдены'); }
    } catch (e) { showToast('Ошибка обновления'); }
}

function removeStockFile(prefix) {
    if (prefix === 'ms') { msStockData = []; msStockSource = 'firebase'; msStockFileName = ''; msStockPage = 1; msStockLastUpdate = localStorage.getItem('msStockLastUpdate') || null; }
    else if (prefix === 'wb') { wbStockData = []; wbStockSource = 'firebase'; wbStockFileName = ''; wbStockLastUpdate = localStorage.getItem('wbStockLastUpdate') || null; }
    else { ozonStockData = []; ozonStockSource = 'firebase'; ozonStockFileName = ''; ozonStockLastUpdate = localStorage.getItem('ozonStockLastUpdate') || null; }
    saveAllToLocalStorage();
    updateStockStatusBar(prefix);
    if (isOnline) {
        var docName = prefix === 'ms' ? 'msStock' : (prefix === 'wb' ? 'wbStock' : 'ozonStock');
        db.collection('settings').doc(docName).get().then(function(doc) { if (doc.exists) { var d = doc.data(); if (prefix === 'ms' && msStockSource === 'firebase') { msStockData = d.items || []; if (d.updatedAt) msStockLastUpdate = d.updatedAt.toDate ? d.updatedAt.toDate().toISOString() : d.updatedAt; } else if (prefix === 'wb' && wbStockSource === 'firebase') { wbStockData = d.items || []; if (d.updatedAt) wbStockLastUpdate = d.updatedAt.toDate ? d.updatedAt.toDate().toISOString() : d.updatedAt; } else if (prefix === 'ozon' && ozonStockSource === 'firebase') { ozonStockData = d.items || []; if (d.updatedAt) ozonStockLastUpdate = d.updatedAt.toDate ? d.updatedAt.toDate().toISOString() : d.updatedAt; } saveAllToLocalStorage(); updateStockStatusBar(prefix); if (prefix === 'ms') renderMsStock(); else if (prefix === 'wb') renderWbStock(); else renderOzonStock(); } }).catch(function() {});
    }
    if (prefix === 'ms') renderMsStock();
    else if (prefix === 'wb') renderWbStock();
    else renderOzonStock();
}

async function handleStockFileUpload(prefix, file) {
    try {
        var r = await stockParser.parseStockReport(file);
        if (prefix === 'wb') { wbStockData = r.items; wbStockSource = 'excel'; wbStockFileName = file.name; }
        else if (prefix === 'ozon') { ozonStockData = r.items; ozonStockSource = 'excel'; ozonStockFileName = file.name; }
        else { msStockData = r.items; msStockSource = 'excel'; msStockFileName = file.name; msStockPage = 1; }
        saveAllToLocalStorage();
        updateStockStatusBar(prefix === 'ozon' ? 'ozon' : (prefix === 'wb' ? 'wb' : 'ms'));
        if (prefix === 'wb') renderWbStock();
        else if (prefix === 'ozon') renderOzonStock();
        else renderMsStock();
        showToast('Excel загружен: ' + r.items.length + ' поз.');
    } catch (err) { showToast('Ошибка: ' + err.message); }
}

function getFilteredStockData(mp) {
    var data = mp === 'WB' ? wbStockData : ozonStockData;
    var se = document.getElementById(mp === 'WB' ? 'wbStockSearch' : 'ozonStockSearch'), be = document.getElementById(mp === 'WB' ? 'wbStockBalanceFilter' : 'ozonStockBalanceFilter'), we = document.getElementById(mp === 'WB' ? 'wbStockWaitingFilter' : 'ozonStockWaitingFilter');
    var f = data.slice(), q = (se ? se.value : '').trim().toLowerCase();
    if (q) f = f.filter(function(i) { return i.article.toLowerCase().includes(q) || i.name.toLowerCase().includes(q); });
    var bf = be ? be.value : 'all';
    if (bf === 'positive') f = f.filter(function(i) { return i.balance > 0; });
    else if (bf === 'zero') f = f.filter(function(i) { return i.balance === 0; });
    else if (bf === 'negative') f = f.filter(function(i) { return i.balance < 0; });
    var wf = we ? we.value : 'all';
    if (wf === 'positive') f = f.filter(function(i) { return i.waiting > 0; });
    else if (wf === 'zero') f = f.filter(function(i) { return i.waiting === 0; });
    return f;
}

function renderStockStats(mp) {
    var data = mp === 'WB' ? wbStockData : ozonStockData;
    var c = document.getElementById(mp === 'WB' ? 'wbStockStats' : 'ozonStockStats');
    if (!c || !data.length) { if (c) c.innerHTML = ''; return; }
    var tb = data.reduce(function(s, i) { return s + i.balance; }, 0), tw = data.reduce(function(s, i) { return s + i.waiting; }, 0);
    c.innerHTML = '<div class="stock-stat-card"><div class="ss-value">' + data.length.toLocaleString('ru-RU') + '</div><div class="ss-label">Всего</div></div><div class="stock-stat-card ss-success"><div class="ss-value">' + tb.toLocaleString('ru-RU') + '</div><div class="ss-label">Остаток</div></div><div class="stock-stat-card ss-warning"><div class="ss-value">' + tw.toLocaleString('ru-RU') + '</div><div class="ss-label">В ожидании</div></div><div class="stock-stat-card ss-info"><div class="ss-value">' + data.filter(function(i) { return i.balance > 0; }).length.toLocaleString('ru-RU') + '</div><div class="ss-label">С остатком</div></div>';
}

function renderStockTable(mp) {
    var data = mp === 'WB' ? wbStockData : ozonStockData;
    var c = document.getElementById(mp === 'WB' ? 'wbStockTable' : 'ozonStockTable'), fe = document.getElementById(mp === 'WB' ? 'wbStockFilters' : 'ozonStockFilters');
    if (!c) return;
    if (!data.length) { c.innerHTML = '<div class="empty-state">Нет данных</div>'; if (fe) fe.style.display = 'none'; return; }
    if (fe) fe.style.display = 'flex';
    var f = getFilteredStockData(mp);
    if (!f.length) { c.innerHTML = '<div class="stock-empty-filter">Нет данных</div>'; return; }
    var h = '<table><thead><tr><th>Артикул</th><th>Наименование</th><th class="num">Ожидание</th><th class="num">Остаток</th></tr></thead><tbody>';
    f.forEach(function(i) { h += '<tr><td>' + escapeHtml(i.article) + '</td><td>' + escapeHtml(i.name) + '</td><td class="num">' + i.waiting.toLocaleString('ru-RU') + '</td><td class="num"><b>' + i.balance.toLocaleString('ru-RU') + '</b></td></tr>'; });
    h += '</tbody></table><div style="padding:10px;font-size:11px">' + f.length + ' из ' + data.length + '</div>';
    c.innerHTML = h;
}

function renderWbStock() { updateStockStatusBar('wb'); renderStockStats('WB'); renderStockTable('WB'); }
function renderOzonStock() { updateStockStatusBar('ozon'); renderStockStats('Ozon'); renderStockTable('Ozon'); }

function exportStockCSV(mp) {
    var data = getFilteredStockData(mp);
    if (!data.length) { showToast('Нет данных'); return; }
    var csv = 'Артикул;Наименование;Ожидание;Остаток\n';
    data.forEach(function(i) { csv += '"' + i.article + '";"' + i.name + '";' + i.waiting + ';' + i.balance + '\n'; });
    downloadCSV(csv, 'остатки_' + mp.toLowerCase() + '.csv');
}

function resetStockFilters(mp) {
    var se = document.getElementById(mp === 'WB' ? 'wbStockSearch' : 'ozonStockSearch'), be = document.getElementById(mp === 'WB' ? 'wbStockBalanceFilter' : 'ozonStockBalanceFilter'), we = document.getElementById(mp === 'WB' ? 'wbStockWaitingFilter' : 'ozonStockWaitingFilter');
    if (se) se.value = ''; if (be) be.value = 'all'; if (we) we.value = 'all';
    if (mp === 'WB') renderWbStock(); else renderOzonStock();
}

function getFilteredMsStockData() {
    var se = document.getElementById('msStockSearch'), be = document.getElementById('msStockBalanceFilter'), we = document.getElementById('msStockWaitingFilter'), me = document.getElementById('msStockMatchFilter');
    var f = msStockData.slice(), q = (se ? se.value : '').trim().toLowerCase();
    if (q) f = f.filter(function(i) { return i.article.toLowerCase().includes(q) || i.name.toLowerCase().includes(q); });
    var bf = be ? be.value : 'all';
    if (bf === 'positive') f = f.filter(function(i) { return i.balance > 0; });
    else if (bf === 'zero') f = f.filter(function(i) { return i.balance === 0; });
    else if (bf === 'negative') f = f.filter(function(i) { return i.balance < 0; });
    var wf = we ? we.value : 'all';
    if (wf === 'positive') f = f.filter(function(i) { return i.waiting > 0; });
    else if (wf === 'zero') f = f.filter(function(i) { return i.waiting === 0; });
    var mf = me ? me.value : 'all';
    return f;
}

function matchMsWithPlatforms(msItem) {
    var r = { wb: null, ozon: null };
    var wm = wbStockData.find(function(i) { return i.article === msItem.article; });
    if (wm) r.wb = wm;
    var om = ozonStockData.find(function(i) { return i.article === msItem.article; });
    if (om) r.ozon = om;
    return r;
}

function renderMsStockStats() {
    var c = document.getElementById('msStockStats');
    if (!c) return;
    if (!msStockData.length) { c.innerHTML = ''; return; }
    var tb = msStockData.reduce(function(s, i) { return s + i.balance; }, 0), tw = msStockData.reduce(function(s, i) { return s + i.waiting; }, 0), mc = 0;
    msStockData.forEach(function(i) { var mm = matchMsWithPlatforms(i); if (mm.wb || mm.ozon) mc++; });
    c.innerHTML = '<div class="stock-stat-card clickable" id="msStatAll"><div class="ss-value">' + msStockData.length.toLocaleString('ru-RU') + '</div><div class="ss-label">Всего позиций</div></div><div class="stock-stat-card ss-success clickable" id="msStatBalance"><div class="ss-value">' + tb.toLocaleString('ru-RU') + '</div><div class="ss-label">Общий остаток</div></div><div class="stock-stat-card ss-warning clickable" id="msStatWaiting"><div class="ss-value">' + tw.toLocaleString('ru-RU') + '</div><div class="ss-label">В ожидании</div></div><div class="stock-stat-card ss-info"><div class="ss-value">' + mc.toLocaleString('ru-RU') + '</div><div class="ss-label">С привязкой к площадкам</div></div>';
}

function renderMsStockComparison() {
    var grid = document.getElementById('msStockComparisonGrid');
    if (!grid) return;
    if (!msStockData.length) { grid.style.display = 'none'; return; }
    var hWb = wbStockData.length > 0, hOz = ozonStockData.length > 0;
    if (!hWb && !hOz) { grid.style.display = 'none'; return; }
    grid.style.display = 'grid';
    var wc = 0, wb = 0, oc = 0, ob = 0, fm = 0, pm = 0, um = 0;
    msStockData.forEach(function(i) { var mm = matchMsWithPlatforms(i); var hasWb = mm.wb !== null, hasOz = mm.ozon !== null; if (hasWb && hasOz) fm++; else if (hasWb || hasOz) pm++; else um++; if (hasWb) { wc++; wb += mm.wb.balance; } if (hasOz) { oc++; ob += mm.ozon.balance; } });
    document.getElementById('msWbMatchCount').textContent = wc.toLocaleString('ru-RU');
    document.getElementById('msWbMatchBalance').textContent = wb.toLocaleString('ru-RU');
    document.getElementById('msOzonMatchCount').textContent = oc.toLocaleString('ru-RU');
    document.getElementById('msOzonMatchBalance').textContent = ob.toLocaleString('ru-RU');
    document.getElementById('msFullyMatched').textContent = fm.toLocaleString('ru-RU');
    document.getElementById('msPartiallyMatched').textContent = pm.toLocaleString('ru-RU');
    document.getElementById('msUnmatchedCount').textContent = um.toLocaleString('ru-RU');
}

function renderMsStockTable() {
    var c = document.getElementById('msStockTable'), fe = document.getElementById('msStockFilters');
    if (!c) return;
    if (!msStockData.length) { c.innerHTML = '<div class="empty-state">Нет данных</div>'; if (fe) fe.style.display = 'none'; return; }
    if (fe) fe.style.display = 'flex';
    var f = getFilteredMsStockData();
    if (!f.length) { c.innerHTML = '<div class="stock-empty-filter">Нет данных</div>'; return; }
    var totalItems = f.length;
    var totalPages = Math.ceil(totalItems / msStockPerPage);
    if (msStockPage > totalPages) msStockPage = totalPages;
    if (msStockPage < 1) msStockPage = 1;
    var start = (msStockPage - 1) * msStockPerPage;
    var pageItems = f.slice(start, start + msStockPerPage);
    var h = '<table><thead><tr><th>Артикул</th><th>Наименование</th><th class="num">Ожидание</th><th class="num">Остаток МС</th>';
    if (wbStockData.length > 0) h += '<th class="num">WB</th>';
    if (ozonStockData.length > 0) h += '<th class="num">Ozon</th>';
    h += '<th>Площадки</th></tr></thead><tbody>';
    pageItems.forEach(function(i) {
        var mm = matchMsWithPlatforms(i), pb = [];
        if (mm.wb) pb.push('<span class="stock-match-indicator wb-match">WB</span>');
        if (mm.ozon) pb.push('<span class="stock-match-indicator ozon-match">Ozon</span>');
        if (!mm.wb && !mm.ozon) pb.push('<span class="stock-match-indicator no-match">—</span>');
        h += '<tr><td>' + escapeHtml(i.article) + '</td><td>' + escapeHtml(i.name) + '</td><td class="num">' + i.waiting.toLocaleString('ru-RU') + '</td><td class="num"><b>' + i.balance.toLocaleString('ru-RU') + '</b></td>';
        if (wbStockData.length > 0) h += '<td class="num">' + (mm.wb ? mm.wb.balance.toLocaleString('ru-RU') : '—') + '</td>';
        if (ozonStockData.length > 0) h += '<td class="num">' + (mm.ozon ? mm.ozon.balance.toLocaleString('ru-RU') : '—') + '</td>';
        h += '<td>' + pb.join(' ') + '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<div class="pagination">';
    h += '<span class="page-info">Показано ' + (start + 1) + '–' + Math.min(start + msStockPerPage, totalItems) + ' из ' + totalItems.toLocaleString('ru-RU') + '</span>';
    h += '<button type="button" class="page-btn" data-ms-page="first" ' + (msStockPage === 1 ? 'disabled' : '') + '>«</button>';
    h += '<button type="button" class="page-btn" data-ms-page="prev" ' + (msStockPage === 1 ? 'disabled' : '') + '>◀</button>';
    var maxButtons = 5;
    var startPage = Math.max(1, msStockPage - Math.floor(maxButtons / 2));
    var endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) startPage = Math.max(1, endPage - maxButtons + 1);
    for (var p = startPage; p <= endPage; p++) { h += '<button type="button" class="page-btn' + (p === msStockPage ? ' active' : '') + '" data-ms-page="' + p + '">' + p + '</button>'; }
    h += '<button type="button" class="page-btn" data-ms-page="next" ' + (msStockPage === totalPages ? 'disabled' : '') + '>▶</button>';
    h += '<button type="button" class="page-btn" data-ms-page="last" ' + (msStockPage === totalPages ? 'disabled' : '') + '>»</button>';
    h += '</div>';
    c.innerHTML = h;
}

function renderMsStock() { updateStockStatusBar('ms'); renderMsStockStats(); renderMsStockComparison(); renderMsStockTable(); }
function exportMsStockCSV() {
    var data = getFilteredMsStockData();
    if (!data.length) { showToast('Нет данных'); return; }
    var csv = 'Артикул;Наименование;Ожидание;Остаток МС;Площадки\n';
    data.forEach(function(i) { var mm = matchMsWithPlatforms(i), pl = []; if (mm.wb) pl.push('WB'); if (mm.ozon) pl.push('Ozon'); csv += '"' + i.article + '";"' + i.name + '";' + i.waiting + ';' + i.balance + ';' + (pl.join('+') || '—') + '\n'; });
    downloadCSV(csv, 'остатки_мс.csv');
}

function resetMsStockFilters() {
    var se = document.getElementById('msStockSearch'), be = document.getElementById('msStockBalanceFilter'), we = document.getElementById('msStockWaitingFilter'), me = document.getElementById('msStockMatchFilter');
    if (se) se.value = ''; if (be) be.value = 'all'; if (we) we.value = 'all'; if (me) me.value = 'all';
    msStockPage = 1; renderMsStock();
}

// ============ LOGISTICS ============
function calculateMonthAnalytics(mi, y) {
    var wbe = logEntries.filter(function(e) { return e.marketplace === 'Wildberries' && e.date && new Date(e.date + 'T00:00:00').getMonth() === mi && new Date(e.date + 'T00:00:00').getFullYear() === y; });
    var oze = logEntries.filter(function(e) { return e.marketplace === 'Ozon' && e.date && new Date(e.date + 'T00:00:00').getMonth() === mi && new Date(e.date + 'T00:00:00').getFullYear() === y; });
    function calc(entries) { var tq = entries.reduce(function(s, e) { return s + (e.qty || 0); }, 0), ta = entries.reduce(function(s, e) { return s + (e.amountFull || e.amount || 0); }, 0), ppu = tq > 0 ? (ta / tq).toFixed(2) : '0.00'; return { qty: tq, amount: ta, pricePerUnit: ppu, entries: entries.length }; }
    var wb = calc(wbe), oz = calc(oze);
    return { wb: wb, oz: oz, total: { qty: wb.qty + oz.qty, amount: wb.amount + oz.amount, pricePerUnit: (wb.qty + oz.qty) > 0 ? ((wb.amount + oz.amount) / (wb.qty + oz.qty)).toFixed(2) : '0.00', entries: wb.entries + oz.entries }, month: MONTHS[mi], year: y };
}

function renderLogAnalytics() {
    var card = document.getElementById('logAnalyticsCard');
    if (!card) return;

    // Current month summary
    var now = new Date(), cm = now.getMonth(), cy = now.getFullYear();
    var cur = calculateMonthAnalytics(cm, cy);
    var h = '<div class="log-card"><div class="log-card-header"><span class="log-card-title">📊 Сводная</span><span class="log-card-month">Текущий месяц: ' + cur.month + ' ' + cur.year + '</span></div>';
    h += '<table class="log-table"><thead><tr><th></th><th class="num">Товаров</th><th class="num">Сумма</th><th class="num">Цена/ед</th></tr></thead><tbody>';
    h += '<tr class="row-total"><td>Всего</td><td class="num">' + cur.total.qty.toLocaleString('ru-RU') + '</td><td class="num">' + formatAmount(cur.total.amount) + '</td><td class="num">' + cur.total.pricePerUnit + ' ₽</td></tr>';
    h += '<tr class="row-wb"><td>WB</td><td class="num">' + cur.wb.qty.toLocaleString('ru-RU') + '</td><td class="num">' + formatAmount(cur.wb.amount) + '</td><td class="num">' + cur.wb.pricePerUnit + ' ₽</td></tr>';
    h += '<tr class="row-ozon"><td>Ozon</td><td class="num">' + cur.oz.qty.toLocaleString('ru-RU') + '</td><td class="num">' + formatAmount(cur.oz.amount) + '</td><td class="num">' + cur.oz.pricePerUnit + ' ₽</td></tr>';
    h += '</tbody></table>';

    // Monthly history — expandable inside the same card
    var byMonth = {};
    logEntries.forEach(function(e) {
        if (!e.date) return;
        var m = e.date.slice(0, 7);
        if (!byMonth[m]) byMonth[m] = { wbQty: 0, ozQty: 0, wbAmount: 0, ozAmount: 0, totalQty: 0, totalAmount: 0 };
        var qty = e.qty || 0, amount = e.amountFull || e.amount || 0;
        byMonth[m].totalQty += qty;
        byMonth[m].totalAmount += amount;
        if (e.marketplace === 'Wildberries') { byMonth[m].wbQty += qty; byMonth[m].wbAmount += amount; }
        else { byMonth[m].ozQty += qty; byMonth[m].ozAmount += amount; }
    });
    var months = Object.keys(byMonth).sort().reverse();

    h += '<div class="log-history-toggle" id="logMonthsToggle"><span class="toggle-arrow">▶</span> Показать историю по месяцам <span style="margin-left:auto;font-size:10px;color:var(--text-tertiary)">' + months.length + ' мес.</span></div>';
    h += '<div class="log-history-body" id="logMonthsBody" style="display:none">';
    h += '<table class="log-table"><thead><tr><th>Месяц</th><th class="num">Всего товаров</th><th class="num">Всего сумма</th><th class="num">Ср. цена/ед</th><th class="num">WB</th><th class="num">Ozon</th></tr></thead><tbody>';
    months.forEach(function(m) {
        var d = byMonth[m];
        var avgPrice = d.totalQty > 0 ? (d.totalAmount / d.totalQty).toFixed(2) : '0.00';
        h += '<tr><td><b>' + m + '</b></td><td class="num">' + d.totalQty.toLocaleString('ru-RU') + '</td><td class="num">' + formatAmount(d.totalAmount) + ' ₽</td><td class="num">' + avgPrice + ' ₽</td><td class="num"><span class="badge badge-wb">' + d.wbQty.toLocaleString('ru-RU') + '</span></td><td class="num"><span class="badge badge-ozon">' + d.ozQty.toLocaleString('ru-RU') + '</span></td></tr>';
    });
    h += '</tbody></table></div></div>';

    card.innerHTML = h;

    // Bind toggle
    var toggle = document.getElementById('logMonthsToggle');
    var body = document.getElementById('logMonthsBody');
    if (toggle && body) {
        toggle.onclick = function() {
            var isOpen = body.style.display !== 'none';
            body.style.display = isOpen ? 'none' : 'block';
            toggle.classList.toggle('expanded', !isOpen);
            toggle.innerHTML = isOpen 
                ? '<span class="toggle-arrow">▶</span> Показать историю по месяцам <span style="margin-left:auto;font-size:10px;color:var(--text-tertiary)">' + months.length + ' мес.</span>'
                : '<span class="toggle-arrow">▼</span> Скрыть историю';
        };
    }
}

function renderLog() {
    var tc = document.getElementById('logTable'), cnt = document.getElementById('logCount');
    if (!tc) return;
    var fm = document.getElementById('logFilterMonth') ? document.getElementById('logFilterMonth').value : '';
    var fs = document.getElementById('logFilterStatus') ? document.getElementById('logFilterStatus').value : 'all';
    var fmp = document.getElementById('logFilterMP') ? document.getElementById('logFilterMP').value : 'all';
    var fl = logEntries.slice();
    if (fm) fl = fl.filter(function(e) { return e.date && e.date.startsWith(fm); });
    if (fs === 'paid') fl = fl.filter(function(e) { return e.paid; });
    if (fs === 'unpaid') fl = fl.filter(function(e) { return !e.paid; });
    if (fmp !== 'all') fl = fl.filter(function(e) { return e.marketplace === fmp; });
    fl.sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });
    if (cnt) cnt.textContent = fl.length;
    if (!fl.length) { tc.innerHTML = '<div class="empty-state">Нет записей</div>'; return; }
    var h = '<table><thead><tr><th>Дата</th><th>МП</th><th>Тип</th><th>Поставщик</th><th>Город</th><th class="num">Кол-во</th><th class="num">Пал.</th><th class="num">Сумма</th><th>НДС</th><th>Оплата</th><th></th></tr></thead><tbody>';
    fl.forEach(function(e) {
        h += '<tr><td>' + e.date.split('-').reverse().join('.') + '</td><td><span class="badge ' + (e.marketplace === 'Wildberries' ? 'badge-wb' : 'badge-ozon') + '">' + escapeHtml(e.marketplace) + '</span></td><td>' + escapeHtml(e.type || 'FBO') + '</td><td><select class="log-select" data-log-supplier="' + e.id + '">' + SUPPLIERS.map(function(s) { return '<option value="' + s + '" ' + (e.supplier === s ? 'selected' : '') + '>' + (s || '—') + '</option>'; }).join('') + '</select></td><td>' + escapeHtml(e.city || '') + '</td><td class="num">' + (e.qty || 0).toLocaleString('ru-RU') + '</td><td class="num"><input class="log-edit-input" value="' + (e.boxes || 0) + '" data-log-pallets="' + e.id + '"></td><td class="num"><input class="log-edit-input" value="' + (e.amount || '') + '" data-log-amount="' + e.id + '"></td><td><select class="log-select" data-log-nds="' + e.id + '"><option value="22%" ' + (e.nds === '22%' ? 'selected' : '') + '>22%</option><option value="7%" ' + (e.nds === '7%' ? 'selected' : '') + '>7%</option></select></td><td><button type="button" class="btn-status ' + (e.paid ? 'paid' : 'unpaid') + '" data-log-paid="' + e.id + '">' + (e.paid ? 'Оплачен' : 'Не опл.') + '</button></td><td><button type="button" class="btn btn-danger-sm" data-log-delete="' + e.id + '">x</button></td></tr>';
    });
    h += '</tbody></table>';
    tc.innerHTML = h;
}

function updateLogSupplier(id, v) { var e = logEntries.find(function(x) { return String(x.id) === String(id); }); if (e) { e.supplier = v; saveAllToLocalStorage(); if (isOnline) db.collection('logistics').doc(String(id)).update({ supplier: v }).catch(function() {}); } }
function updateLogPallets(id, v) { var e = logEntries.find(function(x) { return String(x.id) === String(id); }); if (e) { e.boxes = parseInt(v) || 0; saveAllToLocalStorage(); if (isOnline) db.collection('logistics').doc(String(id)).update({ boxes: e.boxes }).catch(function() {}); } }
var logAnalyticsDebounceTimer = null;
function debounceRenderLogAnalytics() {
    if (logAnalyticsDebounceTimer) clearTimeout(logAnalyticsDebounceTimer);
    logAnalyticsDebounceTimer = setTimeout(function() { renderLogAnalytics(); }, 500);
}
function updateLogAmount(id, v) { var e = logEntries.find(function(x) { return String(x.id) === String(id); }); if (e) { var a = parseFloat(v) || 0, rate = e.nds === '22%' ? 1.22 : 1.07; e.amount = a; e.amountFull = Math.round(a * rate * 100) / 100; saveAllToLocalStorage(); if (isOnline) db.collection('logistics').doc(String(id)).update({ amount: e.amount, amountFull: e.amountFull }).catch(function() {}); debounceRenderLogAnalytics(); } }
function updateLogNds(id, v) { var e = logEntries.find(function(x) { return String(x.id) === String(id); }); if (e) { e.nds = v; var rate = v === '22%' ? 1.22 : 1.07; e.amountFull = Math.round((e.amount || 0) * rate * 100) / 100; saveAllToLocalStorage(); if (isOnline) db.collection('logistics').doc(String(id)).update({ nds: v, amountFull: e.amountFull }).catch(function() {}); debounceRenderLogAnalytics(); } }
function toggleLogPaid(id) { var e = logEntries.find(function(x) { return String(x.id) === String(id); }); if (e) { e.paid = !e.paid; saveAllToLocalStorage(); if (isOnline) db.collection('logistics').doc(String(id)).update({ paid: e.paid }).catch(function() {}); var btn = document.querySelector('[data-log-paid="' + id + '"]'); if (btn) { btn.className = 'btn-status ' + (e.paid ? 'paid' : 'unpaid'); btn.textContent = e.paid ? 'Оплачен' : 'Не опл.'; } } }

async function addLogEntry() {
    var de = document.getElementById('logDate'), me = document.getElementById('logMP'), te = document.getElementById('logType'), se = document.getElementById('logSupplier'), ce = document.getElementById('logCity'), qe = document.getElementById('logQty'), be = document.getElementById('logBoxes'), ae = document.getElementById('logAmount'), ne = document.getElementById('logNDS');
    if (!de || !ce || !qe || !ae) return;
    var date = de.value, mp = me ? me.value : 'Wildberries', type = te ? te.value : 'FBO', supplier = se ? se.value : '', city = ce.value.trim(), qty = parseInt(qe.value) || 0, boxes = be ? parseInt(be.value) || 0 : 0, amount = parseFloat(ae.value) || 0, nds = ne ? ne.value : '22%', rate = nds === '22%' ? 1.22 : 1.07;
    if (!date || !city || qty <= 0 || amount <= 0) { alert('Заполните поля'); return; }
    var entry = { id: generateUniqueId(), date: date, marketplace: mp, type: type, supplier: supplier, city: city, qty: qty, boxes: boxes, amount: amount, amountFull: Math.round(amount * rate * 100) / 100, paid: false, nds: nds, source: 'Логистика' };
    logEntries.push(entry);
    if (isOnline) try { await db.collection('logistics').doc(entry.id).set(entry); } catch(e) {}
    saveAllToLocalStorage();
    ['logQty', 'logBoxes', 'logAmount', 'logCity'].forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
    renderLog();
    renderLogAnalytics();
    showToast('Добавлено');
}

function resetLogFilters() {
    var fme = document.getElementById('logFilterMonth'), fse = document.getElementById('logFilterStatus'), fmpe = document.getElementById('logFilterMP');
    if (fme) fme.value = ''; if (fse) fse.value = 'all'; if (fmpe) fmpe.value = 'all';
    renderLog();
}

function toggleLogImport() { var b = document.getElementById('logImportBlock'); if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none'; }

async function doLogImport() {
    var te = document.getElementById('logImportText');
    if (!te) return;
    var text = te.value.trim();
    if (!text) return;
    var lc = 0, wc = 0, oc = 0, nl = [], nw = [], no = [];
    text.split('\n').filter(function(l) { return l.trim(); }).forEach(function(line) {
        var cols = line.split('\t');
        if (cols.length < 4) cols = line.split(/[\t,;]/);
        if (cols.length >= 4) {
            var ds = cols[0].trim(), mpR = cols[1].trim(), type = cols.length > 2 ? cols[2].trim() : 'FBO', supplier = cols.length > 3 ? cols[3].trim() : '', city = cols.length > 4 ? cols[4].trim() : '', qty = cols.length > 5 ? parseInt(String(cols[5]).replace(/\s/g, '')) || 0 : 0, boxes = cols.length > 6 ? parseInt(String(cols[6]).replace(/\s/g, '')) || 0 : 0, amount = cols.length > 7 ? parseFloat(String(cols[7]).replace(/\s/g, '').replace(',', '.')) || 0 : 0, ps = cols.length > 8 ? cols[8].trim().toLowerCase() : '', nds = cols.length > 9 ? cols[9].trim() : '22%';
            var mp = null;
            if (['Wildberries', 'WB', 'ВБ'].indexOf(mpR) >= 0) mp = 'Wildberries';
            else if (['Ozon', 'Озон'].indexOf(mpR) >= 0) mp = 'Ozon';
            else return;
            var n = normalizeDateString(ds);
            if (!n) return;
            var paid = ps === 'paid' || ps === 'оплачен' || ps === 'true' || ps === '1';
            var rate = nds === '22%' ? 1.22 : 1.07;
            var lid = generateUniqueId();
            var le = { id: generateUniqueId(), date: n, marketplace: mp, type: type || 'FBO', supplier: supplier || '', city: city, qty: qty, boxes: boxes, amount: amount, amountFull: Math.round(amount * rate * 100) / 100, paid: paid, nds: nds || '22%', source: 'Импорт', linkId: lid };
            nl.push(le);
            lc++;
            if (mp === 'Wildberries' && !wbShipments.some(function(s) { return s.date === n && s.city === city && s.qty === qty; })) { nw.push({ id: generateUniqueId(), date: n, city: city, qty: qty, source: 'Wildberries', status: 'in_work', linkId: lid }); wc++; }
            if (mp === 'Ozon' && !ozonShipments.some(function(s) { return s.date === n && s.city === city && s.qty === qty; })) { no.push({ id: generateUniqueId(), date: n, city: city, qty: qty, source: 'Ozon', status: 'in_work', linkId: lid }); oc++; }
        }
    });
    if (nl.length > 0) { logEntries = logEntries.concat(nl); wbShipments = wbShipments.concat(nw); ozonShipments = ozonShipments.concat(no); saveAllToLocalStorage(); }
    if (te) te.value = '';
    renderAllDebounced();
    showToast('Импорт: ' + lc + ' записей');
}

async function deleteLogEntry(id) {
    var le = logEntries.find(function(l) { return String(l.id) === String(id); });
    var lid = le ? le.linkId : null;
    if (!confirm('Удалить?')) return;
    logEntries = logEntries.filter(function(l) { return l.id !== id; });
    if (isOnline) try { await db.collection('logistics').doc(String(id)).delete(); } catch(e) {}
    saveAllToLocalStorage();
    renderAllDebounced();
    showToast('Удалено');
}

// ============ SCHEDULE ============
function getAllShipments() {
    var all = [];
    wbShipments.forEach(function(s) { all.push(Object.assign({}, s, { marketplace: s.marketplace || s.source || 'Wildberries' })); });
    ozonShipments.forEach(function(s) { all.push(Object.assign({}, s, { marketplace: s.marketplace || s.source || 'Ozon' })); });
    return all.filter(function(s) { return s.date && typeof s.date === 'string'; });
}

function getCurrentWeekKey() {
    var n = new Date(), y = n.getUTCFullYear(), m = n.getUTCMonth(), d = n.getUTCDate();
    var dt = new Date(Date.UTC(y, m, d)), day = dt.getUTCDay(), dfm = day === 0 ? 6 : day - 1;
    return new Date(Date.UTC(y, m, d - dfm)).toISOString().slice(0, 10);
}

function getWeekKey(ds) {
    if (!ds || typeof ds !== 'string') return { key: 'unk', label: '—' };
    var n = normalizeDateString(ds);
    if (!n) return { key: 'unk', label: '—' };
    var p = n.split('-'), y = parseInt(p[0]), m = parseInt(p[1]) - 1, d = parseInt(p[2]);
    var dt = new Date(Date.UTC(y, m, d));
    if (isNaN(dt.getTime())) return { key: 'unk', label: '—' };
    var day = dt.getUTCDay(), dfm = day === 0 ? 6 : day - 1;
    var mon = new Date(Date.UTC(y, m, d - dfm));
    function fmt(dd) { return dd.getUTCDate().toString().padStart(2, '0') + '.' + (dd.getUTCMonth() + 1).toString().padStart(2, '0'); }
    var sun = new Date(Date.UTC(mon.getUTCFullYear(), mon.getUTCMonth(), mon.getUTCDate() + 6));
    return { key: mon.toISOString().slice(0, 10), label: fmt(mon) + '-' + fmt(sun) };
}

function renderKpiStrip() {
    var strip = document.getElementById('kpiStrip');
    if (!strip) return;
    var cwk = getCurrentWeekKey();
    var all = getAllShipments();
    var weekWb = 0, weekOzon = 0;
    all.forEach(function(s) { var wk = getWeekKey(s.date); if (wk.key === cwk) { if (s.marketplace === 'Wildberries') weekWb += s.qty || 0; else weekOzon += s.qty || 0; } });
    var weekCap = weekCapacities[cwk] || 0;
    if (!weekCap) { for (var key in weekCapacities) { if (!weekCapacities[key]) continue; var keyDate = new Date(key + 'T00:00:00'); var cwkDate = new Date(cwk + 'T00:00:00'); var diff = Math.abs(keyDate.getTime() - cwkDate.getTime()); if (diff <= 3 * 24 * 60 * 60 * 1000) { weekCap = weekCapacities[key] || 0; break; } } }
    var weekTotal = weekWb + weekOzon;
    var packPct = weekCap > 0 ? Math.round((weekTotal / weekCap) * 100) : null;
    var occupied = warehouseData.currentOccupancy, totalCap = warehouseData.totalCapacity, free = totalCap - occupied, loadPct = Math.round((occupied / totalCap) * 100);
    var transitSupplies = vedSupplies.filter(function(s) { return s.status === 'transit'; });
    var transitVolume = transitSupplies.reduce(function(sum, s) { return sum + (s.totalVolume || 0); }, 0);
    var transitCount = transitSupplies.length;
    strip.innerHTML = '<div class="kpi-item"><span class="kpi-item-label">Текущая неделя:</span><span class="kpi-item-value">' + (weekTotal > 0 ? weekTotal.toLocaleString('ru-RU') + ' ед.' : 'Нет отгрузок') + '</span>' + (weekTotal > 0 ? '<span style="font-size:11px;color:var(--text-tertiary);">(WB: ' + weekWb.toLocaleString('ru-RU') + ' · Ozon: ' + weekOzon.toLocaleString('ru-RU') + ')</span>' : '') + '</div><div class="kpi-divider"></div><div class="kpi-item"><span class="kpi-item-label">Загрузка упаковки:</span>' + (weekCap > 0 ? '<span class="kpi-item-value" style="color:' + (packPct > 100 ? 'var(--danger)' : packPct > 80 ? 'var(--warning)' : 'var(--success)') + '">' + packPct + '%</span><span style="font-size:11px;color:var(--text-tertiary);">(' + weekTotal.toLocaleString('ru-RU') + ' из ' + weekCap.toLocaleString('ru-RU') + ' ед.)</span>' : '<span class="kpi-item-value" style="color:var(--text-tertiary);">—</span>') + '</div><div class="kpi-divider"></div><div class="kpi-item"><span class="kpi-item-label">Загрузка склада:</span><span class="kpi-item-value" style="color:' + (loadPct > 85 ? 'var(--danger)' : loadPct > 70 ? 'var(--warning)' : 'var(--success)') + '">' + loadPct + '%</span><span style="font-size:11px;color:var(--text-tertiary);">(занято ' + occupied.toLocaleString('ru-RU') + ' / свободно ' + free.toLocaleString('ru-RU') + ' из ' + totalCap.toLocaleString('ru-RU') + ' м³)</span></div><div class="kpi-divider"></div><div class="kpi-item"><span class="kpi-item-label">ВЭД в пути:</span><span class="kpi-item-value" style="color:var(--ved);">' + transitVolume.toFixed(1) + ' м³</span><span style="font-size:11px;color:var(--text-tertiary);">(' + transitCount + ' поставк' + (transitCount === 1 ? 'а' : transitCount >= 2 && transitCount <= 4 ? 'и' : 'ок') + ')</span></div>';
}

function renderSchedule() {
    var tc = document.getElementById('scheduleTable'), wc = document.getElementById('scheduleWeekCount'), tr = document.getElementById('scheduleTotalRows');
    if (!tc) return;
    var all = getAllShipments(), grp = {};
    all.forEach(function(s) { var wk = getWeekKey(s.date); if (!grp[wk.key]) grp[wk.key] = { label: wk.label, wb: 0, ozon: 0, details: [] }; if (s.marketplace === 'Wildberries') grp[wk.key].wb += s.qty; else grp[wk.key].ozon += s.qty; grp[wk.key].details.push(s); });
    var weeks = Object.keys(grp).sort().reverse(), cwk = getCurrentWeekKey();
    if (wc) wc.textContent = weeks.filter(function(k) { return !k.startsWith('unk'); }).length;
    if (tr) tr.textContent = all.length;
    if (!weeks.length) { tc.innerHTML = '<div class="empty-state">Нет данных</div>'; return; }
    var h = '<table><thead><tr><th>Неделя</th><th class="num">WB</th><th class="num">Ozon</th><th class="num">Всего</th><th>Способность</th><th>Загрузка</th></tr></thead><tbody>';
    weeks.forEach(function(key) {
        var g = grp[key], t = g.wb + g.ozon, cap = weekCapacities[key] || 0, pct = cap > 0 ? Math.round(t / cap * 100) : 0, bc = pct > 100 ? 'danger' : pct > 80 ? 'warn' : 'good', isC = key === cwk, wid = 'week-' + key.replace(/[^a-zA-Z0-9]/g, '-');
        h += '<tr class="' + (isC ? 'week-row current' : 'week-row') + '" data-week-toggle="' + wid + '"><td><b>' + g.label + '</b>' + (isC ? ' <span class="badge badge-info">текущая</span>' : '') + '<span class="toggle-icon" id="icon-' + wid + '">&#9662;</span></td><td class="num"><span class="badge badge-wb">' + g.wb.toLocaleString('ru-RU') + '</span></td><td class="num"><span class="badge badge-ozon">' + g.ozon.toLocaleString('ru-RU') + '</span></td><td class="num"><b>' + t.toLocaleString('ru-RU') + '</b></td><td><input class="capacity-input" value="' + (cap || '') + '" data-week-cap="' + key + '"></td><td><div class="progress-bar"><div class="progress-fill ' + bc + '" style="width:' + Math.min(pct, 100) + '%"></div></div>' + (cap > 0 ? pct + '%' : '—') + '</td></tr>';
        var byCity = {};
        g.details.forEach(function(d) { var ck = d.city + '|' + d.marketplace; if (!byCity[ck]) byCity[ck] = 0; byCity[ck] += d.qty; });
        h += '<tr id="' + wid + '" style="display:none"><td colspan="6">';
        for (var ck in byCity) { var parts = ck.split('|'); h += '<span class="badge ' + (parts[1] === 'Wildberries' ? 'badge-wb' : 'badge-ozon') + '">' + escapeHtml(parts[0]) + ': ' + byCity[ck].toLocaleString('ru-RU') + '</span> '; }
        h += '</td></tr>';
    });
    h += '</tbody></table>';
    tc.innerHTML = h;
}

function toggleWeekDetails(wid) { var el = document.getElementById(wid), icon = document.getElementById('icon-' + wid); if (el) { el.style.display = el.style.display === 'none' ? 'table-row' : 'none'; if (icon) icon.classList.toggle('open'); } }

async function updateWeekCapacity(key, val) {
    weekCapacities[key] = parseInt(val) || 0;
    if (isOnline) try { await db.collection('settings').doc('capacities').set({ capacities: weekCapacities }, { merge: true }); } catch(e) {}
    saveAllToLocalStorage();
    renderSchedule();
    renderKpiStrip();
}

function exportScheduleCSV() {
    var all = getAllShipments(), grp = {};
    all.forEach(function(s) { var wk = getWeekKey(s.date); if (!grp[wk.key]) grp[wk.key] = { label: wk.label, wb: 0, ozon: 0 }; if (s.marketplace === 'Wildberries') grp[wk.key].wb += s.qty; else grp[wk.key].ozon += s.qty; });
    var csv = 'Неделя;WB;Ozon;Всего;Способность;Загрузка\n';
    Object.keys(grp).filter(function(k) { return !k.startsWith('unk'); }).sort().reverse().forEach(function(k) { var g = grp[k], t = g.wb + g.ozon, cap = weekCapacities[k] || 0; csv += g.label + ';' + g.wb + ';' + g.ozon + ';' + t + ';' + cap + ';' + (cap > 0 ? Math.round(t / cap * 100) + '%' : '—') + '\n'; });
    downloadCSV(csv, 'сводная.csv');
}

var showScheduleImport = false;

function toggleScheduleImport() { showScheduleImport = !showScheduleImport; var b = document.getElementById('scheduleImportBlock'); if (b) b.style.display = showScheduleImport ? 'block' : 'none'; }

async function doScheduleImport() {
    var te = document.getElementById('scheduleImportText');
    if (!te) return;
    var text = te.value.trim();
    if (!text) return;
    var iw = 0, io = 0, nw = [], no = [];
    text.split('\n').filter(function(l) { return l.trim(); }).forEach(function(line) {
        var cols = line.split('\t');
        if (cols.length < 4) cols = line.split(/[\t,;]/);
        if (cols.length >= 4) {
            var ds = cols[0].trim(), mp = cols[1].trim(), city = cols[2].trim(), qty = parseInt(String(cols[3]).replace(/\s/g, '')) || 0;
            if (!mp || !city || qty <= 0) return;
            var target = null;
            if (['Wildberries', 'WB', 'ВБ'].indexOf(mp) >= 0) target = 'Wildberries';
            else if (['Ozon', 'Озон'].indexOf(mp) >= 0) target = 'Ozon';
            else return;
            var n = normalizeDateString(ds);
            if (!n) return;
            var s = { id: generateUniqueId(), date: n, city: city, qty: qty, source: target, status: 'in_work' };
            if (target === 'Wildberries') { nw.push(s); wbShipments.push(s); iw++; }
            else { no.push(s); ozonShipments.push(s); io++; }
        }
    });
    saveAllToLocalStorage();
    if (te) te.value = '';
    renderAllDebounced();
    showToast('WB: ' + iw + ', Ozon: ' + io);
}

// ============ FORECAST ============
function getMonthlyIncoming(month) {
    return vedSupplies.filter(function(s) { return s.includeInModel !== false; }).filter(function(s) { if (!s.eta) return false; return MONTHS[new Date(s.eta).getMonth()] === month; }).reduce(function(sum, s) { return sum + (s.totalVolume || 0); }, 0);
}

function calculateExpense(month, pe) {
    var idx = FORECAST_MONTHS.indexOf(month);
    if (idx === -1) return 0;
    if (idx === 0) return warehouseData.baseExpense * (warehouseData.salesPlan[month] || 0) / (warehouseData.marchPlan || 311000000);
    var pm = FORECAST_MONTHS[idx - 1], ps = warehouseData.salesPlan[pm] || 0, cs = warehouseData.salesPlan[month] || 0;
    if (ps === 0) return 0;
    return (pe || calculateExpense(pm)) * cs / ps;
}

function calculateForecast() {
    var months = FORECAST_MONTHS, rem = warehouseData.currentOccupancy + warehouseData.constantVolume, res = [], pe = null;
    months.forEach(function(month) {
        var inc = getMonthlyIncoming(month), exp = calculateExpense(month, pe);
        pe = exp;
        rem = rem + inc - exp;
        rem = Math.max(rem, 0);
        var lp = rem / warehouseData.totalCapacity, fr = warehouseData.totalCapacity - rem;
        res.push({ month: month, incoming: Math.round(inc * 100) / 100, expense: Math.round(exp * 100) / 100, remaining: Math.round(rem), loadPercent: lp, free: Math.round(fr) });
    });
    return res;
}

function renderSalesPlanEditor() {
    var tb = document.getElementById('salesPlanEditor');
    if (!tb) return;
    var fc = calculateForecast(), pe = null, h = '';
    FORECAST_MONTHS.forEach(function(m) {
        var sales = warehouseData.salesPlan[m] || 0, idx = FORECAST_MONTHS.indexOf(m), pm = idx > 0 ? FORECAST_MONTHS[idx - 1] : null, ps = pm ? (warehouseData.salesPlan[pm] || 0) : warehouseData.marchPlan, growth = ps > 0 ? ((sales / ps - 1) * 100).toFixed(1) + '%' : '—', exp = calculateExpense(m, pe);
        pe = exp;
        var inc = getMonthlyIncoming(m), fd = fc.find(function(f) { return f.month === m; }), rem = fd ? fd.remaining : 0, free = fd ? fd.free : 0, lp = fd ? Math.round(fd.loadPercent * 100) : 0, lc = lp > 85 ? 'danger' : (lp > 70 ? 'warn' : 'good');
        h += '<tr><td><b>' + m + '</b></td><td class="num"><input type="number" class="sales-plan-input" id="sales_' + m + '" value="' + sales + '" data-sales-month="' + m + '"></td><td class="num">' + growth + '</td><td class="num">' + inc.toFixed(2) + '</td><td class="num">' + exp.toFixed(2) + '</td><td class="num"><b>' + rem.toLocaleString('ru-RU') + '</b></td><td class="num">' + free.toLocaleString('ru-RU') + '</td><td><div class="progress-bar"><div class="progress-fill ' + lc + '" style="width:' + lp + '%"></div></div>' + lp + '%</td></tr>';
    });
    tb.innerHTML = h;
}

var sdt = null;

function updateSalesPlan(m, v) {
    warehouseData.salesPlan[m] = parseFloat(v) || 0;
    if (sdt) clearTimeout(sdt);
    sdt = setTimeout(function() { renderForecastTab(); renderKpiStrip(); }, 300);
}

async function saveWarehouseSettings() {
    warehouseData.totalCapacity = parseFloat(document.getElementById('totalCapacity').value) || 2267;
    warehouseData.currentOccupancy = parseFloat(document.getElementById('currentOccupancy').value) || 1408;
    warehouseData.constantVolume = parseFloat(document.getElementById('constantVolume').value) || 85;
    warehouseData.baseExpense = parseFloat(document.getElementById('baseExpense').value) || 51.50;
    warehouseData.marchPlan = parseFloat(document.getElementById('marchPlan').value) || 311000000;
    saveAllToLocalStorage();
    if (isOnline) try { await db.collection('settings').doc('warehouseData').set(warehouseData, { merge: true }); } catch(e) {}
    renderForecastTab();
    renderKpiStrip();
    showToast('Сохранено');
}

function renderForecastTab() {
    document.getElementById('totalCapacity').value = warehouseData.totalCapacity;
    document.getElementById('currentOccupancy').value = warehouseData.currentOccupancy;
    document.getElementById('constantVolume').value = warehouseData.constantVolume;
    document.getElementById('baseExpense').value = warehouseData.baseExpense;
    document.getElementById('marchPlan').value = warehouseData.marchPlan;
    renderSalesPlanEditor();
    renderForecastChart();
}

function renderForecastChart() {
    var svg = document.getElementById('forecastChart');
    if (!svg) return;
    var fc = calculateForecast();
    if (!fc.length) { svg.innerHTML = '<text x="300" y="110" text-anchor="middle">Нет данных</text>'; return; }
    var months = fc.map(function(f) { return f.month.slice(0, 3); }), idata = fc.map(function(f) { return f.incoming; }), edata = fc.map(function(f) { return f.expense; }), maxV = Math.max.apply(null, idata.concat(edata).concat([50])), yM = Math.ceil(maxV / 10) * 10, W = 600, H = 220, PL = 55, PR = 20, PT = 15, PB = 30, cw = W - PL - PR, ch = H - PT - PB;
    function gx(i) { return PL + (cw / (months.length - 1)) * i; }
    function gy(v) { return PT + ch - (v / yM) * ch; }
    var sc = '';
    for (var i = 0; i <= 4; i++) { var y = PT + (ch / 4) * i, v = Math.round(yM - (yM / 4) * i); sc += '<line x1="' + PL + '" y1="' + y + '" x2="' + (W - PR) + '" y2="' + y + '" class="chart-grid"/><text x="' + (PL - 8) + '" y="' + (y + 4) + '" text-anchor="end" class="chart-axis">' + v.toFixed(0) + '</text>'; }
    var ip = '', ep = '';
    for (var i = 0; i < months.length; i++) { var x = gx(i); ip += (i === 0 ? 'M' : 'L') + x + ',' + gy(idata[i]) + ' '; ep += (i === 0 ? 'M' : 'L') + x + ',' + gy(edata[i]) + ' '; }
    sc += '<path d="' + ip + '" class="chart-line incoming"/><path d="' + ep + '" class="chart-line expense"/>';
    for (var i = 0; i < months.length; i++) { sc += '<circle cx="' + gx(i) + '" cy="' + gy(idata[i]) + '" r="3.5" class="chart-dot" style="fill:var(--ved);"/><circle cx="' + gx(i) + '" cy="' + gy(edata[i]) + '" r="3.5" class="chart-dot" style="fill:#e37400;"/><text x="' + gx(i) + '" y="' + (H - 8) + '" text-anchor="middle" class="chart-axis">' + months[i] + '</text>'; }
    svg.innerHTML = sc;
}

async function importExcelModel(file) {
    return new Promise(function(res, rej) {
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = new Uint8Array(e.target.result), wb = XLSX.read(data, { type: 'array' });
                var tc = 0, co = 0, cv = 0, mp = 311000000, sp = {};
                var sn = wb.SheetNames, is = null;
                for (var i = 0; i < sn.length; i++) { if (sn[i].includes('Вводные') || sn[i].includes('Input')) { is = wb.Sheets[sn[i]]; break; } }
                if (!is && sn.length > 0) is = wb.Sheets[sn[0]];
                if (is) {
                    var rows = XLSX.utils.sheet_to_json(is, { header: 1, defval: '' });
                    for (var i = 0; i < rows.length; i++) { var row = rows[i]; if (!row || !Array.isArray(row)) continue; var ca = String(row[0] || '').toLowerCase(), cb = row[1]; if (ca.includes('полезный') && (ca.includes('объем') || ca.includes('объём'))) tc = parseFloat(cb) || 0; if (ca.includes('занято') && !ca.includes('постоянный')) co = parseFloat(cb) || 0; if (ca.includes('постоянный')) cv = parseFloat(cb) || 0; }
                    var its = false;
                    for (var i = 0; i < rows.length; i++) { var row = rows[i]; if (!row || !Array.isArray(row)) continue; if (String(row[0] || '').includes('Месяц') && row.some(function(c) { return String(c || '').includes('План'); })) { its = true; continue; } if (its && row[0] && MONTHS.includes(String(row[0]).trim())) { var month = String(row[0]).trim(); for (var col = 1; col < row.length; col++) { var plan = parseFloat(row[col]) || 0; if (plan > 0) { sp[month] = plan; break; } } } }
                }
                if (tc > 0) warehouseData.totalCapacity = tc;
                if (co > 0) warehouseData.currentOccupancy = co;
                if (cv > 0) warehouseData.constantVolume = cv;
                if (Object.keys(sp).length > 0) warehouseData.salesPlan = sp;
                saveAllToLocalStorage();
                res({ salesPlanCount: Object.keys(sp).length });
            } catch (err) { rej(err); }
        };
        reader.onerror = function() { rej('Ошибка'); };
        reader.readAsArrayBuffer(file);
    });
}

// ============ VED ============
function FixedVedParser() {
    this.cache = new Map();
    this.columnKeywords = { article: ['article', 'артикул', 'sku', 'код', 'item', 'part number', 'модель', 'model'], name: ['name', 'наименование', 'название', 'product', 'description', 'description_en', 'english name'], cartons: ['cartons', 'короб', 'ящик', 'case', 'ctn', 'total cartons', '总箱数'], perCarton: ['per carton', 'шт/кор', 'each carton', 'pcs/ctn', '每箱数量'], totalQty: ['qty', 'количество', 'total quantity', 'всего', 'pcs', 'шт', '数量'], volume: ['cbm', 'объём', 'объем', 'volume', 'all cbm', 'total volume', 'm3', '总体积'] };
    this.maxColsToScan = 20;
    this.maxRowsToScanForHeaders = 20;
    this.debug = false;
}
FixedVedParser.prototype.log = function(msg) { if (this.debug) console.log('[VedParser]', msg); };
FixedVedParser.prototype.parseNumber = function(v) { if (v === undefined || v === null) return 0; if (typeof v === 'number') return v; var s = String(v).trim(); if (!s || s === '无' || s === 'None' || s === 'N/A') return 0; var n = parseFloat(s.replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
FixedVedParser.prototype.isValueEmpty = function(v) { if (v === undefined || v === null) return true; var s = String(v).trim(); return s === '' || s === '无' || s === 'None' || s === 'N/A'; };
FixedVedParser.prototype.isArticleLike = function(v) { if (this.isValueEmpty(v)) return false; var s = String(v).trim(); if (s === 'N/A' || s === '无') return false; if (s.length < 3 || s.length > 50) return false; return /^[A-Z]{1,2}\d{4,}/i.test(s) || (/[A-Za-z]/.test(s) && /\d/.test(s) && /[-_\/]/.test(s) && s.length <= 20); };
FixedVedParser.prototype.isChineseOnly = function(v) { if (this.isValueEmpty(v)) return false; var s = String(v).trim(); var chineseCount = (s.match(/[\u4e00-\u9fff]/g) || []).length; return chineseCount / s.length > 0.8; };
FixedVedParser.prototype.hasEnglishLetters = function(v) { if (this.isValueEmpty(v)) return false; var s = String(v).trim(); return /[a-zA-Z]/.test(s) && !/[а-яА-Я]/.test(s); };
FixedVedParser.prototype.findColumnsByHeaders = function(rows) {
    var cm = {}, hri = -1, headerCandidates = [];
    for (var i = 0; i < Math.min(this.maxRowsToScanForHeaders, rows.length); i++) {
        var row = rows[i]; if (!row) continue;
        var matches = {}, score = 0;
        for (var col = 0; col < Math.min(row.length, this.maxColsToScan); col++) {
            var cell = String(row[col] || '').toLowerCase().trim();
            if (!cell) continue;
            for (var f in this.columnKeywords) { var kws = this.columnKeywords[f]; for (var k = 0; k < kws.length; k++) { if (cell.includes(kws[k].toLowerCase())) { if (!matches[f]) matches[f] = []; if (matches[f].indexOf(col) === -1) { matches[f].push(col); score++; } break; } } }
        }
        if (Object.keys(matches).length >= 2) headerCandidates.push({ rowIndex: i, matches: matches, score: score, row: row });
    }
    if (headerCandidates.length > 0) {
        headerCandidates.sort(function(a, b) { return b.score - a.score; });
        var best = headerCandidates[0];
        hri = best.rowIndex;
        for (var f in best.matches) {
            var cols = best.matches[f];
            cm[f] = cols[0];
        }
    }
    return { columnMap: cm, headerRowIndex: hri };
};
FixedVedParser.prototype.findBestArticle = function(row, cm) {
    if (cm.article !== undefined && cm.article < row.length) { var cell = String(row[cm.article] || '').trim(); if (cell && this.isArticleLike(cell) && cell !== 'N/A') return cell; }
    for (var col = 0; col < Math.min(row.length, 10); col++) { if (cm.article !== undefined && col === cm.article) continue; var cell = String(row[col] || '').trim(); if (!cell || cell === 'N/A' || cell === '无') continue; if (this.isArticleLike(cell)) return cell; }
    return 'N/A';
};
FixedVedParser.prototype.findBestName = function(row, cm) {
    var candidates = [];
    var possibleNameColumns = [];
    if (cm.name !== undefined && cm.name < row.length) possibleNameColumns.push(cm.name);
    for (var col = 0; col < Math.min(row.length, this.maxColsToScan); col++) {
        if (col === cm.article) continue;
        if (possibleNameColumns.indexOf(col) !== -1) continue;
        var cell = String(row[col] || '').trim();
        if (!cell || cell === 'N/A') continue;
        if (/[a-zA-Zа-яА-Я]{3,}/.test(cell) && !this.isArticleLike(cell) && !/^\d+$/.test(cell)) possibleNameColumns.push(col);
    }
    for (var i = 0; i < possibleNameColumns.length; i++) {
        var col = possibleNameColumns[i];
        var cell = String(row[col] || '').trim();
        if (!cell) continue;
        var score = 0;
        if (this.hasEnglishLetters(cell) && !/[а-яА-Я]/.test(cell)) score += 15;
        if (cell.length > 15) score += 5;
        if (cell.length < 5) score -= 3;
        if (/[a-zA-Z]/.test(cell)) score += 8;
        if (/\d/.test(cell)) score += 2;
        if (cm.article !== undefined && col > cm.article) score += 3;
        if (!this.isChineseOnly(cell)) score += 5;
        candidates.push({ text: cell, score: score, col: col });
    }
    if (candidates.length > 0) { candidates.sort(function(a, b) { return b.score - a.score; }); return candidates[0].text; }
    return '';
};
FixedVedParser.prototype.parseFile = function(file) {
    var self = this;
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = new Uint8Array(e.target.result), wb = XLSX.read(data, { type: 'array', cellFormula: false, cellNF: true });
                var sheetName = wb.SheetNames[0], sheet = wb.Sheets[sheetName];
                var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
                var found = self.findColumnsByHeaders(rows);
                var cm = found.columnMap, hri = found.headerRowIndex;
                if (Object.keys(cm).length === 0) { reject(new Error('Не удалось найти заголовки в файле')); return; }
                var items = [], tv = 0, tq = 0, tc = 0, naCount = 0;
                for (var i = hri + 1; i < rows.length; i++) {
                    var row = rows[i];
                    if (!row || row.every(function(cell) { return self.isValueEmpty(cell); })) continue;
                    var firstCell = String(row[0] || '').toLowerCase();
                    if (firstCell === 'итого' || firstCell === 'total' || firstCell === '合计') continue;
                    var article = self.findBestArticle(row, cm);
                    if (article === 'N/A') naCount++;
                    var name = self.findBestName(row, cm);
                    if (!name && article !== 'N/A') name = article;
                    if (!name) continue;
                    var cartons = 0;
                    if (cm.cartons !== undefined && cm.cartons < row.length) cartons = self.parseNumber(row[cm.cartons]);
                    var perCarton = 0;
                    if (cm.perCarton !== undefined && cm.perCarton < row.length) perCarton = self.parseNumber(row[cm.perCarton]);
                    var qty = 0;
                    if (cm.totalQty !== undefined && cm.totalQty < row.length) qty = self.parseNumber(row[cm.totalQty]);
                    if (qty === 0 && perCarton > 0 && cartons > 0) qty = perCarton * cartons;
                    if (qty === 0) { for (var col = 0; col < Math.min(row.length, 10); col++) { if (col === cm.article || col === cm.name) continue; var val = self.parseNumber(row[col]); if (val > 0 && val < 1000000) { qty = val; break; } } }
                    var vol = 0;
                    if (cm.volume !== undefined && cm.volume < row.length) vol = self.parseNumber(row[cm.volume]);
                    if (vol === 0 && qty > 0) vol = qty * 0.00005;
                    tc += cartons;
                    tq += qty;
                    tv += vol;
                    items.push({ article: article, name: name, cartons: cartons, perCarton: perCarton, qty: qty, volume: Math.round(vol * 1000) / 1000 });
                }
                resolve({ items: items, totalCartons: tc, totalQty: tq, totalVolume: Math.round(tv * 1000) / 1000, itemsCount: items.length, naCount: naCount });
            } catch (err) { reject(err); }
        };
        reader.onerror = function() { reject(new Error('Ошибка чтения файла')); };
        reader.readAsArrayBuffer(file);
    });
};
FixedVedParser.prototype.validate = function(items) {
    var errors = [], duplicates = {}, warnings = [];
    items.forEach(function(item, index) {
        if (item.article === 'N/A') warnings.push('Строка ' + (index + 1) + ': не найден артикул (будет использован N/A)');
        if (item.qty <= 0) errors.push('Строка ' + (index + 1) + ': количество должно быть > 0');
        if (item.article !== 'N/A') { if (duplicates[item.article]) duplicates[item.article].push(index + 1); else duplicates[item.article] = [index + 1]; }
    });
    for (var article in duplicates) { if (duplicates[article].length > 1) warnings.push('Артикул "' + article + '" повторяется в строках: ' + duplicates[article].join(', ')); }
    return { errors: errors, warnings: warnings, isValid: errors.length === 0 };
};
var vedParser = new FixedVedParser();

function renderVedLists() {
    var c = document.getElementById('vedListsContainer'), ba = document.getElementById('btnAddVedList'), sum = document.getElementById('vedTotalSummary');
    if (!c) return;
    var h = '';
    for (var i = 0; i < vedTempLists.length; i++) {
        var list = vedTempLists[i];
        h += '<div class="ved-list-item"><div class="ved-list-header"><span class="ved-list-title">Список ' + (i + 1) + '</span><span class="ved-list-status">' + (list ? list.name + ' (' + list.itemsCount + ' поз.)' : 'Ожидает файл') + '</span><button type="button" class="file-delete" data-ved-list-remove="' + i + '">x</button></div>';
        if (list) {
            h += '<div class="file-preview show"><table><thead><tr><th>Артикул</th><th>Наименование</th><th class="num">Кор.</th><th class="num">Шт/кор</th><th class="num">Всего</th><th class="num">Объём</th></tr></thead><tbody>';
            list.items.slice(0, 8).forEach(function(item) {
                h += '<tr><td>' + escapeHtml(item.article || '—') + '</td><td>' + escapeHtml((item.name || '—').slice(0, 30)) + '</td><td class="num">' + (item.cartons || 0) + '</td><td class="num">' + (item.perCarton || 0) + '</td><td class="num">' + (item.qty || 0) + '</td><td class="num">' + (item.volume > 0 ? item.volume.toFixed(3) : '—') + '</td></tr>';
            });
            h += '</tbody></table></div>';
        } else {
            h += '<div class="file-upload-box" data-ved-list-index="' + i + '"><div>Перетащите файл или нажмите</div><div style="font-size:10px;color:var(--text-tertiary)">Excel (.xlsx, .xls) или CSV</div><input type="file" accept=".xlsx,.xls,.csv" data-ved-list-input="' + i + '"></div>';
        }
        h += '</div>';
    }
    c.innerHTML = h;
    if (ba) ba.style.display = vedTempLists.length < MAX_VED_LISTS ? 'block' : 'none';
    updateVedTotalSummary();
}

function handleVedFileForList(index, file) {
    if (!file || index >= vedTempLists.length) return;
    vedTempLists[index] = { name: 'Анализ...', items: [], totalVolume: 0, totalQty: 0, totalCartons: 0, itemsCount: 0 };
    renderVedLists();
    vedParser.parseFile(file).then(function(r) {
        vedTempLists[index] = { name: file.name, items: r.items, totalVolume: r.totalVolume, totalQty: r.totalQty, totalCartons: r.totalCartons, itemsCount: r.itemsCount };
        renderVedLists();
        showToast('Список ' + (index + 1) + ' загружен');
    }).catch(function() {
        vedTempLists[index] = null;
        renderVedLists();
        showToast('Ошибка чтения');
    });
}

function addVedList() { if (vedTempLists.length >= MAX_VED_LISTS) { showToast('Макс. ' + MAX_VED_LISTS); return; } vedTempLists.push(null); renderVedLists(); }
function removeVedList(index) { if (vedTempLists.length <= 1) return; vedTempLists.splice(index, 1); renderVedLists(); }

function updateVedTotalSummary() {
    var sum = document.getElementById('vedTotalSummary');
    if (!sum) return;
    var vl = vedTempLists.filter(function(l) { return l && l.items && l.items.length > 0; });
    if (vl.length === 0) { sum.style.display = 'none'; return; }
    var ti = 0, tc = 0, tq = 0, tv = 0;
    vl.forEach(function(l) { ti += l.itemsCount || 0; tc += l.totalCartons || 0; tq += l.totalQty || 0; tv += l.totalVolume || 0; });
    sum.style.display = 'block';
    sum.innerHTML = 'Итого: <b>' + ti + ' поз.</b> · ' + tc.toLocaleString('ru-RU') + ' кор. · ' + tq.toLocaleString('ru-RU') + ' ед. · <b>' + tv.toFixed(2) + ' м³</b>';
}

async function saveVedSupply() {
    var ne = document.getElementById('vedNumber'), ee = document.getElementById('vedEta'), se = document.getElementById('vedSupplier'), we = document.getElementById('vedWarehouse'), ste = document.getElementById('vedStatus'), ie = document.getElementById('vedIncludeInModel');
    if (!ne || !ee || !se) return;
    var n = ne.value.trim(), e = ee.value, s = se.value, w = we ? we.value : 'Москва', st = ste ? ste.value : 'transit', inc = ie ? ie.value === 'yes' : true;
    if (!n || !e || !s) return alert('Заполните поля');
    var vl = vedTempLists.filter(function(l) { return l && l.items && l.items.length > 0; });
    if (vl.length === 0) return alert('Прикрепите список');
    var allItems = [], tv = 0, tq = 0, tc = 0, fns = [];
    vl.forEach(function(l) { allItems = allItems.concat(l.items); tv += l.totalVolume || 0; tq += l.totalQty || 0; tc += l.totalCartons || 0; fns.push(l.name); });
    var validation = vedParser.validate(allItems);
    if (!validation.isValid) { alert('Ошибки в данных:\n' + validation.errors.join('\n')); return; }
    var supply = { id: generateUniqueId(), number: n, eta: e, supplier: s, warehouse: w, status: st, includeInModel: inc, items: allItems, totalVolume: Math.round(tv * 1000) / 1000, totalQty: tq, totalCartons: tc, fileName: fns.join('; '), listsCount: vl.length, createdAt: new Date().toISOString(), history: [{ status: st, date: new Date().toISOString() }] };
    vedSupplies.push(supply);
    if (isOnline) { var id = supply.id; delete supply.id; try { await db.collection('ved_supplies').doc(id).set(supply); supply.id = id; } catch(e) { supply.id = id; } }
    saveAllToLocalStorage();
    clearVedForm();
    renderAllDebounced();
    showToast('Поставка сохранена');
}

function clearVedForm() {
    ['vedNumber', 'vedEta'].forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
    var se = document.getElementById('vedSupplier'); if (se) se.value = '';
    vedTempLists = [null];
    var ie = document.getElementById('vedIncludeInModel'); if (ie) ie.value = 'yes';
    renderVedLists();
}

async function updateVedStatus(id, st) {
    var s = vedSupplies.find(function(x) { return String(x.id) === String(id); });
    if (s) { s.status = st; s.history = s.history || []; s.history.push({ status: st, date: new Date().toISOString() }); saveAllToLocalStorage(); if (isOnline) try { await db.collection('ved_supplies').doc(String(id)).update({ status: st, history: s.history }); } catch(e) {} renderVedCards(); renderAllDebounced(); }
}

async function toggleVedIncludeInModel(id) {
    var s = vedSupplies.find(function(x) { return String(x.id) === String(id); });
    if (s) { s.includeInModel = !s.includeInModel; saveAllToLocalStorage(); if (isOnline) try { await db.collection('ved_supplies').doc(String(id)).update({ includeInModel: s.includeInModel }); } catch(e) {} renderVedCards(); renderAllDebounced(); }
}

async function deleteVedSupply(id) {
    if (!confirm('Удалить?')) return;
    vedSupplies = vedSupplies.filter(function(s) { return String(s.id) !== String(id); });
    if (isOnline) try { await db.collection('ved_supplies').doc(String(id)).delete(); } catch(e) {}
    saveAllToLocalStorage();
    renderAllDebounced();
}

function toggleVedDetails(id) { vedExpandedId = vedExpandedId === String(id) ? null : String(id); renderVedCards(); }

function renderVedCards() {
    var c = document.getElementById('vedCards');
    if (!c) return;
    var srt = vedSupplies.slice().sort(function(a, b) { if (!a.eta && !b.eta) return 0; if (!a.eta) return 1; if (!b.eta) return -1; return a.eta.localeCompare(b.eta); });
    if (!srt.length) { c.innerHTML = '<div class="empty-state">Нет поставок</div>'; renderVedKpiStrip(); return; }
    var q = vedSearchQuery.trim().toLowerCase(), mc = 0, h = '';
    for (var i = 0; i < srt.length; i++) {
        var s = srt[i], so = VED_STATUSES[s.status] || VED_STATUSES.transit, tq = (s.items || []).reduce(function(sum, i) { return sum + (i.qty || 0); }, 0), inc = s.includeInModel !== false, ie = vedExpandedId === String(s.id), hm = false;
        if (q && s.items) { for (var j = 0; j < s.items.length; j++) { if (s.items[j].article && s.items[j].article.toLowerCase().includes(q)) { hm = true; break; } } if (hm) mc++; }
        h += '<div class="ved-card' + (hm ? ' match-highlight' : '') + (ie ? ' expanded' : '') + '"><div class="card-accent"></div><button type="button" class="card-delete" data-ved-delete="' + s.id + '">&times;</button><div class="card-body" data-ved-toggle="' + s.id + '"><div class="card-header"><div><div class="card-number">' + escapeHtml(s.number) + '</div><div class="card-supplier">' + escapeHtml(s.supplier) + '</div></div></div><div class="card-meta"><span>' + escapeHtml(s.warehouse) + '</span><span>' + escapeHtml(s.eta) + '</span></div><div class="card-volume">' + (s.totalVolume || 0).toFixed(2) + ' м³</div><div style="font-size:11px;color:var(--text-secondary)">' + (s.items || []).length + ' поз. · ' + (s.listsCount || 1) + ' сп. · ' + tq.toLocaleString('ru-RU') + ' ед.</div><div class="card-footer"><div class="card-status-row"><select data-ved-status="' + s.id + '" class="' + so['class'] + '" style="font-size:11px;padding:4px 10px;border-radius:8px;border:1px solid var(--border);font-family:inherit;cursor:pointer">' + Object.entries(VED_STATUSES).map(function(e) { return '<option value="' + e[0] + '" ' + (s.status === e[0] ? 'selected' : '') + '>' + e[1].label + '</option>'; }).join('') + '</select><button type="button" class="include-model ' + (inc ? 'yes' : 'no') + '" data-ved-include="' + s.id + '">' + (inc ? 'Вкл' : 'Выкл') + '</button></div><span class="card-expand-icon">&#9662;</span></div></div><div class="card-details"><div style="font-size:10px;color:var(--text-tertiary);padding:8px 0">' + escapeHtml(s.fileName) + '</div><table><thead><tr><th>Артикул</th><th>Наименование</th><th class="num">Кор.</th><th class="num">Шт/кор</th><th class="num">Всего</th><th class="num">Объём</th></tr></thead><tbody>' + (s.items || []).map(function(i) { return '<tr class=""><td>' + escapeHtml(i.article || '—') + '</td><td class="name-cell">' + escapeHtml(i.name || '—') + '</td><td class="num">' + (i.cartons || 0) + '</td><td class="num">' + (i.perCarton || 0) + '</td><td class="num">' + (i.qty || 0) + '</td><td class="num">' + (i.volume || 0).toFixed(3) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    }
    c.innerHTML = h;
    renderVedKpiStrip();
}

function renderVedKpiStrip() {
    var strip = document.getElementById('vedKpiStrip');
    if (!strip) return;
    var t = vedSupplies.length, it = vedSupplies.filter(function(s) { return s.status === 'transit'; }).length, ic = vedSupplies.filter(function(s) { return s.status === 'customs'; }).length, ia = vedSupplies.filter(function(s) { return s.status === 'arrived'; }).length;
    var tq = vedSupplies.reduce(function(s, x) { return s + (x.totalQty || 0); }, 0), tv = vedSupplies.reduce(function(s, x) { return s + (x.totalVolume || 0); }, 0);
    strip.innerHTML = '<div class="kpi-item"><span class="kpi-item-label">Поставок:</span><span class="kpi-item-value">' + t + '</span></div><div class="kpi-divider"></div><div class="kpi-item"><span class="kpi-item-label">В пути:</span><span class="kpi-item-value">' + it + '</span></div><div class="kpi-divider"></div><div class="kpi-item"><span class="kpi-item-label">Таможня:</span><span class="kpi-item-value">' + ic + '</span></div><div class="kpi-divider"></div><div class="kpi-item"><span class="kpi-item-label">Прибыло:</span><span class="kpi-item-value">' + ia + '</span></div><div class="kpi-divider"></div><div class="kpi-item"><span class="kpi-item-label">Объём:</span><span class="kpi-item-value" style="color:var(--ved);">' + tv.toFixed(1) + ' м³</span></div>';
}

function handleVedSearch(q) { vedSearchQuery = q; vedExpandedId = null; renderVedCards(); }

// ============ ORDER CALCULATOR ============
var OrderCalculator = {
    config: { urgentHorizon: 20, normalHorizon: 30, plannedHorizon: 45, urgentThreshold: 7, normalThreshold: 15, minOrderQty: 10, salesPeriodDays: 30 },
    loadConfig: function() {
        try { var saved = localStorage.getItem('orderCalculatorConfig'); if (saved) this.config = Object.assign({}, this.config, JSON.parse(saved)); } catch(e) {}
        ['urgentHorizon', 'normalHorizon', 'plannedHorizon', 'urgentThreshold', 'normalThreshold', 'minOrderQty'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) { var key = id === 'urgentHorizon' ? 'urgentHorizon' : id === 'normalHorizon' ? 'normalHorizon' : id === 'plannedHorizon' ? 'plannedHorizon' : id === 'urgentThreshold' ? 'urgentThreshold' : id === 'normalThreshold' ? 'normalThreshold' : 'minOrderQty'; el.value = OrderCalculator.config[key] || 20; }
        });
    },
    saveConfig: function() {
        ['urgentHorizon', 'normalHorizon', 'plannedHorizon', 'urgentThreshold', 'normalThreshold', 'minOrderQty'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) { var key = id === 'urgentHorizon' ? 'urgentHorizon' : id === 'normalHorizon' ? 'normalHorizon' : id === 'plannedHorizon' ? 'plannedHorizon' : id === 'urgentThreshold' ? 'urgentThreshold' : id === 'normalThreshold' ? 'normalThreshold' : 'minOrderQty'; OrderCalculator.config[key] = parseInt(el.value) || 20; }
        });
        localStorage.setItem('orderCalculatorConfig', JSON.stringify(OrderCalculator.config));
        showToast('Настройки сохранены');
    },
    calculateDailySales: function(product) { return product.salesLast30Days ? product.salesLast30Days / this.config.salesPeriodDays : 0; },
    calculateTotalStock: function(product) { return (product.ourWarehouse || 0) + (product.inTransit || 0) + (product.wbStock || 0) + (product.ozonStock || 0) + (product.supplierDebt || 0); },
    calculateDaysOfStock: function(product) { var daily = this.calculateDailySales(product); if (daily <= 0) return 999; return this.calculateTotalStock(product) / daily; },
    calculateOrderQuantity: function(product, days) {
        var daily = this.calculateDailySales(product);
        var need = daily * days;
        var available = this.calculateTotalStock(product);
        var order = Math.max(0, Math.round(need - available));
        if (order < this.config.minOrderQty) order = 0;
        return order;
    },
    determinePriority: function(product) { var days = this.calculateDaysOfStock(product); if (days <= this.config.urgentThreshold) return 'urgent'; if (days <= this.config.normalThreshold) return 'normal'; return 'planned'; },
    calculateProduct: function(product) {
        var result = Object.assign({}, product);
        result.dailySales = this.calculateDailySales(product);
        result.daysOfStock = this.calculateDaysOfStock(product);
        result.priority = this.determinePriority(product);
        var order = 0;
        if (result.priority === 'urgent') order = this.calculateOrderQuantity(product, this.config.urgentHorizon);
        else if (result.priority === 'normal') order = this.calculateOrderQuantity(product, this.config.normalHorizon);
        else order = this.calculateOrderQuantity(product, this.config.plannedHorizon);
        result.recommendedOrder = order;
        result.orderCost = order * (product.purchasePrice || 0);
        return result;
    },
    calculateAll: function(products) {
        var self = this;
        var calculated = products.map(function(p) { return self.calculateProduct(p); });
        var summary = { totalQuantity: 0, totalCost: 0, totalWeight: 0, totalVolume: 0, productsToOrder: 0, urgent: { quantity: 0, cost: 0 }, normal: { quantity: 0, cost: 0 }, planned: { quantity: 0, cost: 0 } };
        calculated.forEach(function(p) {
            var order = p.recommendedOrder || 0, cost = p.orderCost || 0;
            summary.totalQuantity += order;
            summary.totalCost += cost;
            if (p.priority === 'urgent' && order > 0) { summary.urgent.quantity += order; summary.urgent.cost += cost; }
            else if (p.priority === 'normal' && order > 0) { summary.normal.quantity += order; summary.normal.cost += cost; }
            else if (p.priority === 'planned' && order > 0) { summary.planned.quantity += order; summary.planned.cost += cost; }
        });
        summary.productsToOrder = calculated.filter(function(p) { return (p.recommendedOrder || 0) > 0; }).length;
        return { products: calculated, summary: summary };
    }
};

// ============ OZON API (прямо из браузера) ============
async function ozonApiRequest(account, path, body) {
    var url = OZON_API_BASE + path;
    var response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Client-Id': account.clientId,
            'Api-Key': account.apiKey
        },
        body: JSON.stringify(body || {})
    });
    if (!response.ok) throw new Error('Ozon ' + path + ': ' + response.status);
    return response.json();
}

async function ozonFetchStocks(articles) {
    var result = {}; // article -> { present, name }
    if (!articles || !articles.length) return result;
    var uniqueArticles = Array.from(new Set(articles.filter(function(a) { return a && typeof a === 'string'; })));
    if (!uniqueArticles.length) return result;
    if (!ozonApiProductsCache) ozonApiProductsCache = { articles: {}, skus: {} };
    for (var i = 0; i < OZON_ACCOUNTS.length; i++) {
        var account = OZON_ACCOUNTS[i];
        try {
            // 1. Получить все товары аккаунта (с пагинацией через last_id)
            var allOfferIds = [];
            var lastId = null;
            for (var page = 0; page < 10; page++) {
                var listBody = { filter: { visibility: 'ALL' }, limit: 1000 };
                if (lastId) listBody.last_id = lastId;
                var listResp = await ozonApiRequest(account, '/v3/product/list', listBody);
                var items = (listResp && listResp.result && listResp.result.items) || [];
                if (!items.length) break;
                items.forEach(function(it) { if (it.offer_id) allOfferIds.push(it.offer_id); });
                lastId = listResp.result.last_id;
                if (!lastId) break;
            }
            if (!allOfferIds.length) continue;
            // 2. Получить остатки, наименования и SKU через /v3/product/info/list
            var batchSize = 100;
            for (var b = 0; b < allOfferIds.length; b += batchSize) {
                var batch = allOfferIds.slice(b, b + batchSize);
                var infoResp = await ozonApiRequest(account, '/v3/product/info/list', { offer_id: batch, limit: 100 });
                var infoRows = (infoResp && infoResp.items) || [];
                infoRows.forEach(function(it) {
                    var offerId = it && it.offer_id;
                    if (!offerId) return;
                    // Кэшируем маппинг offer_id <-> sku
                    if (it.sku) {
                        ozonApiProductsCache.articles[offerId] = it.sku;
                        ozonApiProductsCache.skus[it.sku] = offerId;
                    }
                    var present = 0;
                    if (it.stocks && it.stocks.stocks && Array.isArray(it.stocks.stocks)) {
                        it.stocks.stocks.forEach(function(s) {
                            if (s && s.source === 'fbo') present += (s.present || 0);
                        });
                    }
                    if (!result[offerId]) result[offerId] = { present: 0, name: it.name || offerId };
                    result[offerId].present += present;
                    if (it.name) result[offerId].name = it.name;
                });
            }
        } catch (e) {
            ozonApiLastError = 'Ozon («' + account.label + '») — остатки: ' + e.message;
        }
    }
    return result;
}

async function ozonFetchSales(articles, days) {
    var result = {}; // offer_id -> { ordered_units }
    if (!articles || !articles.length) return result;
    var uniqueArticles = Array.from(new Set(articles.filter(function(a) { return a && typeof a === 'string'; })));
    if (!uniqueArticles.length) return result;
    days = days || 30;
    var dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    var fmt = function(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    var body = { date_from: fmt(dateFrom), date_to: fmt(new Date()), metrics: ['ordered_units'], dimension: ['sku'], filters: [], sort: [{ key: 'sku', order: 'ASC' }], limit: 1000, offset: 0 };
    for (var i = 0; i < OZON_ACCOUNTS.length; i++) {
        var account = OZON_ACCOUNTS[i];
        try {
            var resp = await ozonApiRequest(account, '/v1/analytics/data', body);
            var rows = (resp && resp.result && resp.result.data) || [];
            rows.forEach(function(row) {
                var dims = row && row.dimensions;
                var sku = dims && dims[0] && dims[0].id;
                if (!sku) return;
                // Маппинг SKU -> offer_id из кэша
                var offerId = ozonApiProductsCache && ozonApiProductsCache.skus ? ozonApiProductsCache.skus[sku] : null;
                if (!offerId || uniqueArticles.indexOf(offerId) === -1) return;
                var units = 0;
                if (row.metrics && Array.isArray(row.metrics)) {
                    row.metrics.forEach(function(m) { if (typeof m === 'number') units += m; });
                }
                if (!result[offerId]) result[offerId] = { ordered_units: 0 };
                result[offerId].ordered_units += units;
            });
        } catch (e) {
            ozonApiLastError = 'Ozon («' + account.label + '») — продажи: ' + e.message;
        }
    }
    return result;
}

async function applyOzonApiToProducts(products) {
    if (!OZON_ACCOUNTS.length) return products;
    ozonApiInProgress = true;
    ozonApiLastError = null;
    try {
        var articles = products.map(function(p) { return p.article; });
        var stocksPromise = ozonFetchStocks(articles);
        var salesPromise = ozonFetchSales(articles, 30);
        var stocks = await stocksPromise;
        var sales = await salesPromise;
        var updated = 0;
        products.forEach(function(p) {
            var stock = stocks[p.article];
            if (stock) {
                if (stock.present > 0) p.ozonStock = (p.ozonStock || 0) + stock.present;
                if (stock.name && stock.name !== p.article) p.name = stock.name;
                updated++;
            }
            var sale = sales[p.article];
            if (sale && sale.ordered_units > 0) {
                p.salesLast30Days = (p.salesLast30Days || 0) + sale.ordered_units;
                updated++;
            }
        });
        ozonApiLastUpdate = new Date().toISOString();
        return { products: products, updated: updated };
    } finally {
        ozonApiInProgress = false;
    }
}

function renderOzonApiStatus() {
    var el = document.getElementById('ozonApiStatus');
    if (!el) return;
    var parts = [];
    if (ozonApiInProgress) parts.push('<span style="color:var(--warning)">⏳ Синхронизация Ozon API...</span>');
    if (ozonApiLastUpdate) parts.push('<span style="color:var(--success)">✅ Ozon API: обновлено ' + new Date(ozonApiLastUpdate).toLocaleTimeString('ru-RU') + '</span>');
    if (ozonApiLastError) parts.push('<span style="color:var(--danger)">⚠ ' + escapeHtml(ozonApiLastError) + '</span>');
    el.innerHTML = parts.join(' · ') || 'Ozon API не настроен';
}

function getProductsForOrderCalculation() {
    var products = [];
    var articles = new Set();
    wbStockData.forEach(function(s) { articles.add(s.article); });
    ozonStockData.forEach(function(s) { articles.add(s.article); });
    msStockData.forEach(function(s) { articles.add(s.article); });
    articles.forEach(function(article) {
        if (!article) return;
        var product = { article: article, name: article, purchasePrice: 0, weightKg: 0, volumeM3: 0, boxMultiple: 1, salesLast30Days: 0, ourWarehouse: 0, inTransit: 0, wbStock: 0, ozonStock: 0, supplierDebt: 0 };
        var wb = wbStockData.find(function(s) { return s.article === article; });
        var oz = ozonStockData.find(function(s) { return s.article === article; });
        var ms = msStockData.find(function(s) { return s.article === article; });
        if (wb) { product.wbStock = wb.balance || 0; product.name = wb.name || article; }
        if (oz) { product.ozonStock = oz.balance || 0; if (oz.name) product.name = oz.name; }
        if (ms) { product.ourWarehouse = ms.balance || 0; product.inTransit = ms.waiting || 0; if (ms.name) product.name = ms.name; }
        products.push(product);
    });
    return products;
}

function renderOrderSummary(summary) {
    document.getElementById('ordersSummary').style.display = 'block';
    document.getElementById('totalOrderQuantity').textContent = summary.totalQuantity || 0;
    document.getElementById('ordersUrgentQuantity').textContent = summary.urgent.quantity || 0;
    document.getElementById('ordersNormalQuantity').textContent = summary.normal.quantity || 0;
    document.getElementById('ordersPlannedQuantity').textContent = summary.planned.quantity || 0;
    document.getElementById('totalOrderCost').textContent = formatCurrency(summary.totalCost || 0);
    document.getElementById('ordersTotalProducts').textContent = (summary.productsToOrder || 0);
    document.getElementById('ordersProductsToOrder').textContent = (summary.productsToOrder || 0);
}

function renderOrderTable(result) {
    var container = document.getElementById('ordersTable');
    if (!container) return;
    var products = result.products || [];
    if (orderFilter !== 'all') products = products.filter(function(p) { return p.priority === orderFilter; });
    var priorityOrder = { urgent: 0, normal: 1, planned: 2 };
    products.sort(function(a, b) { var pDiff = (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99); if (pDiff !== 0) return pDiff; return (b.recommendedOrder || 0) - (a.recommendedOrder || 0); });
    if (!products.length) { container.innerHTML = '<div class="empty-state">Нет товаров для отображения</div>'; return; }
    var priorityLabels = { urgent: '<span class="priority-badge priority-urgent">Срочный</span>', normal: '<span class="priority-badge priority-normal">Обычный</span>', planned: '<span class="priority-badge priority-planned">Плановый</span>' };
    var html = '<table><thead><tr><th>Артикул</th><th>Наименование</th><th class="num">Продажи 30 дн.</th><th class="num">Скорость/день</th><th class="num">Остаток МС</th><th class="num">Остаток Ozon</th><th class="num">Остаток WB</th><th class="num">Всего остаток</th><th class="num">Дней запаса</th><th>Приоритет</th><th class="num">К заказу</th><th class="num">Стоимость</th></tr></thead><tbody>';
    products.forEach(function(p) {
        var order = p.recommendedOrder || 0;
        var ms = p.ourWarehouse || 0;
        var oz = p.ozonStock || 0;
        var wb = p.wbStock || 0;
        var total = ms + oz + wb;
        var days = p.daysOfStock === 999 ? '—' : (p.daysOfStock || 0).toFixed(1) + ' дн.';
        var daysClass = p.daysOfStock !== 999 && p.daysOfStock < 15 ? 'style="color:var(--danger);font-weight:700"' : '';
        html += '<tr><td><code>' + escapeHtml(p.article || '—') + '</code></td><td>' + escapeHtml(p.name || '—') + '</td><td class="num">' + (p.salesLast30Days || 0).toLocaleString('ru-RU') + '</td><td class="num">' + (p.dailySales || 0).toFixed(2) + '</td><td class="num">' + ms.toLocaleString('ru-RU') + '</td><td class="num">' + oz.toLocaleString('ru-RU') + '</td><td class="num">' + wb.toLocaleString('ru-RU') + '</td><td class="num" style="font-weight:700">' + total.toLocaleString('ru-RU') + '</td><td class="num" ' + daysClass + '>' + days + '</td><td>' + (priorityLabels[p.priority] || '—') + '</td><td class="num" style="font-weight:700;color:' + (order > 0 ? 'var(--danger)' : 'var(--text-tertiary)') + '">' + order + '</td><td class="num">' + formatCurrency(p.orderCost || 0) + '</td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
    document.getElementById('ordersTableContainer').style.display = 'block';
}

function formatCurrency(value) { if (value >= 1000) return value.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); return value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

async function calculateOrders() {
    try {
        showToast('⏳ Выполняется расчёт...');
        var products = getProductsForOrderCalculation();
        if (!products.length) { showToast('❌ Нет данных для расчёта. Загрузите остатки.'); return; }
        // Получаем реальные остатки и продажи Ozon (3 ИП) прямо из браузера
        var apiResult = await applyOzonApiToProducts(products);
        products = apiResult.products;
        var result = OrderCalculator.calculateAll(products);
        lastOrderResult = result;
        renderOrderSummary(result.summary);
        renderOrderTable(result);
        renderOzonApiStatus();
        var apiInfo = apiResult.updated > 0 ? ' · Ozon API: ' + apiResult.updated + ' обновл.' : '';
        document.getElementById('ordersLastUpdate').textContent = 'Последнее обновление: ' + new Date().toLocaleString() + apiInfo;
        showToast('✅ Расчёт выполнен: ' + result.summary.productsToOrder + ' товаров к заказу');
    } catch (error) { showToast('❌ Ошибка: ' + error.message); }
}

function exportOrdersCSV() {
    if (!lastOrderResult) { showToast('Сначала выполните расчёт'); return; }
    var csv = 'Артикул;Наименование;Продажи 30 дн.;Скорость/день;Остаток МС;Остаток Ozon;Остаток WB;Всего остаток;Дней запаса;Приоритет;К заказу;Стоимость\n';
    lastOrderResult.products.forEach(function(p) {
        if ((p.recommendedOrder || 0) > 0) {
            var ms = p.ourWarehouse || 0, oz = p.ozonStock || 0, wb = p.wbStock || 0, total = ms + oz + wb;
            csv += p.article + ';' + p.name + ';' + (p.salesLast30Days || 0) + ';' + (p.dailySales || 0).toFixed(2) + ';' + ms + ';' + oz + ';' + wb + ';' + total + ';' + (p.daysOfStock === 999 ? '—' : (p.daysOfStock || 0).toFixed(1)) + ';' + p.priority + ';' + p.recommendedOrder + ';' + (p.orderCost || 0).toFixed(2) + '\n';
        }
    });
    downloadCSV(csv, 'расчёт_заказа.csv');
    showToast('📊 CSV экспортирован');
}

var ordersTabInitialized = false;

function initOrdersTab() {
    if (ordersTabInitialized) return;
    ordersTabInitialized = true;
    OrderCalculator.loadConfig();
    document.getElementById('btnCalculateOrders').addEventListener('click', calculateOrders);
    document.getElementById('btnExportOrders').addEventListener('click', exportOrdersCSV);
    document.getElementById('btnSaveOrderSettings').addEventListener('click', function() { OrderCalculator.saveConfig(); });
    document.querySelectorAll('[data-order-filter]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-order-filter]').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            orderFilter = this.dataset.orderFilter;
            if (lastOrderResult) renderOrderTable(lastOrderResult);
        });
    });
    // Подразделы: Заказы / Скорость продаж
    document.querySelectorAll('[data-orders-sub]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var sub = this.dataset.ordersSub;
            document.querySelectorAll('#page-orders .sub-nav-btn').forEach(function(b) { b.classList.remove('active'); });
            document.querySelectorAll('#page-orders .sub-page').forEach(function(p) { p.classList.remove('active'); });
            this.classList.add('active');
            document.getElementById('orders-sub-' + sub).classList.add('active');
            if (sub === 'sales') initSalesTab();
        });
    });
    // Скорость продаж
    document.getElementById('btnRefreshSales').addEventListener('click', refreshSales);
    document.getElementById('btnExportSales').addEventListener('click', exportSalesCSV);
    document.querySelectorAll('[data-sales-mp]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-sales-mp]').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            salesMarketplace = this.dataset.salesMp;
            renderSales();
        });
    });
    document.querySelectorAll('[data-sales-filter]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-sales-filter]').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            salesFilter = this.dataset.salesFilter;
            renderSales();
        });
    });
}

// ============ СКОРОСТЬ ПРОДАЖ ============
var salesMarketplace = 'ozon'; // 'ozon' | 'wb'
var salesFilter = 'all'; // 'all' | 'withSales' | 'noSales'
var salesData = null; // { products: [...], lastUpdate: Date, marketplace: 'ozon'|'wb' }

function initSalesTab() {
    if (!salesData) refreshSales();
    else renderSales();
}

async function refreshSales() {
    try {
        showToast('⏳ Загрузка скорости продаж...');
        var statusEl = document.getElementById('salesApiStatus');
        if (statusEl) statusEl.innerHTML = '<span style="color:var(--warning)">⏳ Загрузка данных...</span>';
        var products = [];
        if (salesMarketplace === 'ozon') {
            // Ozon: остатки + продажи через API (3 ИП)
            var articles = [];
            ozonStockData.forEach(function(s) { if (s.article) articles.push(s.article); });
            msStockData.forEach(function(s) { if (s.article) articles.push(s.article); });
            articles = Array.from(new Set(articles));
            if (!articles.length) { showToast('❌ Нет данных об остатках Ozon'); return; }
            var stocks = await ozonFetchStocks(articles);
            var sales = await ozonFetchSales(articles, 30);
            var allArticles = new Set(Object.keys(stocks).concat(Object.keys(sales)));
            allArticles.forEach(function(article) {
                var stock = stocks[article] || { present: 0, name: article };
                var sale = sales[article] || { ordered_units: 0 };
                products.push({
                    article: article,
                    name: stock.name || article,
                    sales30: sale.ordered_units || 0,
                    stock: stock.present || 0,
                    perDay: ((sale.ordered_units || 0) / 30)
                });
            });
        } else {
            // WB: пока нет API-ключа, используем данные из остатков WB (продажи = 0)
            var wbArticles = [];
            wbStockData.forEach(function(s) { if (s.article) wbArticles.push(s.article); });
            wbArticles = Array.from(new Set(wbArticles));
            wbArticles.forEach(function(article) {
                var wb = wbStockData.find(function(s) { return s.article === article; });
                products.push({
                    article: article,
                    name: wb ? wb.name || article : article,
                    sales30: 0,
                    stock: wb ? wb.balance || 0 : 0,
                    perDay: 0
                });
            });
            if (statusEl) statusEl.innerHTML = '<span style="color:var(--warning)">⚠ WB API не настроен — показаны только остатки. Для скорости продаж WB нужен API-ключ.</span>';
        }
        products.sort(function(a, b) { return (b.sales30 || 0) - (a.sales30 || 0); });
        salesData = { products: products, lastUpdate: new Date(), marketplace: salesMarketplace };
        renderSales();
        showToast('✅ Скорость продаж обновлена: ' + products.length + ' товаров');
    } catch (e) {
        showToast('❌ Ошибка: ' + e.message);
        var statusEl = document.getElementById('salesApiStatus');
        if (statusEl) statusEl.innerHTML = '<span style="color:var(--danger)">⚠ ' + escapeHtml(e.message) + '</span>';
    }
}

function renderSales() {
    if (!salesData) return;
    var products = salesData.products || [];
    var statusEl = document.getElementById('salesApiStatus');
    if (statusEl) {
        var mpLabel = salesMarketplace === 'ozon' ? 'Ozon' : 'WB';
        statusEl.innerHTML = '<span style="color:var(--success)">✅ ' + mpLabel + ': обновлено ' + salesData.lastUpdate.toLocaleTimeString('ru-RU') + ' · ' + products.length + ' товаров</span>';
    }
    var lastUpdateEl = document.getElementById('salesLastUpdate');
    if (lastUpdateEl) lastUpdateEl.textContent = 'Последнее обновление: ' + salesData.lastUpdate.toLocaleString('ru-RU');

    // Сводка
    var total30 = products.reduce(function(s, p) { return s + (p.sales30 || 0); }, 0);
    var withSales = products.filter(function(p) { return (p.sales30 || 0) > 0; });
    var perDay = total30 / 30;
    var top = products.length ? products[0] : null;
    document.getElementById('salesSummary').style.display = 'block';
    document.getElementById('salesTotal30').textContent = total30.toLocaleString('ru-RU');
    document.getElementById('salesPerDay').textContent = perDay.toFixed(1);
    document.getElementById('salesProductsWithSales').textContent = withSales.length;
    if (top && top.sales30 > 0) {
        document.getElementById('salesTopProduct').textContent = top.article;
        document.getElementById('salesTopProductQty').textContent = top.sales30.toLocaleString('ru-RU') + ' шт. за 30 дн.';
    } else {
        document.getElementById('salesTopProduct').textContent = '—';
        document.getElementById('salesTopProductQty').textContent = '—';
    }

    // Таблица
    var filtered = products.slice();
    if (salesFilter === 'withSales') filtered = filtered.filter(function(p) { return (p.sales30 || 0) > 0; });
    else if (salesFilter === 'noSales') filtered = filtered.filter(function(p) { return (p.sales30 || 0) === 0; });
    document.getElementById('salesTableContainer').style.display = 'block';
    document.getElementById('salesTotalProducts').textContent = products.length;
    document.getElementById('salesWithSalesCount').textContent = withSales.length;
    var container = document.getElementById('salesTable');
    if (!filtered.length) { container.innerHTML = '<div class="empty-state">Нет данных</div>'; return; }
    var html = '<table><thead><tr><th>Артикул</th><th>Наименование</th><th class="num">Продажи 30 дн.</th><th class="num">Скорость/день</th><th class="num">Остаток</th><th class="num">Дней запаса</th></tr></thead><tbody>';
    filtered.forEach(function(p) {
        var days = p.perDay > 0 ? (p.stock / p.perDay).toFixed(1) : '—';
        var daysClass = p.perDay > 0 && (p.stock / p.perDay) < 15 ? 'style="color:var(--danger);font-weight:700"' : '';
        html += '<tr><td><code>' + escapeHtml(p.article) + '</code></td><td>' + escapeHtml(p.name) + '</td><td class="num" style="font-weight:700">' + (p.sales30 || 0).toLocaleString('ru-RU') + '</td><td class="num">' + (p.perDay || 0).toFixed(2) + '</td><td class="num">' + (p.stock || 0).toLocaleString('ru-RU') + '</td><td class="num" ' + daysClass + '>' + days + '</td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function exportSalesCSV() {
    if (!salesData) { showToast('Сначала обновите данные'); return; }
    var csv = 'Артикул;Наименование;Продажи 30 дн.;Скорость/день;Остаток;Дней запаса\n';
    salesData.products.forEach(function(p) {
        var days = p.perDay > 0 ? (p.stock / p.perDay).toFixed(1) : '—';
        csv += p.article + ';' + p.name + ';' + (p.sales30 || 0) + ';' + (p.perDay || 0).toFixed(2) + ';' + (p.stock || 0) + ';' + days + '\n';
    });
    downloadCSV(csv, 'скорость_продаж_' + salesMarketplace + '.csv');
    showToast('📊 CSV экспортирован');
}

// ============ EXPENSES & TRANSFERS ============
function renderExpensesAnalytics() {
    var container = document.getElementById('expensesAnalyticsCard');
    if (!container) return;
    if (!warehouseExpenses.length) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    var totalAmount = warehouseExpenses.reduce(function(s, e) { return s + (e.amount || 0); }, 0);
    var totalFull = warehouseExpenses.reduce(function(s, e) { return s + (e.amountFull || e.amount || 0); }, 0);
    var count = warehouseExpenses.length;
    var byCategory = {};
    warehouseExpenses.forEach(function(e) { var c = e.category || 'Другое'; if (!byCategory[c]) byCategory[c] = { amount: 0, amountFull: 0, count: 0 }; byCategory[c].amount += e.amount || 0; byCategory[c].amountFull += e.amountFull || e.amount || 0; byCategory[c].count++; });
    var cats = Object.keys(byCategory).sort();
    var h = '<div class="log-card"><div class="log-card-header"><span class="log-card-title">📊 Сводная по расходам</span><span class="log-card-month">Всего: ' + count + ' расходов</span></div>';
    h += '<table class="log-table"><thead><tr><th>Категория</th><th class="num">Кол-во</th><th class="num">Без НДС</th><th class="num">С НДС</th></tr></thead><tbody>';
    h += '<tr class="row-total"><td><b>Всего</b></td><td class="num"><b>' + count + '</b></td><td class="num"><b>' + formatAmount(totalAmount) + ' ₽</b></td><td class="num"><b>' + formatAmount(totalFull) + ' ₽</b></td></tr>';
    cats.forEach(function(c) { var d = byCategory[c]; h += '<tr><td>' + escapeHtml(c) + '</td><td class="num">' + d.count + '</td><td class="num">' + formatAmount(d.amount) + ' ₽</td><td class="num">' + formatAmount(d.amountFull) + ' ₽</td></tr>'; });
    h += '</tbody></table>';

    // Monthly history
    var byMonth = {};
    warehouseExpenses.forEach(function(e) { if (!e.date) return; var m = e.date.slice(0, 7); if (!byMonth[m]) byMonth[m] = { amount: 0, amountFull: 0, count: 0 }; byMonth[m].amount += e.amount || 0; byMonth[m].amountFull += e.amountFull || e.amount || 0; byMonth[m].count++; });
    var months = Object.keys(byMonth).sort().reverse();
    h += '<div class="log-history-toggle" id="expMonthsToggle"><span class="toggle-arrow">▶</span> Показать историю по месяцам <span style="margin-left:auto;font-size:10px;color:var(--text-tertiary)">' + months.length + ' мес.</span></div>';
    h += '<div class="log-history-body" id="expMonthsBody" style="display:none">';
    h += '<table class="log-table"><thead><tr><th>Месяц</th><th class="num">Кол-во</th><th class="num">Без НДС</th><th class="num">С НДС</th></tr></thead><tbody>';
    months.forEach(function(m) { var d = byMonth[m]; h += '<tr><td><b>' + m + '</b></td><td class="num">' + d.count + '</td><td class="num">' + formatAmount(d.amount) + ' ₽</td><td class="num">' + formatAmount(d.amountFull) + ' ₽</td></tr>'; });
    h += '</tbody></table></div></div>';
    container.innerHTML = h;

    var toggle = document.getElementById('expMonthsToggle');
    var body = document.getElementById('expMonthsBody');
    if (toggle && body) {
        toggle.onclick = function() {
            var isOpen = body.style.display !== 'none';
            body.style.display = isOpen ? 'none' : 'block';
            toggle.classList.toggle('expanded', !isOpen);
            toggle.innerHTML = isOpen
                ? '<span class="toggle-arrow">▶</span> Показать историю по месяцам <span style="margin-left:auto;font-size:10px;color:var(--text-tertiary)">' + months.length + ' мес.</span>'
                : '<span class="toggle-arrow">▼</span> Скрыть историю';
        };
    }
}

function renderExpenses() {
    var strip = document.getElementById('expensesKpiStrip');
    if (strip) {
        var totalAmount = warehouseExpenses.reduce(function(s, e) { return s + (e.amount || 0); }, 0);
        var totalFull = warehouseExpenses.reduce(function(s, e) { return s + (e.amountFull || e.amount || 0); }, 0);
        var count = warehouseExpenses.length;
        var withNds22 = warehouseExpenses.filter(function(e) { return e.nds === '22%'; }).reduce(function(s, e) { return s + (e.amount || 0); }, 0);
        strip.innerHTML = '<div class="kpi-item"><span class="kpi-item-label">Всего расходов:</span><span class="kpi-item-value">' + count + '</span></div><div class="kpi-divider"></div><div class="kpi-item"><span class="kpi-item-label">Сумма без НДС:</span><span class="kpi-item-value" style="color:var(--danger);">' + formatAmount(totalAmount) + ' ₽</span></div><div class="kpi-divider"></div><div class="kpi-item"><span class="kpi-item-label">С НДС:</span><span class="kpi-item-value" style="color:var(--danger);">' + formatAmount(totalFull) + ' ₽</span></div><div class="kpi-divider"></div><div class="kpi-item"><span class="kpi-item-label">НДС 22%:</span><span class="kpi-item-value">' + formatAmount(withNds22) + ' ₽</span></div>';
    }

    // Populate filter selects
    var supSelect = document.getElementById('expFilterSupplier');
    if (supSelect) {
        var currentVal = supSelect.value;
        var suppliers = {};
        warehouseExpenses.forEach(function(e) { if (e.supplier) suppliers[e.supplier] = true; });
        var opts = '<option value="all">Все поставщики</option>';
        Object.keys(suppliers).sort().forEach(function(s) { opts += '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + '</option>'; });
        supSelect.innerHTML = opts;
        supSelect.value = currentVal;
    }
    var catSelect = document.getElementById('expFilterCategory');
    if (catSelect) {
        var currentCat = catSelect.value;
        var cats = {};
        warehouseExpenses.forEach(function(e) { if (e.category) cats[e.category] = true; });
        var opts2 = '<option value="all">Все категории</option>';
        Object.keys(cats).sort().forEach(function(c) { opts2 += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; });
        catSelect.innerHTML = opts2;
        catSelect.value = currentCat;
    }

    // Filter & render table
    var fm = document.getElementById('expFilterMonth') ? document.getElementById('expFilterMonth').value : '';
    var fs = supSelect ? supSelect.value : 'all';
    var fc = catSelect ? catSelect.value : 'all';
    var filtered = warehouseExpenses.slice();
    if (fm) filtered = filtered.filter(function(e) { return e.date && e.date.startsWith(fm); });
    if (fs !== 'all') filtered = filtered.filter(function(e) { return e.supplier === fs; });
    if (fc !== 'all') filtered = filtered.filter(function(e) { return e.category === fc; });
    filtered.sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });

    var table = document.getElementById('expensesTable');
    if (!table) return;
    if (!filtered.length) { table.innerHTML = '<div class="empty-state">Нет расходов</div>'; return; }
    var h = '';
    filtered.forEach(function(e) {
        var ndsLabel = e.nds === '22%' ? '22%' : e.nds === '7%' ? '7%' : 'Без НДС';
        h += '<div class="expense-card">';
        h += '<div><div class="exp-date">' + (e.date || '').split('-').reverse().join('.') + '</div>';
        h += '<div class="exp-supplier">' + escapeHtml(e.supplier || '—') + '</div>';
        h += '<div class="exp-desc">' + escapeHtml(e.description || '') + '</div></div>';
        h += '<div><div class="exp-amount">' + (e.amount || 0).toLocaleString('ru-RU') + ' ₽</div>';
        h += '<div><span class="exp-category">' + escapeHtml(e.category || '') + '</span></div>';
        h += '<div class="exp-nds">НДС: ' + ndsLabel + ' · ' + escapeHtml(e.warehouse || '') + '</div></div>';
        h += '<button type="button" class="exp-delete" data-exp-delete="' + e.id + '">&times;</button>';
        h += '</div>';
    });
    table.innerHTML = h;
    saveAllToLocalStorage();

    // Analytics
    renderExpensesAnalytics();
}

function renderExpensesMonthlySummary() {
    var container = document.getElementById('expensesMonthlySummary');
    if (!container) return;
    var byMonth = {};
    warehouseExpenses.forEach(function(e) {
        if (!e.date) return;
        var m = e.date.slice(0, 7);
        if (!byMonth[m]) byMonth[m] = { amount: 0, amountFull: 0, count: 0 };
        byMonth[m].amount += e.amount || 0;
        byMonth[m].amountFull += e.amountFull || e.amount || 0;
        byMonth[m].count++;
    });
    var months = Object.keys(byMonth).sort().reverse();
    if (!months.length) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    var h = '<div class="log-card"><div class="log-card-header"><span class="log-card-title">📊 Сводная по месяцам</span></div><table class="log-table"><thead><tr><th>Месяц</th><th class="num">Кол-во</th><th class="num">Без НДС</th><th class="num">С НДС</th></tr></thead><tbody>';
    months.forEach(function(m) {
        var d = byMonth[m];
        h += '<tr><td><b>' + m + '</b></td><td class="num">' + d.count + '</td><td class="num">' + formatAmount(d.amount) + ' ₽</td><td class="num">' + formatAmount(d.amountFull) + ' ₽</td></tr>';
    });
    h += '</tbody></table></div>';
    container.innerHTML = h;
}

async function addExpense() {
    var de = document.getElementById('expDate'), se = document.getElementById('expSupplier'), ce = document.getElementById('expCategory'), de2 = document.getElementById('expDescription'), ae = document.getElementById('expAmount'), ne = document.getElementById('expNds'), we = document.getElementById('expWarehouse');
    if (!de || !se || !ae) return;
    var date = de.value, supplier = se.value, category = ce ? ce.value : '', desc = de2 ? de2.value.trim() : '', amount = parseFloat(ae.value) || 0, nds = ne ? ne.value : '22%', warehouse = we ? we.value : 'Москва';
    if (!date || !supplier || amount <= 0) { alert('Заполните дату, поставщика и сумму'); return; }
    var rate = nds === '22%' ? 1.22 : nds === '7%' ? 1.07 : 1;
    var expense = { id: generateUniqueId(), date: date, supplier: supplier, category: category, description: desc, amount: amount, amountFull: Math.round(amount * rate * 100) / 100, nds: nds, warehouse: warehouse, createdAt: new Date().toISOString() };
    warehouseExpenses.push(expense);
    saveAllToLocalStorage();
    if (isOnline) try { await db.collection('settings').doc('warehouseExpenses').set({ items: warehouseExpenses }, { merge: true }); } catch(e) {}
    if (de2) de2.value = '';
    if (ae) ae.value = '';
    renderExpenses();
    showToast('Расход добавлен');
}

function deleteExpense(id) {
    if (!confirm('Удалить расход?')) return;
    warehouseExpenses = warehouseExpenses.filter(function(e) { return e.id !== id; });
    saveAllToLocalStorage();
    renderExpenses();
    showToast('Расход удалён');
}

function resetExpFilters() {
    var fme = document.getElementById('expFilterMonth'), fse = document.getElementById('expFilterSupplier'), fce = document.getElementById('expFilterCategory');
    if (fme) fme.value = '';
    if (fse) fse.value = 'all';
    if (fce) fce.value = 'all';
    renderExpenses();
}

function renderTransfersAnalytics() {
    var container = document.getElementById('transfersAnalyticsCard');
    if (!container) return;
    if (!warehouseTransfers.length) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    var totalQty = warehouseTransfers.reduce(function(s, t) { return s + (t.qty || 0); }, 0);
    var totalCost = warehouseTransfers.reduce(function(s, t) { return s + (t.cost || 0); }, 0);
    var count = warehouseTransfers.length;
    var mskToPushQty = warehouseTransfers.filter(function(t) { return t.from === 'Москва' && t.to === 'Пушкино'; }).reduce(function(s, t) { return s + (t.qty || 0); }, 0);
    var mskToPushCost = warehouseTransfers.filter(function(t) { return t.from === 'Москва' && t.to === 'Пушкино'; }).reduce(function(s, t) { return s + (t.cost || 0); }, 0);
    var pushToMskQty = warehouseTransfers.filter(function(t) { return t.from === 'Пушкино' && t.to === 'Москва'; }).reduce(function(s, t) { return s + (t.qty || 0); }, 0);
    var pushToMskCost = warehouseTransfers.filter(function(t) { return t.from === 'Пушкино' && t.to === 'Москва'; }).reduce(function(s, t) { return s + (t.cost || 0); }, 0);
    var h = '<div class="log-card">';
    h += '<div class="log-card-header"><span class="log-card-title">📊 Сводная по перемещениям</span><span class="log-card-month">Всего: ' + count + ' перемещений</span></div>';
    h += '<table class="log-table"><thead><tr><th>Направление</th><th class="num">Паллет</th><th class="num">Стоимость</th></tr></thead><tbody>';
    h += '<tr class="row-total"><td><b>Всего</b></td><td class="num"><b>' + totalQty.toLocaleString('ru-RU') + '</b></td><td class="num"><b>' + totalCost.toLocaleString('ru-RU') + ' ₽</b></td></tr>';
    h += '<tr><td>Москва → Пушкино</td><td class="num">' + mskToPushQty.toLocaleString('ru-RU') + '</td><td class="num">' + mskToPushCost.toLocaleString('ru-RU') + ' ₽</td></tr>';
    h += '<tr><td>Пушкино → Москва</td><td class="num">' + pushToMskQty.toLocaleString('ru-RU') + '</td><td class="num">' + pushToMskCost.toLocaleString('ru-RU') + ' ₽</td></tr>';
    h += '</tbody></table>';

    // Monthly history — expandable inside the same card
    var byMonth = {};
    warehouseTransfers.forEach(function(t) {
        if (!t.date) return;
        var m = t.date.slice(0, 7);
        if (!byMonth[m]) byMonth[m] = { qty: 0, cost: 0, count: 0 };
        byMonth[m].qty += t.qty || 0;
        byMonth[m].cost += t.cost || 0;
        byMonth[m].count++;
    });
    var months = Object.keys(byMonth).sort().reverse();
    h += '<div class="log-history-toggle" id="trMonthsToggle"><span class="toggle-arrow">▶</span> Показать историю по месяцам <span style="margin-left:auto;font-size:10px;color:var(--text-tertiary)">' + months.length + ' мес.</span></div>';
    h += '<div class="log-history-body" id="trMonthsBody" style="display:none">';
    h += '<table class="log-table"><thead><tr><th>Месяц</th><th class="num">Кол-во</th><th class="num">Паллет</th><th class="num">Стоимость</th></tr></thead><tbody>';
    months.forEach(function(m) {
        var d = byMonth[m];
        h += '<tr><td><b>' + m + '</b></td><td class="num">' + d.count + '</td><td class="num">' + d.qty.toLocaleString('ru-RU') + '</td><td class="num">' + d.cost.toLocaleString('ru-RU') + ' ₽</td></tr>';
    });
    h += '</tbody></table></div></div>';
    container.innerHTML = h;

    // Bind toggle
    var toggle = document.getElementById('trMonthsToggle');
    var body = document.getElementById('trMonthsBody');
    if (toggle && body) {
        toggle.onclick = function() {
            var isOpen = body.style.display !== 'none';
            body.style.display = isOpen ? 'none' : 'block';
            toggle.classList.toggle('expanded', !isOpen);
            toggle.innerHTML = isOpen 
                ? '<span class="toggle-arrow">▶</span> Показать историю по месяцам <span style="margin-left:auto;font-size:10px;color:var(--text-tertiary)">' + months.length + ' мес.</span>'
                : '<span class="toggle-arrow">▼</span> Скрыть историю';
        };
    }
}

function renderTransfers() {
    var strip = document.getElementById('transfersKpiStrip');
    if (strip) {
        var totalQty = warehouseTransfers.reduce(function(s, t) { return s + (t.qty || 0); }, 0);
        var count = warehouseTransfers.length;
        var mskToPush = warehouseTransfers.filter(function(t) { return t.from === 'Москва' && t.to === 'Пушкино'; }).reduce(function(s, t) { return s + (t.qty || 0); }, 0);
        var pushToMsk = warehouseTransfers.filter(function(t) { return t.from === 'Пушкино' && t.to === 'Москва'; }).reduce(function(s, t) { return s + (t.qty || 0); }, 0);
        strip.innerHTML = '<div class="kpi-item"><span class="kpi-item-label">Перемещений:</span><span class="kpi-item-value">' + count + '</span></div><div class="kpi-divider"></div><div class="kpi-item"><span class="kpi-item-label">Всего ед.:</span><span class="kpi-item-value">' + totalQty.toLocaleString('ru-RU') + '</span></div><div class="kpi-divider"></div><div class="kpi-item"><span class="kpi-item-label">Москва → Пушкино:</span><span class="kpi-item-value" style="color:var(--accent);">' + mskToPush.toLocaleString('ru-RU') + '</span></div><div class="kpi-divider"></div><div class="kpi-item"><span class="kpi-item-label">Пушкино → Москва:</span><span class="kpi-item-value" style="color:var(--accent);">' + pushToMsk.toLocaleString('ru-RU') + '</span></div>';
    }

    var fm = document.getElementById('trFilterMonth') ? document.getElementById('trFilterMonth').value : '';
    var fd = document.getElementById('trFilterDirection') ? document.getElementById('trFilterDirection').value : 'all';
    var filtered = warehouseTransfers.slice();
    if (fm) filtered = filtered.filter(function(t) { return t.date && t.date.startsWith(fm); });
    if (fd !== 'all') {
        filtered = filtered.filter(function(t) {
            if (fd === 'Москва→Пушкино') return t.from === 'Москва' && t.to === 'Пушкино';
            if (fd === 'Пушкино→Москва') return t.from === 'Пушкино' && t.to === 'Москва';
            return true;
        });
    }
    filtered.sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });

    var table = document.getElementById('transfersTable');
    if (!table) return;
    if (!filtered.length) { table.innerHTML = '<div class="empty-state">Нет перемещений</div>'; return; }
    var h = '';
    filtered.forEach(function(t) {
        h += '<div class="transfer-card">';
        h += '<div><div class="tr-date">' + (t.date || '').split('-').reverse().join('.') + '</div>';
        h += '<div class="tr-direction">' + escapeHtml(t.from || '') + ' → ' + escapeHtml(t.to || '') + '</div></div>';
        h += '<div><div class="tr-qty">' + (t.qty || 0).toLocaleString('ru-RU') + '</div><div class="tr-label">паллет</div></div>';
        h += '<div><div class="tr-cost">' + ((t.cost || 0).toLocaleString('ru-RU')) + ' ₽</div><div class="tr-label">перевозка</div></div>';
        h += '<button type="button" class="tr-delete" data-tr-delete="' + t.id + '">&times;</button>';
        h += '</div>';
    });
    table.innerHTML = h;
    saveAllToLocalStorage();

    // Analytics card
    renderTransfersAnalytics();
}

function renderTransfersMonthlySummary() {
    var container = document.getElementById('transfersMonthlySummary');
    if (!container) return;
    var byMonth = {};
    warehouseTransfers.forEach(function(t) {
        if (!t.date) return;
        var m = t.date.slice(0, 7);
        if (!byMonth[m]) byMonth[m] = { qty: 0, count: 0 };
        byMonth[m].qty += t.qty || 0;
        byMonth[m].count++;
    });
    var months = Object.keys(byMonth).sort().reverse();
    if (!months.length) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    var h = '<div class="log-card"><div class="log-card-header"><span class="log-card-title">📊 Сводная по месяцам</span></div><table class="log-table"><thead><tr><th>Месяц</th><th class="num">Кол-во</th><th class="num">Всего ед.</th></tr></thead><tbody>';
    months.forEach(function(m) {
        var d = byMonth[m];
        h += '<tr><td><b>' + m + '</b></td><td class="num">' + d.count + '</td><td class="num">' + d.qty.toLocaleString('ru-RU') + '</td></tr>';
    });
    h += '</tbody></table></div>';
    container.innerHTML = h;
}

async function addTransfer() {
    var de = document.getElementById('trDate'), fe = document.getElementById('trFrom'), te2 = document.getElementById('trTo'), qe = document.getElementById('trQty'), ce = document.getElementById('trCost');
    if (!de || !fe || !te2 || !qe) return;
    var date = de.value, from = fe.value, to = te2.value, qty = parseInt(qe.value) || 0, cost = parseFloat(ce ? ce.value : 0) || 0;
    if (!date || qty <= 0) { alert('Заполните дату и количество'); return; }
    if (from === to) { alert('Склады должны быть разными'); return; }
    var transfer = { id: generateUniqueId(), date: date, from: from, to: to, qty: qty, cost: cost, createdAt: new Date().toISOString() };
    warehouseTransfers.push(transfer);
    saveAllToLocalStorage();
    if (isOnline) try { await db.collection('settings').doc('warehouseTransfers').set({ items: warehouseTransfers }, { merge: true }); } catch(e) {}
    if (ce) ce.value = '';
    if (qe) qe.value = '';
    renderTransfers();
    showToast('Перемещение добавлено');
}

function deleteTransfer(id) {
    if (!confirm('Удалить перемещение?')) return;
    warehouseTransfers = warehouseTransfers.filter(function(t) { return t.id !== id; });
    saveAllToLocalStorage();
    renderTransfers();
    showToast('Перемещение удалено');
}

function resetTrFilters() {
    var fme = document.getElementById('trFilterMonth'), fde = document.getElementById('trFilterDirection');
    if (fme) fme.value = '';
    if (fde) fde.value = 'all';
    renderTransfers();
}

// ============ INIT ============
function initTheme() { if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-theme'); }

function toggleTheme() { document.body.classList.toggle('dark-theme'); localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light'); }

function switchPage(page) {
    currentPage = page;
    localStorage.setItem('currentPage', page);
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active', 'wb-active', 'ozon-active', 'logistics-active', 'ved-active'); });
    var pe = document.getElementById('page-' + page);
    if (pe) pe.classList.add('active');
    var map = { schedule: 0, wb: 1, ozon: 2, logistics: 3, ved: 4, orders: 5 };
    var cls = ['active', 'wb-active', 'ozon-active', 'logistics-active', 'ved-active', 'active'];
    var btns = document.querySelectorAll('.nav-btn');
    if (btns[map[page]]) btns[map[page]].classList.add(cls[map[page]] || 'active');
    if (page === 'schedule') { var sp = document.getElementById('sub-page-' + currentSubPage); if (!sp || !sp.classList.contains('active')) { currentSubPage = 'weeks'; } renderKpiStrip(); renderSchedule(); }
    if (page === 'orders') { initOrdersTab(); }
    if (page === 'wb') { var wv = document.getElementById('wbWeekView'); if (wv && wbViewMode === 'week') renderWeekView('Wildberries'); }
    if (page === 'ozon') { var ov = document.getElementById('ozonWeekView'); if (ov && ozonViewMode === 'week') renderWeekView('Ozon'); }
    if (page === 'logistics') { renderLog(); renderLogAnalytics(); }
    if (page === 'ved') { renderVedCards(); renderVedKpiStrip(); }
}

function renderAll() {
    if (currentPage === 'schedule') { renderKpiStrip(); if (currentSubPage === 'weeks') renderSchedule(); }
    if (currentPage === 'logistics') { renderLog(); renderLogAnalytics(); }
}

// ============ INIT APP ============
function initApp() {
    initTheme();
    var today = getLocalDateString();
    ['logDate', 'shipDateWildberries', 'shipDateOzon'].forEach(function(id) { var el = document.getElementById(id); if (el) el.value = today; });
    var cl = document.getElementById('cityList');
    if (cl) cl.innerHTML = Object.keys(routesDB).map(function(c) { return '<option value="' + c + '">'; }).join('');
    currentPage = localStorage.getItem('currentPage') || 'schedule';
    currentSubPage = localStorage.getItem('currentSubPage') || 'weeks';
    loadAllFromLocalStorage();

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.addEventListener('click', function() { switchPage(this.dataset.page); }); });

    // Theme
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Logout
    document.getElementById('btnLogout').addEventListener('click', function() { firebase.auth().signOut(); });

    // Auth
    document.getElementById('btnLogin').addEventListener('click', handleAuthLogin);
    document.getElementById('btnRegister').addEventListener('click', handleAuthRegister);
    document.getElementById('showRegister').addEventListener('click', function(e) { e.preventDefault(); document.getElementById('authLogin').style.display = 'none'; document.getElementById('authRegister').style.display = 'block'; });
    document.getElementById('showLogin').addEventListener('click', function(e) { e.preventDefault(); document.getElementById('authLogin').style.display = 'block'; document.getElementById('authRegister').style.display = 'none'; });

    // Shipment forms
    document.getElementById('btnSaveWb').addEventListener('click', function() { saveShipment('Wildberries'); });
    document.getElementById('btnSaveOzon').addEventListener('click', function() { saveShipment('Ozon'); });
    if (document.getElementById('shipCityWildberries')) document.getElementById('shipCityWildberries').addEventListener('input', showRouteInfo);

    // Logistics
    document.getElementById('btnAddLog').addEventListener('click', addLogEntry);
    document.getElementById('btnToggleLogImport').addEventListener('click', toggleLogImport);
    document.getElementById('btnDoLogImport').addEventListener('click', doLogImport);
    document.getElementById('btnExportLog').addEventListener('click', function() {
        var csv = 'Дата;МП;Тип;Поставщик;Город;Кол-во;Паллет;Сумма;С НДС;Статус;НДС\n' + logEntries.map(function(e) { return e.date + ';' + e.marketplace + ';' + e.type + ';' + (e.supplier || '') + ';' + e.city + ';' + e.qty + ';' + e.boxes + ';' + e.amount + ';' + e.amountFull + ';' + (e.paid ? 'Оплачен' : 'Не опл.') + ';' + e.nds; }).join('\n');
        downloadCSV(csv, 'логистика.csv');
    });
    document.getElementById('btnResetLogFilters').addEventListener('click', resetLogFilters);
    document.getElementById('logFilterMonth').addEventListener('change', renderLog);
    document.getElementById('logFilterStatus').addEventListener('change', renderLog);
    document.getElementById('logFilterMP').addEventListener('change', renderLog);

    // Schedule
    document.getElementById('btnImportSchedule').addEventListener('click', toggleScheduleImport);
    document.getElementById('btnDoScheduleImport').addEventListener('click', doScheduleImport);
    document.getElementById('btnExportSchedule').addEventListener('click', exportScheduleCSV);

    // Forecast
    document.getElementById('btnSaveWarehouseSettings').addEventListener('click', saveWarehouseSettings);
    document.getElementById('btnResetSalesPlan').addEventListener('click', function() {
        warehouseData.salesPlan = { "Апрель": 343000000, "Май": 387000000, "Июнь": 428300000, "Июль": 494000000, "Август": 565000000, "Сентябрь": 629000000, "Октябрь": 697000000, "Ноябрь": 775000000, "Декабрь": 1149000000 };
        renderForecastTab();
        renderKpiStrip();
    });
    document.getElementById('btnImportExcelForSettings').addEventListener('click', function() {
        var inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.xlsx,.xls';
        inp.onchange = async function(ev) { var file = ev.target.files[0]; if (!file) return; try { await importExcelModel(file); showToast('Импортировано'); renderForecastTab(); renderKpiStrip(); } catch(err) { alert(err); } };
        inp.click();
    });

    // VED
    document.getElementById('btnAddVedList').addEventListener('click', addVedList);
    document.getElementById('btnSaveVed').addEventListener('click', saveVedSupply);
    document.getElementById('vedArticleSearch').addEventListener('input', function() { handleVedSearch(this.value); });

    // Stock
    document.getElementById('btnRefreshMsStock').addEventListener('click', function() { refreshStockFromFirebase('ms'); });
    document.getElementById('btnRefreshWbStock').addEventListener('click', function() { refreshStockFromFirebase('wb'); });
    document.getElementById('btnRefreshOzonStock').addEventListener('click', function() { refreshStockFromFirebase('ozon'); });
    document.getElementById('btnUploadMsExcel').addEventListener('click', function() { document.getElementById('msStockFileInput').click(); });
    document.getElementById('btnUploadWbExcel').addEventListener('click', function() { document.getElementById('wbStockFileInputNew').click(); });
    document.getElementById('btnUploadOzonExcel').addEventListener('click', function() { document.getElementById('ozonStockFileInputNew').click(); });
    document.getElementById('msStockFileInput').addEventListener('change', function() { if (this.files[0]) handleStockFileUpload('ms', this.files[0]); });
    document.getElementById('wbStockFileInputNew').addEventListener('change', function() { if (this.files[0]) handleStockFileUpload('wb', this.files[0]); });
    document.getElementById('ozonStockFileInputNew').addEventListener('change', function() { if (this.files[0]) handleStockFileUpload('ozon', this.files[0]); });
    document.getElementById('msStockSearch').addEventListener('input', function() { msStockPage = 1; renderMsStock(); });
    document.getElementById('msStockBalanceFilter').addEventListener('change', function() { msStockPage = 1; renderMsStock(); });
    document.getElementById('msStockWaitingFilter').addEventListener('change', function() { msStockPage = 1; renderMsStock(); });
    document.getElementById('msStockMatchFilter').addEventListener('change', function() { msStockPage = 1; renderMsStock(); });
    document.getElementById('btnExportMsStock').addEventListener('click', exportMsStockCSV);
    document.getElementById('btnResetMsStockFilters').addEventListener('click', resetMsStockFilters);
    document.getElementById('wbStockSearch').addEventListener('input', function() { renderWbStock(); });
    document.getElementById('wbStockBalanceFilter').addEventListener('change', renderWbStock);
    document.getElementById('wbStockWaitingFilter').addEventListener('change', renderWbStock);
    document.getElementById('ozonStockSearch').addEventListener('input', function() { renderOzonStock(); });
    document.getElementById('ozonStockBalanceFilter').addEventListener('change', renderOzonStock);
    document.getElementById('ozonStockWaitingFilter').addEventListener('change', renderOzonStock);
    document.getElementById('btnExportWbStock').addEventListener('click', function() { exportStockCSV('WB'); });
    document.getElementById('btnExportOzonStock').addEventListener('click', function() { exportStockCSV('Ozon'); });
    document.getElementById('btnResetWbStockFilters').addEventListener('click', function() { resetStockFilters('WB'); });
    document.getElementById('btnResetOzonStockFilters').addEventListener('click', function() { resetStockFilters('Ozon'); });

    // Stock status click events
    document.addEventListener('click', function(e) {
        var t = e.target;
        if (t.closest('#msStatAll') || t.closest('#msStatBalance')) { resetMsStockFilters(); return; }
        if (t.closest('#msStatWaiting')) { document.getElementById('msStockWaitingFilter').value = 'positive'; msStockPage = 1; renderMsStock(); return; }
        if (t.closest('#msFileRemove')) { removeStockFile('ms'); return; }
        if (t.closest('#wbFileRemove')) { removeStockFile('wb'); return; }
        if (t.closest('#ozonFileRemove')) { removeStockFile('ozon'); return; }
        if (t.closest('#msMetricMatched')) { document.getElementById('msStockMatchFilter').value = 'matched'; msStockPage = 1; renderMsStock(); return; }
        if (t.closest('#msMetricPartial')) { document.getElementById('msStockMatchFilter').value = 'partial'; msStockPage = 1; renderMsStock(); return; }
        if (t.closest('#msMetricUnmatched')) { document.getElementById('msStockMatchFilter').value = 'unmatched'; msStockPage = 1; renderMsStock(); return; }
    });

    // Expenses & Transfers
    document.getElementById('btnAddExpense').addEventListener('click', addExpense);
    document.getElementById('btnAddTransfer').addEventListener('click', addTransfer);
    document.getElementById('btnResetExpFilters').addEventListener('click', resetExpFilters);
    document.getElementById('btnResetTrFilters').addEventListener('click', resetTrFilters);
    document.getElementById('expFilterMonth').addEventListener('change', renderExpenses);
    document.getElementById('expFilterSupplier').addEventListener('change', renderExpenses);
    document.getElementById('expFilterCategory').addEventListener('change', renderExpenses);
    document.getElementById('trFilterMonth').addEventListener('change', renderTransfers);
    document.getElementById('trFilterDirection').addEventListener('change', renderTransfers);

    document.addEventListener('click', function(e) {
        var t = e.target;
        if (t.hasAttribute('data-exp-delete')) { deleteExpense(t.getAttribute('data-exp-delete')); }
        if (t.hasAttribute('data-tr-delete')) { deleteTransfer(t.getAttribute('data-tr-delete')); }
    });

    // WB/Ozon view
    document.getElementById('wbViewToggle').addEventListener('click', function(e) {
        if (e.target.dataset.wbView) switchWbView(e.target.dataset.wbView);
    });
    document.getElementById('ozonViewToggle').addEventListener('click', function(e) {
        if (e.target.dataset.ozonView) switchOzonView(e.target.dataset.ozonView);
    });

    // Logistics sub pages
    document.querySelectorAll('[data-log-sub]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            currentLogSubPage = this.dataset.logSub;
            document.querySelectorAll('#page-logistics .sub-nav-btn').forEach(function(b) { b.classList.remove('active'); });
            document.querySelectorAll('#page-logistics .sub-page').forEach(function(p) { p.classList.remove('active'); });
            this.classList.add('active');
            document.getElementById('log-sub-' + currentLogSubPage).classList.add('active');
            if (currentLogSubPage === 'shipments') { renderLog(); renderLogAnalytics(); }
            else if (currentLogSubPage === 'expenses') renderExpenses();
            else if (currentLogSubPage === 'transfers') renderTransfers();
        });
    });

    // WB/Ozon sub pages
    document.querySelectorAll('[data-wb-sub]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            currentWbSubPage = this.dataset.wbSub;
            document.querySelectorAll('#page-wb .sub-nav-btn').forEach(function(b) { b.classList.remove('active'); });
            document.querySelectorAll('#page-wb .sub-page').forEach(function(p) { p.classList.remove('active'); });
            this.classList.add('active');
            document.getElementById('wb-sub-' + currentWbSubPage).classList.add('active');
            if (currentWbSubPage === 'stock') renderWbStock();
            else if (currentWbSubPage === 'shipments') { if (wbViewMode === 'week') renderWeekView('Wildberries'); else renderShipmentCards('Wildberries'); }
        });
    });
    document.querySelectorAll('[data-ozon-sub]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            currentOzonSubPage = this.dataset.ozonSub;
            document.querySelectorAll('#page-ozon .sub-nav-btn').forEach(function(b) { b.classList.remove('active'); });
            document.querySelectorAll('#page-ozon .sub-page').forEach(function(p) { p.classList.remove('active'); });
            this.classList.add('active');
            document.getElementById('ozon-sub-' + currentOzonSubPage).classList.add('active');
            if (currentOzonSubPage === 'stock') renderOzonStock();
            else if (currentOzonSubPage === 'shipments') { if (ozonViewMode === 'week') renderWeekView('Ozon'); else renderShipmentCards('Ozon'); }
        });
    });

    // Schedule sub pages
    document.querySelectorAll('#page-schedule .sub-nav-btn').forEach(function(b) {
        b.addEventListener('click', function() {
            currentSubPage = this.dataset.subPage;
            document.querySelectorAll('#page-schedule .sub-nav-btn').forEach(function(x) { x.classList.remove('active'); });
            document.querySelectorAll('#page-schedule .sub-page').forEach(function(p) { p.classList.remove('active'); });
            this.classList.add('active');
            document.getElementById('sub-page-' + currentSubPage).classList.add('active');
            if (currentSubPage === 'weeks') renderSchedule();
            else if (currentSubPage === 'forecast') renderForecastTab();
            else if (currentSubPage === 'stock') renderMsStock();
        });
    });

    // Global click handler for cards, status, etc
    document.addEventListener('click', function(e) {
        var t = e.target;
        if (t.classList.contains('card-delete') && t.dataset.mp && t.dataset.id) { e.stopPropagation(); deleteShipment(t.dataset.mp, t.dataset.id); }
        if (t.classList.contains('card-edit') && t.dataset.editMp && t.dataset.editId) { e.stopPropagation(); startEditQty(t.dataset.editMp, t.dataset.editId); }
        if (t.hasAttribute('data-confirm-edit')) { e.stopPropagation(); saveEditQty(t.dataset.confirmEdit, t.dataset.confirmId); }
        if (t.classList.contains('status-select')) { return; }
        if (t.hasAttribute('data-week-toggle')) { toggleWeekDetails(t.getAttribute('data-week-toggle')); }
        if (t.hasAttribute('data-week-nav')) { changeWeek(t.dataset.weekNav, parseInt(t.dataset.delta)); }
        if (t.hasAttribute('data-month-nav')) { changeMonth(t.dataset.monthNav, parseInt(t.dataset.delta)); }
        if (t.hasAttribute('data-day-expand')) { toggleDayExpand(t.dataset.dayExpand, t.dataset.dayId); }
        if (t.hasAttribute('data-ms-page')) { var p = t.getAttribute('data-ms-page'); if (p === 'first') msStockPage = 1; else if (p === 'prev') msStockPage = Math.max(1, msStockPage - 1); else if (p === 'next') msStockPage = Math.min(msStockPage + 1, Math.ceil(getFilteredMsStockData().length / msStockPerPage)); else if (p === 'last') msStockPage = Math.ceil(getFilteredMsStockData().length / msStockPerPage); else msStockPage = parseInt(p); renderMsStockTable(); }
        if (t.hasAttribute('data-ved-delete')) { e.stopPropagation(); deleteVedSupply(t.getAttribute('data-ved-delete')); }
        if (t.hasAttribute('data-ved-include')) { e.stopPropagation(); toggleVedIncludeInModel(t.getAttribute('data-ved-include')); }
        if (t.hasAttribute('data-ved-list-remove')) { e.stopPropagation(); removeVedList(parseInt(t.getAttribute('data-ved-list-remove'))); }
        if (t.hasAttribute('data-log-paid')) { toggleLogPaid(t.getAttribute('data-log-paid')); }
        if (t.hasAttribute('data-log-delete')) { deleteLogEntry(t.getAttribute('data-log-delete')); }
        var vedBody = t.closest('.ved-card .card-body');
        if (vedBody && vedBody.hasAttribute('data-ved-toggle')) { if (t.tagName === 'SELECT' || t.tagName === 'BUTTON' || t.tagName === 'OPTION' || t.closest('select') || t.closest('button')) return; toggleVedDetails(vedBody.getAttribute('data-ved-toggle')); }
    });

    // Global change handler
    document.addEventListener('change', function(e) {
        var t = e.target;
        if (t.classList.contains('status-select')) { handleStatusChange(e); }
        if (t.hasAttribute('data-ved-status')) { updateVedStatus(t.getAttribute('data-ved-status'), t.value); }
        if (t.hasAttribute('data-log-supplier')) { updateLogSupplier(t.getAttribute('data-log-supplier'), t.value); }
        if (t.hasAttribute('data-log-nds')) { updateLogNds(t.getAttribute('data-log-nds'), t.value); }
        if (t.hasAttribute('data-log-pallets')) { updateLogPallets(t.getAttribute('data-log-pallets'), t.value); }
        if (t.hasAttribute('data-log-amount')) { updateLogAmount(t.getAttribute('data-log-amount'), t.value); }
        if (t.hasAttribute('data-week-cap')) { updateWeekCapacity(t.getAttribute('data-week-cap'), t.value); }
    });

    // Global input handler
    document.addEventListener('input', function(e) {
        var t = e.target;
        if (t.hasAttribute('data-sales-month')) { updateSalesPlan(t.getAttribute('data-sales-month'), t.value); }
    });

    // Initial page
    switchPage(currentPage);

    // Load from Firebase
    setTimeout(function() { if (currentUser) loadFromFirebase(); }, 100);
}

document.addEventListener('DOMContentLoaded', initApp);