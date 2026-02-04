(function () {
  'use strict';

  var apiMeta = document.querySelector('meta[name="api-base"]');
  var API_BASE = (apiMeta && apiMeta.getAttribute('content')) ? apiMeta.getAttribute('content').trim() : ((typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE : '');
  var isLocal = typeof window !== 'undefined' && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (!isLocal && (!API_BASE || API_BASE.indexOf('localhost') !== -1)) {
    API_BASE = 'https://site-bztf.onrender.com';
  }
  if (isLocal && !API_BASE) {
    API_BASE = window.location.origin.replace(/:\d+$/, ':3000') || 'http://localhost:3000';
  }
  var STORAGE_APPOINTMENTS = 'browdesing_randevular';
  var STORAGE_CONTENT = 'browdesing_content';
  var STORAGE_THEME = 'browdesing_theme';
  var STORAGE_LANG = 'browdesing_lang';
  var ADMIN_SECRET_HASH = 'bs2025';
  var LOGO_SECRET_CLICKS = 5;
  var logoClickCount = 0;
  var logoClickTimer = null;
  var calendarMonth = new Date();
  calendarMonth.setDate(1);

  // 15 dakikalık slotlar: start/end "HH:mm"
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
  // Çalışma saatleri: Salı=2, Cuma=5, Cumartesi=6. Pazar/Pazartesi kapalı. Slotlar 15 dk.
  function getAvailableHoursForDay(dayOfWeek) {
    if (dayOfWeek === 0 || dayOfWeek === 1) return [];
    if (dayOfWeek === 6) return slots15Min('09:00', '17:00');
    return slots15Min('09:00', '18:00');
  }

  function getAppointments() {
    try {
      var raw = localStorage.getItem(STORAGE_APPOINTMENTS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function generateManageToken() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    var hex = '0123456789abcdef';
    var s = '';
    for (var i = 0; i < 32; i++) s += hex[Math.floor(Math.random() * 16)];
    return s + '-' + (Date.now().toString(36)) + '-' + (Math.random().toString(36).slice(2, 10));
  }

  function saveAppointment(data) {
    var list = getAppointments();
    data.id = 'r' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    data.manage_token = generateManageToken();
    data.lang = getLang();
    list.push(data);
    localStorage.setItem(STORAGE_APPOINTMENTS, JSON.stringify(list));
    return data;
  }

  function getBookedSlotsForDate(dateStr) {
    return getAppointments()
      .filter(function (r) { return r.date === dateStr; })
      .map(function (r) { return r.time; });
  }

  function getAvailability(dateStr) {
    if (API_BASE) {
      return fetch(API_BASE + '/availability?date=' + encodeURIComponent(dateStr))
        .then(function (r) { return r.json(); })
        .then(function (d) { return d.booked || []; })
        .catch(function () { return []; });
    }
    return Promise.resolve(getBookedSlotsForDate(dateStr));
  }

  function isDayFullyBooked(dateStr) {
    var d = new Date(dateStr + 'T12:00:00');
    var day = d.getDay();
    var hours = getAvailableHoursForDay(day);
    if (hours.length === 0) return true;
    var booked = getBookedSlotsForDate(dateStr);
    return hours.every(function (h) { return booked.indexOf(h) !== -1; });
  }

  function getContent() {
    try {
      var raw = localStorage.getItem(STORAGE_CONTENT);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function applyContentWith(c) {
    if (!c) c = getContent();
    if (c.instagramUrl) {
      var links = document.querySelectorAll('#instagram-link, #instagram-link-menu, #instagram-link-contact');
      links.forEach(function (a) { a.href = c.instagramUrl; });
    }
    var wpWrap = document.getElementById('contact-whatsapp-wrap');
    if (wpWrap) wpWrap.style.display = '';
    if (c.shopPhotoUrl) {
      var shopImg = document.getElementById('about-shop-photo');
      if (shopImg) { shopImg.src = c.shopPhotoUrl; shopImg.style.display = ''; }
    }
    if (c.motherPhotoUrl) {
      var motherImg = document.getElementById('about-mother-photo');
      if (motherImg) { motherImg.src = c.motherPhotoUrl; motherImg.style.display = ''; }
    }
    if (c.contactAddress) {
      var el = document.getElementById('contact-address');
      if (el) el.innerHTML = c.contactAddress.replace(/\n/g, '<br>');
    }
    if (c.contactPhone) {
      var link = document.getElementById('contact-phone-link');
      if (link) { link.href = 'tel:' + c.contactPhone.replace(/\s/g, ''); link.textContent = c.contactPhone; }
    }
    if (c.contactHours) {
      var el = document.getElementById('contact-hours');
      if (el) el.innerHTML = c.contactHours.replace(/\n/g, '<br>');
    }
    if (c.heroTitle) {
      var el = document.getElementById('hero-title');
      if (el) el.innerHTML = c.heroTitle.replace(/\n/g, '<br>');
    }
    if (c.heroDesc) {
      var el = document.getElementById('hero-desc');
      if (el) el.textContent = c.heroDesc;
    }
    if (c.heroBgImage) {
      var bg = document.getElementById('hero-bg');
      if (bg) {
        bg.style.backgroundImage = 'url(' + c.heroBgImage + ')';
        bg.classList.add('hero-bg--image');
      }
    } else {
      var bg = document.getElementById('hero-bg');
      if (bg) {
        // Varsayılan: kaş alma / güzellik temalı arka plan (admin panelden heroBgImage ile değiştirilebilir)
        bg.style.backgroundImage = 'url(https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=80)';
        bg.classList.add('hero-bg--image');
      }
    }
    if (c.aboutTitle) {
      var el = document.getElementById('about-title');
      if (el) el.textContent = c.aboutTitle;
    }
    if (c.aboutText) {
      var el = document.getElementById('about-text');
      if (el) el.textContent = c.aboutText;
    }
    for (var i = 1; i <= 8; i++) {
      if (c['serviceImg' + i]) {
        var img = document.getElementById('service-img-' + i);
        if (img) img.src = c['serviceImg' + i];
      }
      if (c['serviceTitle' + i]) {
        var t = document.getElementById('service-title-' + i);
        if (t) t.textContent = c['serviceTitle' + i];
      }
      if (c['serviceDesc' + i]) {
        var d = document.getElementById('service-desc-' + i);
        if (d) d.textContent = c['serviceDesc' + i];
      }
    }
    if (c.footerCopy) {
      var el = document.getElementById('footer-copy');
      if (el) el.textContent = c.footerCopy;
    }
  }

  function loadContent() {
    if (API_BASE) {
      fetch(API_BASE + '/content')
        .then(function (r) { return r.json(); })
        .then(function (c) { applyContentWith(c); if (typeof applyTranslations === 'function') applyTranslations(getLang()); })
        .catch(function () { applyContentWith(getContent()); if (typeof applyTranslations === 'function') applyTranslations(getLang()); });
    } else {
      applyContentWith(getContent());
    }
  }
  loadContent();

  // Tema
  var html = document.documentElement;
  var savedTheme = localStorage.getItem(STORAGE_THEME) || 'light';
  html.setAttribute('data-theme', savedTheme);
  var btnTheme = document.getElementById('btn-theme');
  if (btnTheme) {
    btnTheme.addEventListener('click', function () {
      var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_THEME, next);
    });
  }

  // Dil
  var tr = {
    nav: { home: 'Anasayfa', services: 'Hizmetler', about: 'Hakkımızda', contact: 'İletişim', appointment: 'Randevu Al' },
    hero: { subtitle: 'Profesyonel Güzellik & Bakım', title: 'Kaşınız, bakışınızı <br>tanımlasın', desc: 'Kaş alma, boyama, kirpik lifting ve ağda hizmetleriyle doğal güzelliğinizi öne çıkarıyoruz.', cta: 'Randevu Al', scroll: 'Aşağı kaydır' },
    services: {
      label: 'Hizmetlerimiz', title: 'Sizin için neler yapıyoruz?',
      s1Title: 'Kaş Alma & Şekillendirme', s1Desc: 'Profesyonel kaş alma ve şekillendirme ile yüzünüze en uygun kaş formunu oluşturuyoruz.',
      s2Title: 'Kaş Boyama', s2Desc: 'Kalıcı veya yarı kalıcı kaş boyama ile doğal ve dolgun bir görünüm sağlıyoruz.',
      s3Title: 'Kirpik Lifting & Takma', s3Desc: 'Kirpik lifting veya takma kirpik ile bakışlarınızı güçlendiriyoruz.',
      s4Title: 'Ağda', s4Desc: 'Yüz ve vücut ağda hizmetleriyle pürüzsüz ve uzun süreli sonuçlar sunuyoruz.',
      s5Title: 'Topuz', s5Desc: 'Özel günleriniz için şık topuz ve saç stilleri.',
      s6Title: 'Makyaj', s6Desc: 'Günlük ve özel gün makyajı ile yüzünüzü öne çıkarıyoruz.',
      s7Title: 'Türban', s7Desc: 'Türban bağlama ve stil danışmanlığı.',
      s8Title: 'Gelin Saçı & Makyajı', s8Desc: 'Düğün gününüz için gelin saçı ve makyajı paketleri.'
    },
    about: { label: 'Hakkımızda', f1: 'Hijyenik ve steril ortam', f2: 'Kaliteli ürünler', f3: 'Deneyimli kadro', f4: 'Randevu ile hizmet', stat1: 'Yıllık Deneyim', stat2: 'Mutlu Müşteri' },
    contact: { label: 'İletişim', title: 'Bize Ulaşın', addressLabel: 'Adres', phoneLabel: 'Telefon', hoursLabel: 'Çalışma Saatleri', instagram: 'Bizi takip edin', whatsapp: 'WhatsApp ile yazın', ctaText: 'Randevu almak için takvimi kullanın veya bizi arayın.', ctaBtn: 'Randevu Al' },
    appointment: { title: 'Randevu Al', chooseDate: 'Tarih seçin', chooseTime: 'Saat seçin', back: 'Geri', details: 'Kişi ve işlem bilgileri', name: 'Ad Soyad *', email: 'E-posta *', phone: 'Telefon (isteğe bağlı)', service: 'Hizmet *', note: 'Not (isteğe bağlı)', submit: 'Randevu Talebi Gönder', success: 'Randevu talebiniz alındı. En kısa sürede sizinle iletişime geçeceğiz.', thanks: 'Bizi tercih ettiğiniz için teşekkür ederiz.', manageLabel: 'Randevunuzu iptal veya değiştirmek için bu linki kullanın (e-posta ile de gönderilecektir):', copyLink: 'Linki kopyala', dailyLimit: 'Bir gün içinde en fazla 3 randevu alabilirsiniz.', selectPlaceholder: 'Seçiniz', kasAlma: 'Kaş Alma & Şekillendirme', kasBoyama: 'Kaş Boyama', kirpik: 'Kirpik Lifting / Takma', agda: 'Ağda', topuz: 'Topuz', makyaj: 'Makyaj', turban: 'Türban', gelin: 'Gelin Saçı & Makyajı', kombine: 'Kombine Paket' },
    whatsappMessage: 'Merhabalar bir sorum olacaktı'
  };
  var de = {
    nav: { home: 'Startseite', services: 'Leistungen', about: 'Über uns', contact: 'Kontakt', appointment: 'Termin buchen' },
    hero: { subtitle: 'Professionelle Schönheit & Pflege', title: 'Ihre Augenbrauen<br>definieren Ihren Blick', desc: 'Mit Augenbrauenformung, Färbung, Wimpern-Lifting und Waxing heben wir Ihre natürliche Schönheit hervor.', cta: 'Termin buchen', scroll: 'Nach unten scrollen' },
    services: {
      label: 'Unsere Leistungen', title: 'Was bieten wir Ihnen?',
      s1Title: 'Augenbrauen formen & gestalten', s1Desc: 'Professionelle Augenbrauenformung für die perfekte Form zu Ihrem Gesicht.',
      s2Title: 'Augenbrauen färben', s2Desc: 'Natürlicher, voller Look durch dauerhafte oder semi-permanente Färbung.',
      s3Title: 'Wimpern Lifting & Extensions', s3Desc: 'Wir betonen Ihren Blick mit Wimpern-Lifting oder künstlichen Wimpern.',
      s4Title: 'Waxing', s4Desc: 'Gesichts- und Körper-Waxing für glatte, langanhaltende Ergebnisse.',
      s5Title: 'Dutt', s5Desc: 'Elegante Dutt- und Haarstyling für besondere Anlässe.',
      s6Title: 'Make-up', s6Desc: 'Tägliches und festliches Make-up, das Sie in den Mittelpunkt stellt.',
      s7Title: 'Kopftuch', s7Desc: 'Kopftuch binden und Stilberatung.',
      s8Title: 'Braut Frisur & Make-up', s8Desc: 'Brautpakete für Frisur und Make-up am großen Tag.'
    },
    about: { label: 'Über uns', f1: 'Hygienische Umgebung', f2: 'Qualitätsprodukte', f3: 'Erfahrenes Team', f4: 'Termin nach Vereinbarung', stat1: 'Jahre Erfahrung', stat2: 'Zufriedene Kunden' },
    contact: { label: 'Kontakt', title: 'Kontaktieren Sie uns', addressLabel: 'Adresse', phoneLabel: 'Telefon', hoursLabel: 'Öffnungszeiten', instagram: 'Folgen Sie uns', whatsapp: 'Per WhatsApp schreiben', ctaText: 'Nutzen Sie den Kalender für einen Termin oder rufen Sie uns an.', ctaBtn: 'Termin buchen' },
    appointment: { title: 'Termin buchen', chooseDate: 'Datum wählen', chooseTime: 'Uhrzeit wählen', back: 'Zurück', details: 'Persönliche Daten & Leistung', name: 'Name *', email: 'E-Mail *', phone: 'Telefon (optional)', service: 'Leistung *', note: 'Anmerkung (optional)', submit: 'Terminanfrage senden', success: 'Ihre Anfrage wurde gesendet. Wir melden uns in Kürze.', thanks: 'Vielen Dank, dass Sie uns gewählt haben.', manageLabel: 'Nutzen Sie diesen Link, um Ihren Termin zu stornieren oder zu ändern (wird auch per E-Mail gesendet):', copyLink: 'Link kopieren', dailyLimit: 'Sie können maximal 3 Termine pro Tag buchen.', selectPlaceholder: 'Bitte wählen', kasAlma: 'Augenbrauen formen', kasBoyama: 'Augenbrauen färben', kirpik: 'Wimpern Lifting / Extensions', agda: 'Waxing', topuz: 'Dutt', makyaj: 'Make-up', turban: 'Kopftuch', gelin: 'Braut Frisur & Make-up', kombine: 'Kombi-Paket' },
    whatsappMessage: 'Hallo, ich hätte eine Frage'
  };

  var dayNamesTr = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
  var dayNamesDe = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  var monthNamesTr = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  var monthNamesDe = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

  function getLang() { return localStorage.getItem(STORAGE_LANG) || 'de'; }
  function setLang(lang) {
    localStorage.setItem(STORAGE_LANG, lang);
    html.setAttribute('data-lang', lang);
    applyTranslations(lang);
  }

  var SERVICE_KEYS = ['kas-alma', 'kas-boyama', 'kirpik', 'agda', 'topuz', 'makyaj', 'turban', 'gelin', 'kombine'];
  var SERVICE_I18N = { 'kas-alma': 'kasAlma', 'kas-boyama': 'kasBoyama', 'kirpik': 'kirpik', 'agda': 'agda', 'topuz': 'topuz', 'makyaj': 'makyaj', 'turban': 'turban', 'gelin': 'gelin', 'kombine': 'kombine' };

  function applyTranslations(lang) {
    var L = lang === 'de' ? de : tr;
    var dayNames = lang === 'de' ? dayNamesDe : dayNamesTr;
    var monthNames = lang === 'de' ? monthNamesDe : monthNamesTr;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var parts = key.split('.');
      var val = L[parts[0]] && L[parts[0]][parts[1]];
      if (val) el.textContent = val;
    });
    var servicesLabel = document.getElementById('services-label');
    var servicesTitle = document.getElementById('services-title');
    if (servicesLabel && L.services && L.services.label) servicesLabel.textContent = L.services.label;
    if (servicesTitle && L.services && L.services.title) servicesTitle.textContent = L.services.title;
    for (var i = 1; i <= 8; i++) {
      var st = document.getElementById('service-title-' + i);
      var sd = document.getElementById('service-desc-' + i);
      if (st && L.services && L.services['s' + i + 'Title']) st.textContent = L.services['s' + i + 'Title'];
      if (sd && L.services && L.services['s' + i + 'Desc']) sd.textContent = L.services['s' + i + 'Desc'];
    }
    var heroTitle = document.getElementById('hero-title');
    var heroDesc = document.getElementById('hero-desc');
    if (heroTitle && L.hero && L.hero.title) heroTitle.innerHTML = L.hero.title;
    if (heroDesc && L.hero && L.hero.desc) heroDesc.textContent = L.hero.desc;
    var selectHizmet = document.getElementById('hizmet');
    if (selectHizmet && L.appointment) {
      var opts = selectHizmet.querySelectorAll('option');
      if (opts.length) opts[0].textContent = L.appointment.selectPlaceholder || opts[0].textContent;
      SERVICE_KEYS.forEach(function (key, i) {
        var k = SERVICE_I18N[key];
        if (k && L.appointment[k] && opts[i + 1]) opts[i + 1].textContent = L.appointment[k];
      });
    }
    updateWhatsAppLink(lang);
    var wpContact = document.getElementById('whatsapp-link-contact');
    if (wpContact && L.contact && L.contact.whatsapp) wpContact.textContent = L.contact.whatsapp;
    window.__dayNames = dayNames;
    window.__monthNames = monthNames;
    window.__L = L;
    if (typeof renderCalendar === 'function' && document.getElementById('calendar-wrap')) renderCalendar();
  }

  var WHATSAPP_NUMBER = '491638891670';
  function getWhatsAppMessage(lang) {
    lang = lang || getLang();
    return (lang === 'de' ? de : tr).whatsappMessage || 'Merhabalar bir sorum olacaktı';
  }
  function updateWhatsAppLink(lang) {
    var msg = getWhatsAppMessage(lang);
    var href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg);
    document.querySelectorAll('.whatsapp-link, #whatsapp-link, #whatsapp-link-contact').forEach(function (a) {
      a.href = href;
      a.style.display = '';
    });
    var wrap = document.getElementById('contact-whatsapp-wrap');
    if (wrap) wrap.style.display = '';
  }

  html.setAttribute('data-lang', getLang());
  applyTranslations(getLang());

  var btnLang = document.getElementById('btn-lang');
  if (btnLang) {
    btnLang.addEventListener('click', function () {
      var next = getLang() === 'de' ? 'tr' : 'de';
      setLang(next);
    });
  }

  // Instagram varsayılan (admin değiştirebilir)
  var content = getContent();
  if (!content.instagramUrl) {
    var def = 'https://www.instagram.com/';
    document.querySelectorAll('#instagram-link, #instagram-link-menu, #instagram-link-contact').forEach(function (a) { a.href = def; });
  }

  // Gizli admin linki: logoya 5 kez tıklayınca admin sayfasına git
  var logoSecret = document.getElementById('logo-secret');
  if (logoSecret) {
    logoSecret.addEventListener('click', function (e) {
      e.preventDefault();
      logoClickCount++;
      if (logoClickCount >= LOGO_SECRET_CLICKS) {
        window.location.href = 'admin.html#' + ADMIN_SECRET_HASH;
      }
      clearTimeout(logoClickTimer);
      logoClickTimer = setTimeout(function () { logoClickCount = 0; }, 1500);
    });
  }

  // --- Randevu modal & takvim ---
  var modal = document.getElementById('randevu-modal');
  var form = document.getElementById('randevu-form');
  var successEl = document.getElementById('randevu-success');
  var step1 = document.getElementById('randevu-step-1');
  var step2 = document.getElementById('randevu-step-2');
  var step3 = document.getElementById('randevu-step-3');
  var openButtons = document.querySelectorAll('.btn-randevu');
  var closeBtn = modal && modal.querySelector('.modal-close');
  var backdrop = modal && modal.querySelector('.modal-backdrop');
  var navToggle = document.querySelector('.nav-toggle');
  var navMenu = document.querySelector('.nav-menu');

  var selectedDate = null;
  var selectedTime = null;

  function openModal() {
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    successEl && (successEl.hidden = true);
    step1 && (step1.hidden = false);
    step2 && (step2.hidden = true);
    step3 && (step3.hidden = true);
    form && (form.hidden = false);
    selectedDate = null;
    selectedTime = null;
    renderCalendar();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  openButtons && openButtons.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openModal();
      navMenu && navMenu.classList.remove('is-open');
    });
  });
  closeBtn && closeBtn.addEventListener('click', closeModal);
  backdrop && backdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) closeModal();
  });

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function toDateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function renderCalendar() {
    var wrap = document.getElementById('calendar-wrap');
    var label = document.getElementById('calendar-month-label');
    if (!wrap || !label) return;
    if (!calendarMonth || !(calendarMonth instanceof Date)) {
      calendarMonth = new Date();
      calendarMonth.setDate(1);
    }
    var dayNames = window.__dayNames || dayNamesTr;
    var monthNames = window.__monthNames || monthNamesTr;
    var y = calendarMonth.getFullYear();
    var m = calendarMonth.getMonth();
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
      var full = hours.length > 0 && !API_BASE && isDayFullyBooked(dateStr);
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
        if (selectedDate === cell.dateStr) div.classList.add('calendar-day--selected');
      }
      wrap.appendChild(div);
    });
    wrap.querySelectorAll('.calendar-day:not(.calendar-day--empty):not(.calendar-day--disabled)').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedDate = btn.dataset.date;
        step1.hidden = true;
        step2.hidden = false;
        var d = new Date(selectedDate + 'T12:00:00');
        document.getElementById('selected-date-display').textContent = (dayNames[d.getDay()] + ', ' + d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear());
        if (API_BASE) {
          getAvailability(selectedDate).then(function (booked) { renderTimeSlots(booked); });
        } else {
          renderTimeSlots(getBookedSlotsForDate(selectedDate));
        }
      });
    });
  }

  function renderTimeSlots(bookedSlots) {
    var container = document.getElementById('time-slots');
    if (!container || !selectedDate) return;
    var d = new Date(selectedDate + 'T12:00:00');
    var hours = getAvailableHoursForDay(d.getDay());
    var booked = Array.isArray(bookedSlots) ? bookedSlots : getBookedSlotsForDate(selectedDate);
    var today = toDateStr(new Date());
    var now = new Date();
    var nowMinutes = now.getHours() * 60 + now.getMinutes();
    container.innerHTML = '';
    hours.forEach(function (h) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'time-slot';
      btn.textContent = h;
      btn.dataset.time = h;
      var slotParts = h.split(':');
      var slotMinutes = parseInt(slotParts[0], 10) * 60 + parseInt(slotParts[1], 10);
      var isPast = selectedDate === today && slotMinutes < nowMinutes;
      if (isPast) {
        btn.classList.add('time-slot--disabled', 'time-slot--past');
        btn.disabled = true;
      } else if (booked.indexOf(h) !== -1) {
        btn.classList.add('time-slot--disabled');
        btn.disabled = true;
      }
      if (selectedTime === h) btn.classList.add('time-slot--selected');
      btn.addEventListener('click', function () {
        if (booked.indexOf(h) !== -1) return;
        selectedTime = h;
        container.querySelectorAll('.time-slot').forEach(function (b) { b.classList.remove('time-slot--selected'); });
        btn.classList.add('time-slot--selected');
        document.getElementById('randevu-date').value = selectedDate;
        document.getElementById('randevu-time').value = selectedTime;
        var dayNames = window.__dayNames || dayNamesTr;
        var d = new Date(selectedDate + 'T12:00:00');
        document.getElementById('selected-slot-display').textContent = dayNames[d.getDay()] + ' ' + selectedDate + ' ' + selectedTime;
        step2.hidden = true;
        step3.hidden = false;
      });
      container.appendChild(btn);
    });
  }

  document.getElementById('prev-month') && document.getElementById('prev-month').addEventListener('click', function () {
    calendarMonth.setMonth(calendarMonth.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('next-month') && document.getElementById('next-month').addEventListener('click', function () {
    calendarMonth.setMonth(calendarMonth.getMonth() + 1);
    renderCalendar();
  });

  document.getElementById('randevu-back-date') && document.getElementById('randevu-back-date').addEventListener('click', function () {
    step2.hidden = true;
    step1.hidden = false;
    selectedDate = null;
    selectedTime = null;
    renderCalendar();
  });

  document.getElementById('randevu-back-time') && document.getElementById('randevu-back-time').addEventListener('click', function () {
    step3.hidden = true;
    step2.hidden = false;
    selectedTime = null;
    renderTimeSlots();
  });

  form && form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;
    var ad = document.getElementById('ad').value.trim();
    var email = document.getElementById('email').value.trim().toLowerCase();
    var telefon = document.getElementById('telefon').value.trim();
    var hizmet = document.getElementById('hizmet').value;
    var mesaj = document.getElementById('mesaj').value.trim();
    if (!ad || !email || !hizmet) {
      alert((window.__L && window.__L.appointment) ? 'Lütfen zorunlu alanları (ad, e-posta, hizmet) doldurun.' : 'Bitte füllen Sie die Pflichtfelder (Name, E-Mail, Leistung) aus.');
      return;
    }
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      alert(getLang() === 'de' ? 'Bitte gültige E-Mail-Adresse eingeben.' : 'Geçerli bir e-posta adresi girin.');
      return;
    }
    function showSuccess(manageUrl) {
      form.hidden = true;
      if (successEl) {
        successEl.hidden = false;
        var linkEl = document.getElementById('randevu-manage-link');
        var copyBtn = document.getElementById('randevu-copy-link');
        if (linkEl) { linkEl.href = manageUrl; linkEl.textContent = manageUrl; }
        if (copyBtn) {
          copyBtn.onclick = function () {
            try {
              navigator.clipboard.writeText(manageUrl);
              copyBtn.textContent = (getLang() === 'de' ? 'Kopiert!' : 'Kopyalandı!');
              setTimeout(function () { copyBtn.textContent = (getLang() === 'de' ? 'Link kopieren' : 'Linki kopyala'); }, 2000);
            } catch (err) {}
          };
        }
      }
      setTimeout(function () { closeModal(); form.reset(); form.hidden = false; }, 8000);
    }
    if (API_BASE) {
      fetch(API_BASE + '/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, name: ad, phone: telefon || undefined, date: selectedDate, time: selectedTime, service: hizmet, note: mesaj || undefined })
      }).then(function (r) { return r.json(); }).then(function (data) {
        if (data.success && data.manage_url) {
          showSuccess(data.manage_url);
        } else if (data.success && data.requires_verification) {
          alert(getLang() === 'de' ? (data.message_de || data.message) : (data.message_tr || data.message));
          closeModal();
          form.reset();
        } else {
          alert(data.message || (getLang() === 'de' ? 'Ein Fehler ist aufgetreten.' : 'Bir hata oluştu.'));
        }
      }).catch(function () {
        alert(getLang() === 'de' ? 'Verbindungsfehler. Server braucht ggf. 1 Min. zum Starten – bitte erneut versuchen.' : 'Bağlantı hatası. Sunucu 1 dakika uyanıyor olabilir – lütfen tekrar deneyin.');
      });
      return;
    }
    var appointmentsToday = getAppointments().filter(function (r) { return r.date === selectedDate && (r.email || '').toLowerCase() === email; });
    if (appointmentsToday.length >= 3) {
      alert((window.__L && window.__L.appointment && window.__L.appointment.dailyLimit) ? window.__L.appointment.dailyLimit : (getLang() === 'de' ? 'Sie können maximal 3 Termine pro Tag buchen.' : 'Bir gün içinde en fazla 3 randevu alabilirsiniz.'));
      return;
    }
    var created = saveAppointment({ date: selectedDate, time: selectedTime, name: ad, email: email, phone: telefon || undefined, service: hizmet, note: mesaj });
    var manageUrl = window.location.origin + window.location.pathname.replace(/index\.html$/, '') + 'manage.html?token=' + encodeURIComponent(created.manage_token);
    showSuccess(manageUrl);
  });

  // Time slot'a tıklanınca step 3'e geçiş: yukarıda click delegation ile slot seçilince hemen step3'e geçiyoruz. Ama kullanıcı önce saati seçip sonra "Devam" demeli mi? İstek: "önce takvimden tarih seçecek sonra saat ve işlem seçecek". Yani akış: 1) Tarih 2) Saat 3) İşlem + kişi bilgisi. Saat seçilince otomatik step 3'e geçelim (zaten öyle yaptım).

  // Mobil menü
  navToggle && navToggle.addEventListener('click', function () { navMenu && navMenu.classList.toggle('is-open'); });
  navMenu && navMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (window.innerWidth <= 768) navMenu.classList.remove('is-open');
    });
  });
})();
