(function () {
  'use strict';

  var apiMeta = document.querySelector('meta[name="api-base"]');
  var API_BASE = (apiMeta && apiMeta.getAttribute('content')) ? apiMeta.getAttribute('content').trim() : '';
  var isLocal = window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (!isLocal && (!API_BASE || API_BASE.indexOf('localhost') !== -1)) {
    API_BASE = 'https://site-bztf.onrender.com';
  }
  if (isLocal && !API_BASE) {
    API_BASE = window.location.origin.replace(/:\d+$/, ':3000') || 'http://localhost:3000';
  }
  var STORAGE_THEME = 'browdesing_theme';
  var SESSION_ADMIN_TOKEN = 'browdesing_admin_token';
  var savedTheme = localStorage.getItem(STORAGE_THEME) || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  var ADMIN_SECRET_HASH = 'bs2025';
  var STORAGE_APPOINTMENTS = 'browdesing_randevular';
  var STORAGE_CONTENT = 'browdesing_content';
  var STORAGE_CANCEL_CUTOFF_HOURS = 'browdesing_cancel_cutoff_hours';
  var STORAGE_ADMIN_USER = 'browdesing_admin_user';
  var STORAGE_ADMIN_PASS = 'browdesing_admin_pass';
  var SESSION_ADMIN = 'browdesing_admin_logged';
  var DEFAULT_USER = 'admin';
  var DEFAULT_PASS = 'admin123';

  function getAuthToken() { return sessionStorage.getItem(SESSION_ADMIN_TOKEN); }
  function setAuthToken(t) { if (t) sessionStorage.setItem(SESSION_ADMIN_TOKEN, t); else sessionStorage.removeItem(SESSION_ADMIN_TOKEN); }
  function apiHeaders() {
    var h = { 'Content-Type': 'application/json' };
    if (API_BASE && getAuthToken()) h.Authorization = 'Bearer ' + getAuthToken();
    return h;
  }

  var hash = (window.location.hash || '').replace('#', '');
  var gate = document.getElementById('admin-gate');
  var loginBox = document.getElementById('login-box');
  var adminPanel = document.getElementById('admin-panel');
  var loginForm = document.getElementById('login-form');
  var loginError = document.getElementById('login-error');
  var randevuList = document.getElementById('randevu-list');
  var randevuEmpty = document.getElementById('randevu-empty');
  var contentForm = document.getElementById('content-form');
  var passwordForm = document.getElementById('password-form');

  var cachedAppointments = [];

  function getAppointments() {
    if (API_BASE) return cachedAppointments;
    try {
      var raw = localStorage.getItem(STORAGE_APPOINTMENTS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function setAppointments(list) {
    if (API_BASE) { cachedAppointments = list; return; }
    localStorage.setItem(STORAGE_APPOINTMENTS, JSON.stringify(list));
  }

  function loadAppointmentsFromApi() {
    if (!API_BASE || !getAuthToken()) return;
    fetch(API_BASE + '/api/admin/appointments', { headers: apiHeaders() })
      .then(function (r) {
        if (!r.ok) return [];
        return r.json();
      })
      .then(function (list) {
        if (!Array.isArray(list)) return;
        cachedAppointments = list.map(function (r) {
          var d = r.date;
          if (d && typeof d === 'string' && d.length >= 10) d = d.slice(0, 10);
          return { id: r.id, date: d, time: r.time, service: r.service, name: r.name, email: r.email, phone: r.phone, manage_token: r.manage_token };
        });
        renderAdminCalendar();
        if (adminSelectedDate) renderRandevularForDate(adminSelectedDate);
        else renderRandevular();
      })
      .catch(function () {});
  }

  function getContent() {
    try {
      var raw = localStorage.getItem(STORAGE_CONTENT);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function setContent(obj) {
    localStorage.setItem(STORAGE_CONTENT, JSON.stringify(obj));
  }

  function getAdminUser() {
    return localStorage.getItem(STORAGE_ADMIN_USER) || DEFAULT_USER;
  }

  function getAdminPass() {
    return localStorage.getItem(STORAGE_ADMIN_PASS) || DEFAULT_PASS;
  }

  function setAdminCredentials(user, pass) {
    localStorage.setItem(STORAGE_ADMIN_USER, user || DEFAULT_USER);
    localStorage.setItem(STORAGE_ADMIN_PASS, pass || DEFAULT_PASS);
  }

  function isLoggedIn() {
    if (API_BASE) return !!getAuthToken();
    return sessionStorage.getItem(SESSION_ADMIN) === '1';
  }

  function setLoggedIn(token) {
    if (API_BASE && token) setAuthToken(token);
    else sessionStorage.setItem(SESSION_ADMIN, '1');
  }

  function logout() {
    if (API_BASE) setAuthToken(null);
    else sessionStorage.removeItem(SESSION_ADMIN);
    loginBox.hidden = false;
    adminPanel.hidden = true;
    loginError.style.display = 'none';
  }

  // Hash kontrolü
  if (hash !== ADMIN_SECRET_HASH) {
    gate.hidden = false;
    loginBox.hidden = true;
    adminPanel.hidden = true;
  } else {
    gate.hidden = true;
    if (isLoggedIn()) {
      loginBox.hidden = true;
      adminPanel.hidden = false;
      renderServiceFields();
      loadContentIntoForm();
      loadCancelCutoff();
      if (API_BASE) loadAppointmentsFromApi();
      else { renderAdminCalendar(); renderRandevular(); }
      if (API_BASE && typeof loadQuestions === 'function') loadQuestions();
      if (API_BASE && typeof startNotificationPoll === 'function') startNotificationPoll();
    } else {
      loginBox.hidden = false;
      adminPanel.hidden = true;
    }
  }

  // Giriş
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var user = document.getElementById('admin-user').value.trim();
      var pass = document.getElementById('admin-pass').value;
      if (API_BASE) {
        fetch(API_BASE + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password: pass }) })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.success && data.token) {
              loginError.style.display = 'none';
              setLoggedIn(data.token);
              loginBox.hidden = true;
              adminPanel.hidden = false;
              renderServiceFields();
              loadContentIntoForm();
              loadCancelCutoff();
              renderAdminCalendar();
              renderRandevular();
              if (typeof loadQuestions === 'function') loadQuestions();
              if (typeof startNotificationPoll === 'function') startNotificationPoll();
            } else {
              loginError.style.display = 'block';
            }
          })
          .catch(function () { loginError.style.display = 'block'; });
        return;
      }
      var expectedUser = getAdminUser();
      var expectedPass = getAdminPass();
      if (user === expectedUser && pass === expectedPass) {
        loginError.style.display = 'none';
        setLoggedIn();
        loginBox.hidden = true;
        adminPanel.hidden = false;
        renderServiceFields();
        loadContentIntoForm();
        loadCancelCutoff();
        renderAdminCalendar();
        renderRandevular();
      } else {
        loginError.style.display = 'block';
      }
    });
  }

  // Çıkış
  document.getElementById('admin-logout') && document.getElementById('admin-logout').addEventListener('click', logout);

  function loadCancelCutoff() {
    if (API_BASE) return;
    var v = localStorage.getItem(STORAGE_CANCEL_CUTOFF_HOURS);
    var el = document.getElementById('cancel-cutoff-hours');
    if (el) el.value = v === null || v === '' ? '0' : v;
  }

  var adminCalendarMonth = new Date();
  adminCalendarMonth.setDate(1);
  var adminSelectedDate = null;
  var monthNamesTr = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  var dayNamesTr = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function toDateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function getCountForDate(dateStr) {
    return getAppointments().filter(function (r) { return r.date === dateStr; }).length;
  }

  function renderAdminCalendar() {
    var wrap = document.getElementById('admin-calendar-wrap');
    var label = document.getElementById('admin-month-label');
    if (!wrap || !label) return;
    var y = adminCalendarMonth.getFullYear();
    var m = adminCalendarMonth.getMonth();
    label.textContent = monthNamesTr[m] + ' ' + y;
    var first = new Date(y, m, 1);
    var start = first.getDay();
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var cells = [];
    for (var i = 0; i < start; i++) cells.push({ empty: true });
    for (i = 1; i <= daysInMonth; i++) {
      var dateStr = y + '-' + pad(m + 1) + '-' + pad(i);
      var count = getCountForDate(dateStr);
      cells.push({ dateStr: dateStr, day: i, empty: false, count: count });
    }
    wrap.innerHTML = '';
    dayNamesTr.forEach(function (name) {
      var h = document.createElement('div');
      h.className = 'admin-calendar-day-header';
      h.textContent = name;
      wrap.appendChild(h);
    });
    cells.forEach(function (cell) {
      var div = document.createElement('button');
      div.type = 'button';
      div.className = 'admin-calendar-day';
      if (cell.empty) {
        div.classList.add('admin-calendar-day--empty');
      } else {
        div.dataset.date = cell.dateStr;
        div.appendChild(document.createTextNode(cell.day));
        if (cell.count > 0) {
          var badge = document.createElement('span');
          badge.className = 'admin-calendar-day--badge';
          badge.textContent = cell.count;
          div.appendChild(badge);
        }
      }
      wrap.appendChild(div);
    });
    wrap.querySelectorAll('.admin-calendar-day:not(.admin-calendar-day--empty)').forEach(function (btn) {
      btn.addEventListener('click', function () {
        adminSelectedDate = btn.dataset.date;
        renderRandevularForDate(adminSelectedDate);
        document.getElementById('admin-day-detail').style.display = 'block';
        document.getElementById('admin-day-detail').textContent = adminSelectedDate + ' tarihli randevular (' + getCountForDate(adminSelectedDate) + ')';
      });
    });
  }

  function renderRandevularForDate(dateStr) {
    var list = getAppointments().filter(function (r) { return r.date === dateStr; });
    randevuList.innerHTML = '';
    randevuEmpty.style.display = list.length ? 'none' : 'block';
    list.forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'randevu-item';
      li.innerHTML = '<div><span class="randevu-info">' + (r.name || '-') + ' · ' + (r.service || '-') + '</span><br><span class="randevu-meta">' + (r.date || '') + ' ' + (r.time || '') + ' · ' + (r.phone || r.email || '') + '</span></div><button type="button" class="btn btn-danger btn-cancel-randevu" data-id="' + (r.id || '') + '">İptal</button>';
      randevuList.appendChild(li);
    });
    randevuList.querySelectorAll('.btn-cancel-randevu').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        if (API_BASE && getAuthToken()) {
          fetch(API_BASE + '/api/admin/appointments/' + encodeURIComponent(id) + '/cancel', { method: 'PATCH', headers: apiHeaders() })
            .then(function (r) { return r.json(); })
            .then(function () { loadAppointmentsFromApi(); })
            .catch(function () { alert('İptal başarısız.'); });
          return;
        }
        var newList = getAppointments().filter(function (r) { return r.id !== id; });
        setAppointments(newList);
        renderAdminCalendar();
        if (adminSelectedDate) renderRandevularForDate(adminSelectedDate);
      });
    });
  }

  function renderRandevular() {
    randevuList.innerHTML = '';
    randevuEmpty.style.display = 'block';
    document.getElementById('admin-day-detail').style.display = 'none';
    if (adminSelectedDate) {
      renderRandevularForDate(adminSelectedDate);
      document.getElementById('admin-day-detail').style.display = 'block';
      document.getElementById('admin-day-detail').textContent = adminSelectedDate + ' tarihli randevular (' + getCountForDate(adminSelectedDate) + ')';
    } else {
      randevuEmpty.style.display = 'block';
      randevuEmpty.textContent = 'Takvimden bir gün seçin.';
    }
  }

  document.getElementById('admin-prev-month') && document.getElementById('admin-prev-month').addEventListener('click', function () {
    adminCalendarMonth.setMonth(adminCalendarMonth.getMonth() - 1);
    renderAdminCalendar();
  });
  document.getElementById('admin-next-month') && document.getElementById('admin-next-month').addEventListener('click', function () {
    adminCalendarMonth.setMonth(adminCalendarMonth.getMonth() + 1);
    renderAdminCalendar();
  });

  // İçerik formu
  function loadContentIntoForm() {
    if (API_BASE && getAuthToken()) {
      fetch(API_BASE + '/api/admin/content', { headers: apiHeaders() })
        .then(function (r) { return r.json(); })
        .then(function (c) { fillContentForm(c || {}); })
        .catch(function () { fillContentForm(getContent()); });
      return;
    }
    fillContentForm(getContent());
  }

  function fillContentForm(c) {
    document.getElementById('c-instagramUrl').value = c.instagramUrl || '';
    var wp = document.getElementById('c-whatsappUrl');
    if (wp) wp.value = c.whatsappUrl || '';
    var shop = document.getElementById('c-shopPhotoUrl');
    if (shop) shop.value = c.shopPhotoUrl || '';
    var mother = document.getElementById('c-motherPhotoUrl');
    if (mother) mother.value = c.motherPhotoUrl || '';
    var heroBg = document.getElementById('c-heroBgImage');
    if (heroBg) heroBg.value = c.heroBgImage || '';
    document.getElementById('c-heroTitle').value = (c.heroTitle || '').replace(/<br\s*\/?>/gi, '\n');
    document.getElementById('c-heroDesc').value = c.heroDesc || '';
    document.getElementById('c-aboutTitle').value = c.aboutTitle || '';
    document.getElementById('c-aboutText').value = c.aboutText || '';
    document.getElementById('c-contactAddress').value = (c.contactAddress || '').replace(/<br\s*\/?>/gi, '\n');
    document.getElementById('c-contactPhone').value = c.contactPhone || '';
    document.getElementById('c-contactHours').value = (c.contactHours || '').replace(/<br\s*\/?>/gi, '\n');
    document.getElementById('c-footerCopy').value = c.footerCopy || '';
    var cutoffEl = document.getElementById('cancel-cutoff-hours');
    if (cutoffEl) cutoffEl.value = c.cancel_cutoff_hours !== undefined ? c.cancel_cutoff_hours : (localStorage.getItem(STORAGE_CANCEL_CUTOFF_HOURS) || '0');
    for (var i = 1; i <= 8; i++) {
      var tit = document.getElementById('s-title-' + i);
      var desc = document.getElementById('s-desc-' + i);
      var img = document.getElementById('s-img-' + i);
      if (tit) tit.value = c['serviceTitle' + i] || '';
      if (desc) desc.value = c['serviceDesc' + i] || '';
      if (img) img.value = c['serviceImg' + i] || '';
    }
  }

  function renderServiceFields() {
    var wrap = document.getElementById('service-fields');
    if (!wrap) return;
    wrap.innerHTML = '';
    for (var i = 1; i <= 8; i++) {
      var div = document.createElement('div');
      div.className = 'form-group';
      div.style.marginBottom = '1.25rem';
      div.style.paddingBottom = '1rem';
      div.style.borderBottom = '1px solid var(--border)';
      div.innerHTML = '<label>Hizmet ' + i + ' – Başlık</label><input type="text" id="s-title-' + i + '" placeholder="Başlık">' +
        '<label style="margin-top:0.5rem">Açıklama</label><input type="text" id="s-desc-' + i + '" placeholder="Açıklama">' +
        '<label style="margin-top:0.5rem">Fotoğraf URL</label><input type="url" id="s-img-' + i + '" placeholder="https://...">';
      wrap.appendChild(div);
    }
  }

  if (contentForm) {
    contentForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var c = {
        instagramUrl: document.getElementById('c-instagramUrl').value.trim() || undefined,
        whatsappUrl: document.getElementById('c-whatsappUrl') && document.getElementById('c-whatsappUrl').value.trim() || undefined,
        shopPhotoUrl: document.getElementById('c-shopPhotoUrl') && document.getElementById('c-shopPhotoUrl').value.trim() || undefined,
        motherPhotoUrl: document.getElementById('c-motherPhotoUrl') && document.getElementById('c-motherPhotoUrl').value.trim() || undefined,
        heroBgImage: document.getElementById('c-heroBgImage') && document.getElementById('c-heroBgImage').value.trim() || undefined,
        heroTitle: document.getElementById('c-heroTitle').value.trim().replace(/\n/g, '<br>') || undefined,
        heroDesc: document.getElementById('c-heroDesc').value.trim() || undefined,
        aboutTitle: document.getElementById('c-aboutTitle').value.trim() || undefined,
        aboutText: document.getElementById('c-aboutText').value.trim() || undefined,
        contactAddress: document.getElementById('c-contactAddress').value.trim().replace(/\n/g, '<br>') || undefined,
        contactPhone: document.getElementById('c-contactPhone').value.trim() || undefined,
        contactHours: document.getElementById('c-contactHours').value.trim().replace(/\n/g, '<br>') || undefined,
        footerCopy: document.getElementById('c-footerCopy').value.trim() || undefined,
        cancel_cutoff_hours: parseInt(document.getElementById('cancel-cutoff-hours') && document.getElementById('cancel-cutoff-hours').value || 0, 10) || 0
      };
      for (var i = 1; i <= 8; i++) {
        var t = document.getElementById('s-title-' + i);
        var d = document.getElementById('s-desc-' + i);
        var img = document.getElementById('s-img-' + i);
        if (t && t.value.trim()) c['serviceTitle' + i] = t.value.trim();
        if (d && d.value.trim()) c['serviceDesc' + i] = d.value.trim();
        if (img && img.value.trim()) c['serviceImg' + i] = img.value.trim();
      }
      if (API_BASE && getAuthToken()) {
        fetch(API_BASE + '/api/admin/content', { method: 'PUT', headers: apiHeaders(), body: JSON.stringify(c) })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.success) alert('İçerik kaydedildi. Site herkeste güncellenir.');
            else alert('Kaydetme başarısız.');
          })
          .catch(function () { alert('Bağlantı hatası.'); });
        return;
      }
      setContent(c);
      alert('İçerik kaydedildi. Ana sayfayı yenileyerek görebilirsiniz.');
    });
  }

  var cancelCutoffForm = document.getElementById('cancel-cutoff-form');
  if (cancelCutoffForm) {
    cancelCutoffForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var el = document.getElementById('cancel-cutoff-hours');
      var v = parseInt(el && el.value ? el.value : 0, 10);
      if (isNaN(v) || v < 0) v = 0;
      if (v > 168) v = 168;
      if (API_BASE && getAuthToken()) {
        fetch(API_BASE + '/api/admin/content', { headers: apiHeaders() })
          .then(function (r) { return r.json(); })
          .then(function (content) {
            content = content || {};
            content.cancel_cutoff_hours = v;
            return fetch(API_BASE + '/api/admin/content', { method: 'PUT', headers: apiHeaders(), body: JSON.stringify(content) });
          })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.success) alert('İptal engeli kaydedildi: ' + (v === 0 ? 'Kapalı' : v + ' saat'));
          })
          .catch(function () { alert('Bağlantı hatası.'); });
        return;
      }
      localStorage.setItem(STORAGE_CANCEL_CUTOFF_HOURS, String(v));
      alert('İptal engeli kaydedildi: ' + (v === 0 ? 'Kapalı' : v + ' saat'));
    });
  }

  // Şifre değiştir
  if (passwordForm) {
    passwordForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var user = document.getElementById('new-user').value.trim();
      var pass = document.getElementById('new-pass').value;
      if (!user || !pass) {
        alert('Kullanıcı adı ve şifre girin.');
        return;
      }
      setAdminCredentials(user, pass);
      alert('Kullanıcı adı ve şifre güncellendi. Bir sonraki girişte yeni bilgileri kullanın.');
      document.getElementById('new-user').value = '';
      document.getElementById('new-pass').value = '';
    });
  }

  function loadQuestions() {
    if (!API_BASE || !getAuthToken()) return;
    var listEl = document.getElementById('questions-list');
    var emptyEl = document.getElementById('questions-empty');
    if (!listEl) return;
    fetch(API_BASE + '/api/admin/questions', { headers: apiHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        listEl.innerHTML = '';
        if (!rows || rows.length === 0) { emptyEl.style.display = 'block'; return; }
        emptyEl.style.display = 'none';
        rows.forEach(function (q) {
          var li = document.createElement('li');
          li.className = 'randevu-item';
          li.style.flexDirection = 'column';
          li.style.alignItems = 'flex-start';
          var replyVal = (q.admin_reply || '').trim();
          li.innerHTML = '<div class="randevu-info">' + (q.name || '') + ' &lt;' + (q.email || '') + '&gt; · ' + (q.category || '') + '</div><div class="randevu-meta">' + (q.created_at || '') + '</div><p style="margin:0.5rem 0;">' + (q.message || '-') + '</p>' +
            (replyVal ? '<p style="margin:0.5rem 0;color:var(--text-muted);">Cevap: ' + replyVal + '</p>' : '') +
            '<div style="margin-top:0.5rem;"><textarea class="question-reply" data-id="' + q.id + '" rows="2" placeholder="Cevap yazın" style="width:100%;padding:0.5rem;font-size:0.875rem;">' + (replyVal || '') + '</textarea><button type="button" class="btn btn-secondary btn-save-reply" data-id="' + q.id + '" style="margin-top:0.35rem;">Kaydet</button></div>';
          listEl.appendChild(li);
        });
        listEl.querySelectorAll('.btn-save-reply').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var id = btn.getAttribute('data-id');
            var ta = listEl.querySelector('.question-reply[data-id="' + id + '"]');
            var reply = ta && ta.value ? ta.value.trim() : '';
            fetch(API_BASE + '/api/admin/questions/' + encodeURIComponent(id), { method: 'PATCH', headers: apiHeaders(), body: JSON.stringify({ admin_reply: reply, read_at: true }) })
              .then(function () { loadQuestions(); });
          });
        });
      })
      .catch(function () {});
  }

  var notifPollTimer = null;
  var lastNotifCount = 0;
  function startNotificationPoll() {
    if (!API_BASE || !getAuthToken()) return;
    function poll() {
      fetch(API_BASE + '/api/admin/notifications', { headers: apiHeaders() })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var total = (data.unread_questions || 0) + (data.recent_appointments || 0);
          var badge = document.getElementById('admin-notif-badge');
          if (badge) {
            badge.textContent = total;
            badge.style.display = total > 0 ? 'flex' : 'none';
          }
          if (total > lastNotifCount && lastNotifCount > 0) {
            try { var a = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2'); a.volume = 0.3; a.play().catch(function(){}); } catch (e) {}
          }
          lastNotifCount = total;
          var tray = document.getElementById('admin-notif-tray');
          if (!tray) return;
          tray.hidden = total === 0;
          tray.innerHTML = '';
          (data.questions || []).slice(0, 5).forEach(function (q) {
            var w = document.createElement('div');
            w.className = 'admin-notif-window';
            w.innerHTML = '<h4>Yeni soru</h4><p><strong>' + (q.name || '') + '</strong> · ' + (q.category || '') + '</p>';
            tray.appendChild(w);
          });
          (data.appointments || []).slice(0, 5).forEach(function (a) {
            var w = document.createElement('div');
            w.className = 'admin-notif-window';
            w.innerHTML = '<h4>Yeni randevu</h4><p><strong>' + (a.name || '') + '</strong> ' + (a.date || '') + ' ' + (a.time || '') + '</p>';
            tray.appendChild(w);
          });
        })
        .catch(function () {});
    }
    poll();
    notifPollTimer = setInterval(poll, 30000);
  }
})();
