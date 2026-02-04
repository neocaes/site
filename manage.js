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
  var STORAGE_APPOINTMENTS = 'browdesing_randevular';
  var STORAGE_CANCEL_CUTOFF_HOURS = 'browdesing_cancel_cutoff_hours';
  var STORAGE_THEME = 'browdesing_theme';
  var theme = localStorage.getItem(STORAGE_THEME) || 'light';
  document.documentElement.setAttribute('data-theme', theme);

  function getToken() {
    var params = new URLSearchParams(window.location.search);
    var fromQuery = params.get('token');
    if (fromQuery) return fromQuery;
    var hash = (window.location.hash || '').replace('#', '');
    if (hash) {
      var parts = hash.split('&').filter(function (p) { return p.indexOf('token=') === 0; });
      if (parts.length) return decodeURIComponent(parts[0].replace('token=', ''));
    }
    return null;
  }

  function getAppointments() {
    try {
      var raw = localStorage.getItem(STORAGE_APPOINTMENTS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function setAppointments(list) {
    localStorage.setItem(STORAGE_APPOINTMENTS, JSON.stringify(list));
  }

  function getCancelCutoffHours() {
    var v = localStorage.getItem(STORAGE_CANCEL_CUTOFF_HOURS);
    return v === null || v === '' ? 0 : parseInt(v, 10);
  }

  function slots15Min(start, end) {
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var slots = [];
    var sh = parseInt(start.slice(0, 2), 10);
    var sm = parseInt(start.slice(3, 5), 10);
    var eh = parseInt(end.slice(0, 2), 10);
    var em = parseInt(end.slice(3, 5), 10);
    var t = sh * 60 + sm;
    var endT = eh * 60 + em;
    while (t < endT) {
      slots.push(pad(Math.floor(t / 60)) + ':' + pad(t % 60));
      t += 15;
    }
    return slots;
  }
  function getAvailableHoursForDay(dayOfWeek) {
    if (dayOfWeek === 0 || dayOfWeek === 1) return [];
    if (dayOfWeek === 6) return slots15Min('09:00', '17:00');
    return slots15Min('09:00', '18:00');
  }

  function getBookedSlotsForDate(dateStr, excludeId) {
    return getAppointments()
      .filter(function (r) { return r.date === dateStr && r.id !== excludeId; })
      .map(function (r) { return r.time; });
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function toDateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  var serviceLabelsDe = { 'kas-alma': 'Augenbrauen formen', 'kas-boyama': 'Augenbrauen färben', 'kirpik': 'Wimpern Lifting / Extensions', 'agda': 'Waxing', 'topuz': 'Dutt', 'makyaj': 'Make-up', 'turban': 'Kopftuch', 'gelin': 'Braut Frisur & Make-up', 'kombine': 'Kombi-Paket' };
  var serviceLabelsTr = { 'kas-alma': 'Kaş Alma & Şekillendirme', 'kas-boyama': 'Kaş Boyama', 'kirpik': 'Kirpik Lifting / Takma', 'agda': 'Ağda', 'topuz': 'Topuz', 'makyaj': 'Makyaj', 'turban': 'Türban', 'gelin': 'Gelin Saçı & Makyajı', 'kombine': 'Kombine Paket' };
  var dayNamesDe = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  var dayNamesTr = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
  var monthNamesDe = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  var monthNamesTr = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

  var texts = {
    tr: {
      back: 'Ana sayfaya dön',
      title: 'Randevunuz',
      notFound: 'Randevu bulunamadı veya link geçersiz.',
      date: 'Tarih & Saat',
      name: 'Ad Soyad',
      service: 'Hizmet',
      phone: 'Telefon',
      change: 'Randevuyu değiştir',
      cancel: 'Randevuyu iptal et',
      cancelBlocked: 'Randevuya 12 saatten az kaldığı için iptal edilemez.',
      confirmChange: 'Değişikliği onayla',
      cancelChange: 'Vazgeç',
      chooseDate: 'Yeni tarih seçin',
      chooseTime: 'Yeni saat seçin',
      cancelled: 'Randevunuz iptal edildi.',
      changed: 'Randevunuz değiştirildi.',
      home: 'Ana sayfaya git'
    },
    de: {
      back: 'Zur Startseite',
      title: 'Ihr Termin',
      notFound: 'Termin nicht gefunden oder Link ungültig.',
      date: 'Datum & Uhrzeit',
      name: 'Name',
      service: 'Leistung',
      phone: 'Telefon',
      change: 'Termin ändern',
      cancel: 'Termin stornieren',
      cancelBlocked: 'Stornierung nicht möglich – weniger als 12 Stunden bis zum Termin.',
      confirmChange: 'Änderung bestätigen',
      cancelChange: 'Abbrechen',
      chooseDate: 'Neues Datum wählen',
      chooseTime: 'Neue Uhrzeit wählen',
      cancelled: 'Ihr Termin wurde storniert.',
      changed: 'Ihr Termin wurde geändert.',
      home: 'Zur Startseite'
    }
  };

  var token = getToken();
  var appointment = null;
  var manageCalendarMonth = new Date();
  manageCalendarMonth.setDate(1);
  var changeSelectedDate = null;
  var changeSelectedTime = null;

  function runAppointmentUI() {
    var lang = appointment.lang === 'tr' ? 'tr' : 'de';
      document.documentElement.lang = lang;
      var t = texts[lang];
      var serviceLabels = lang === 'de' ? serviceLabelsDe : serviceLabelsTr;
      var dayNames = lang === 'de' ? dayNamesDe : dayNamesTr;
      var monthNames = lang === 'de' ? monthNamesDe : monthNamesTr;

      document.getElementById('back-link').textContent = '← ' + t.back;
      document.getElementById('manage-title').textContent = t.title;
      document.querySelectorAll('#label-date, #label-name, #label-service, #label-phone').forEach(function (el, i) {
        var keys = ['date','name','service','phone'];
        if (t[keys[i]]) el.textContent = t[keys[i]];
      });
      document.getElementById('appointment-datetime').textContent = appointment.date + ' ' + appointment.time;
      document.getElementById('appointment-name').textContent = appointment.name;
      document.getElementById('appointment-service').textContent = serviceLabels[appointment.service] || appointment.service;
      document.getElementById('appointment-phone').textContent = appointment.phone;
      document.getElementById('btn-change').textContent = t.change;
      document.getElementById('btn-change').setAttribute('data-default', t.change);
      document.getElementById('btn-cancel').textContent = t.cancel;
      document.getElementById('btn-cancel').setAttribute('data-default', t.cancel);
      document.getElementById('manage-error').hidden = true;
      document.getElementById('manage-view').hidden = false;

      var cutoffHours = getCancelCutoffHours();
      var appointmentDt = new Date(appointment.date + 'T' + appointment.time + ':00');
      var now = new Date();
      var hoursLeft = (appointmentDt - now) / (1000 * 60 * 60);
      var cancelBlocked = cutoffHours > 0 && hoursLeft < cutoffHours;
      if (cancelBlocked) {
        document.getElementById('manage-cancel-msg').textContent = t.cancelBlocked;
        document.getElementById('manage-cancel-msg').hidden = false;
        document.getElementById('btn-cancel').disabled = true;
      }

      document.getElementById('btn-cancel').addEventListener('click', function () {
        if (cancelBlocked) return;
        if (!confirm(lang === 'de' ? 'Termin wirklich stornieren?' : 'Randevuyu iptal etmek istediğinize emin misiniz?')) return;
        if (API_BASE) {
          fetch(API_BASE + '/api/appointments/manage', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token, action: 'cancel' }) })
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (data.success) {
                document.getElementById('manage-view').hidden = true;
                document.getElementById('manage-cancelled').hidden = false;
                document.getElementById('manage-cancelled-text').textContent = t.cancelled;
                document.querySelector('#manage-cancelled .btn').textContent = t.home;
              } else { alert(lang === 'de' ? 'Stornierung fehlgeschlagen.' : 'İptal işlemi başarısız.'); }
            })
            .catch(function () { alert(lang === 'de' ? 'Verbindungsfehler.' : 'Bağlantı hatası.'); });
          return;
        }
        var newList = getAppointments().filter(function (r) { return r.manage_token !== token; });
        setAppointments(newList);
        document.getElementById('manage-view').hidden = true;
        document.getElementById('manage-cancelled').hidden = false;
        document.getElementById('manage-cancelled-text').textContent = t.cancelled;
        document.querySelector('#manage-cancelled .btn').textContent = t.home;
      });

      document.getElementById('btn-change').addEventListener('click', function () {
        document.getElementById('manage-change-panel').hidden = false;
        document.getElementById('change-step-label').textContent = t.chooseDate;
        changeSelectedDate = null;
        changeSelectedTime = null;
        renderManageCalendar();
      });

      document.getElementById('btn-cancel-change').addEventListener('click', function () {
        document.getElementById('manage-change-panel').hidden = true;
        document.getElementById('manage-time-slots').hidden = true;
        document.getElementById('manage-change-actions').hidden = true;
      });

      document.getElementById('manage-prev-month').addEventListener('click', function () {
        manageCalendarMonth.setMonth(manageCalendarMonth.getMonth() - 1);
        renderManageCalendar();
      });
      document.getElementById('manage-next-month').addEventListener('click', function () {
        manageCalendarMonth.setMonth(manageCalendarMonth.getMonth() + 1);
        renderManageCalendar();
      });

      document.getElementById('btn-confirm-change').textContent = t.confirmChange;
      document.getElementById('btn-cancel-change').textContent = t.cancelChange;
      document.getElementById('btn-confirm-change').addEventListener('click', function () {
        if (!changeSelectedDate || !changeSelectedTime) return;
        if (API_BASE) {
          fetch(API_BASE + '/api/appointments/manage', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token, action: 'reschedule', date: changeSelectedDate, time: changeSelectedTime }) })
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (data.success) {
                appointment.date = changeSelectedDate;
                appointment.time = changeSelectedTime;
                document.getElementById('manage-view').hidden = true;
                document.getElementById('manage-changed').hidden = false;
                var changedP = document.querySelector('#manage-changed p');
                if (changedP) changedP.textContent = t.changed;
                document.querySelector('#manage-changed .btn').textContent = t.home;
              } else { alert(lang === 'de' ? 'Änderung fehlgeschlagen.' : 'Değişiklik başarısız.'); }
            })
            .catch(function () { alert(lang === 'de' ? 'Verbindungsfehler.' : 'Bağlantı hatası.'); });
          return;
        }
        var list = getAppointments();
        var idx = list.findIndex(function (r) { return r.manage_token === token; });
        if (idx === -1) return;
        list[idx].date = changeSelectedDate;
        list[idx].time = changeSelectedTime;
        setAppointments(list);
        document.getElementById('manage-view').hidden = true;
        document.getElementById('manage-changed').hidden = false;
        var changedP = document.querySelector('#manage-changed p');
        if (changedP) changedP.textContent = t.changed;
        document.querySelector('#manage-changed .btn').textContent = t.home;
      });

      function renderManageCalendar() {
        var wrap = document.getElementById('manage-calendar-wrap');
        var label = document.getElementById('manage-month-label');
        if (!wrap || !label) return;
        var y = manageCalendarMonth.getFullYear();
        var m = manageCalendarMonth.getMonth();
        label.textContent = monthNames[m] + ' ' + y;
        var first = new Date(y, m, 1);
        var start = first.getDay();
        var daysInMonth = new Date(y, m + 1, 0).getDate();
        var today = toDateStr(new Date());
        var cells = [];
        var i;
        for (i = 0; i < start; i++) cells.push({ empty: true });
        for (i = 1; i <= daysInMonth; i++) {
          var dateStr = y + '-' + pad(m + 1) + '-' + pad(i);
          var d = new Date(y, m, i);
          var dayOfWeek = d.getDay();
          var hours = getAvailableHoursForDay(dayOfWeek);
          var isPast = dateStr < today;
          var booked = getBookedSlotsForDate(dateStr, appointment.id);
          var full = hours.length > 0 && hours.every(function (h) { return booked.indexOf(h) !== -1; });
          var disabled = isPast || full;
          cells.push({ dateStr: dateStr, day: i, empty: false, disabled: disabled });
        }
        wrap.innerHTML = '';
        dayNames.forEach(function (name) {
          var h = document.createElement('div');
          h.className = 'calendar-day-header';
          h.textContent = name;
          wrap.appendChild(h);
        });
        cells.forEach(function (cell) {
          var div = document.createElement('button');
          div.type = 'button';
          div.className = 'calendar-day';
          if (cell.empty) {
            div.classList.add('calendar-day--empty');
            div.textContent = '';
          } else {
            div.textContent = cell.day;
            div.dataset.date = cell.dateStr;
            if (cell.disabled) div.classList.add('calendar-day--disabled');
            if (cell.dateStr < today) div.classList.add('calendar-day--past');
            if (changeSelectedDate === cell.dateStr) div.classList.add('calendar-day--selected');
          }
          wrap.appendChild(div);
        });
        wrap.querySelectorAll('.calendar-day:not(.calendar-day--empty):not(.calendar-day--disabled)').forEach(function (btn) {
          btn.addEventListener('click', function () {
            changeSelectedDate = btn.dataset.date;
            changeSelectedTime = null;
            document.getElementById('change-step-label').textContent = t.chooseTime + ' — ' + changeSelectedDate;
            var container = document.getElementById('manage-time-slots');
            container.hidden = false;
            container.innerHTML = lang === 'de' ? 'Lade…' : 'Yükleniyor…';
            var d = new Date(changeSelectedDate + 'T12:00:00');
            var hours = getAvailableHoursForDay(d.getDay());
            var today = toDateStr(new Date());
            function renderSlots(booked) {
              if (appointment.date === changeSelectedDate && appointment.time) {
                booked = booked.filter(function (t) { return t !== appointment.time; });
              }
              container.innerHTML = '';
            var now = new Date();
            var nowMinutes = now.getHours() * 60 + now.getMinutes();
            hours.forEach(function (h) {
              var slotBtn = document.createElement('button');
              slotBtn.type = 'button';
              slotBtn.className = 'time-slot';
              slotBtn.textContent = h;
              slotBtn.dataset.time = h;
              var slotParts = h.split(':');
              var slotMinutes = parseInt(slotParts[0], 10) * 60 + parseInt(slotParts[1], 10);
              var isPast = changeSelectedDate === today && slotMinutes <= nowMinutes;
              if (isPast) {
                slotBtn.classList.add('time-slot--disabled', 'time-slot--past');
                slotBtn.disabled = true;
              } else if (booked.indexOf(h) !== -1) {
                slotBtn.classList.add('time-slot--disabled');
                slotBtn.disabled = true;
              }
              if (changeSelectedTime === h) slotBtn.classList.add('time-slot--selected');
              slotBtn.addEventListener('click', function () {
                if (booked.indexOf(h) !== -1 || isPast) return;
                changeSelectedTime = h;
                container.querySelectorAll('.time-slot').forEach(function (b) { b.classList.remove('time-slot--selected'); });
                slotBtn.classList.add('time-slot--selected');
                document.getElementById('manage-change-actions').hidden = false;
              });
              container.appendChild(slotBtn);
            });
            document.getElementById('manage-change-actions').hidden = !changeSelectedTime;
            renderManageCalendar();
            }
            if (API_BASE) {
              fetch(API_BASE + '/availability?date=' + encodeURIComponent(changeSelectedDate))
                .then(function (r) { return r.json(); })
                .then(function (data) { renderSlots(data.booked || []); })
                .catch(function () { renderSlots([]); });
            } else {
              renderSlots(getBookedSlotsForDate(changeSelectedDate, appointment.id));
            }
          });
        });
      }

  if (!token) {
    document.getElementById('manage-error').hidden = false;
    document.getElementById('manage-error-text').textContent = texts.de.notFound;
  } else if (API_BASE) {
    fetch(API_BASE + '/api/appointments/manage?token=' + encodeURIComponent(token))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error || !data.id) {
          document.getElementById('manage-error').hidden = false;
          document.getElementById('manage-error-text').textContent = texts.de.notFound;
          return;
        }
        appointment = data;
        runAppointmentUI();
      })
      .catch(function () {
        document.getElementById('manage-error').hidden = false;
        document.getElementById('manage-error-text').textContent = texts.de.notFound;
      });
  } else {
    var list = getAppointments();
    appointment = list.filter(function (r) { return r.manage_token === token; })[0];
    if (!appointment) {
      document.getElementById('manage-error').hidden = false;
      document.getElementById('manage-error-text').textContent = texts.de.notFound;
    } else {
      runAppointmentUI();
    }
  }
})();
