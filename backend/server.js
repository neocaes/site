/**
 * Browdesing Songül – Randevu API (Backend)
 *
 * Özellikler:
 * - Site içeriği sunucuda (admin değişiklikleri herkeste görünür)
 * - Randevu: email doğrulama, limit, magic link
 * - Soru-cevap: mail+isim zorunlu, admin cevap, bildirim
 * - Admin: giriş, içerik/randevu/soru yönetimi, bildirimler
 * - Email: Nodemailer (SMTP); siteye özel adres
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { isEmail } = require('validator');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5500').replace(/\/$/, '');
const API_URL = process.env.API_URL || BASE_URL;
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/$/, '');

// Domain: production'da BASE_PATH=/api ile aynı domain'de /api/content vb. çalışır
if (BASE_PATH) {
  app.use((req, res, next) => {
    if (req.path.indexOf(BASE_PATH) === 0) {
      const newPath = req.path.slice(BASE_PATH.length) || '/';
      const q = req.originalUrl.indexOf('?');
      req.url = q >= 0 ? newPath + req.originalUrl.slice(q) : newPath;
    }
    next();
  });
}

// CORS: frontend + admin sayfası
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ---------------------------------------------------------------------------
// Veritabanı (SQLite – production'da MySQL/Postgres)
// ---------------------------------------------------------------------------
const dbPath = process.env.DB_PATH || path.join(__dirname, 'browdesing.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    email_verified_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    service TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending_verification',
    manage_token TEXT NOT NULL UNIQUE,
    lang TEXT NOT NULL DEFAULT 'de',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    appointment_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
  );

  CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON appointments(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(date, time);
  CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
  CREATE INDEX IF NOT EXISTS idx_evt_token ON email_verification_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_evt_expires ON email_verification_tokens(expires_at);

  CREATE TABLE IF NOT EXISTS site_content (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO site_content (id, data) VALUES (1, '{}');

  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    category TEXT NOT NULL,
    message TEXT,
    admin_reply TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    read_at TEXT,
    replied_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_questions_created ON questions(created_at);
  CREATE INDEX IF NOT EXISTS idx_questions_read ON questions(read_at);

  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS admin_sessions (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (admin_id) REFERENCES admin_users(id)
  );
  CREATE TABLE IF NOT EXISTS manage_request_tokens (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_mrt_token ON manage_request_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_mrt_expires ON manage_request_tokens(expires_at);
`);

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------
function uuid() {
  return crypto.randomUUID();
}

function secureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

const ALLOWED_SERVICES = ['kas-alma', 'kas-boyama', 'kirpik', 'agda', 'topuz', 'makyaj', 'turban', 'gelin', 'kombine'];
const WORK_DAYS = [2, 3, 4, 5, 6]; // Salı=2 ... Cumartesi=6

function slots15Min(start, end) {
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const slots = [];
  let [sh, sm] = start.split(':').map(Number);
  let [eh, em] = end.split(':').map(Number);
  let t = sh * 60 + sm;
  const endT = eh * 60 + em;
  while (t < endT) {
    slots.push(pad(Math.floor(t / 60)) + ':' + pad(t % 60));
    t += 15;
  }
  return slots;
}

function getHoursForDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  if (day === 6) return slots15Min('09:00', '17:00');
  if (WORK_DAYS.includes(day)) return slots15Min('09:00', '18:00');
  return [];
}

function isValidSlot(dateStr, timeStr) {
  const hours = getHoursForDate(dateStr);
  return hours.includes(timeStr);
}

const MESSAGES = {
  tr: {
    daily_limit: 'Bir gün içinde en fazla 3 randevu alabilirsiniz.',
    slot_not_available: 'Bu saat için randevu alınamıyor.',
    invalid_datetime: 'Geçersiz tarih veya saat.',
    email_required: 'Email adresi gerekli.',
    email_invalid: 'Geçerli bir email adresi girin.',
    name_required: 'Ad Soyad gerekli.',
    verification_sent: 'Doğrulama emaili gönderildi. Lütfen emailinizi kontrol edin.',
    token_invalid: 'Link geçersiz veya zaten kullanıldı.',
    token_expired: 'Doğrulama linkinin süresi doldu. Lütfen yeni randevu alın.',
  },
  de: {
    daily_limit: 'Sie können maximal 3 Termine pro Tag buchen.',
    slot_not_available: 'Dieser Termin ist nicht mehr verfügbar.',
    invalid_datetime: 'Ungültiges Datum oder Uhrzeit.',
    email_required: 'E-Mail-Adresse ist erforderlich.',
    email_invalid: 'Bitte gültige E-Mail-Adresse eingeben.',
    name_required: 'Name ist erforderlich.',
    verification_sent: 'Bestätigungs-E-Mail wurde gesendet. Bitte prüfen Sie Ihr Postfach.',
    token_invalid: 'Link ungültig oder bereits verwendet.',
    token_expired: 'Der Bestätigungslink ist abgelaufen. Bitte buchen Sie einen neuen Termin.',
  },
};

function msg(key, lang = 'de') {
  const L = MESSAGES[lang] || MESSAGES.de;
  return L[key] || key;
}

function passwordHash(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

// Varsayılan admin (sadece kayıt yoksa) – sunucu başlarken çalışır
function seedAdmin() {
  try {
    const existing = db.prepare('SELECT id FROM admin_users LIMIT 1').get();
    if (!existing) {
      const defaultUser = process.env.ADMIN_USER || 'admin';
      const defaultPass = process.env.ADMIN_PASS || 'admin123';
      db.prepare('INSERT INTO admin_users (id, username, password_hash) VALUES (?, ?, ?)').run(uuid(), defaultUser, passwordHash(defaultPass));
      console.log('[DB] Varsayılan admin oluşturuldu:', defaultUser);
    }
  } catch (e) { /* ignore */ }
}
seedAdmin();

// ---------------------------------------------------------------------------
// Nodemailer – siteye özel mail (SMTP env ile)
// ---------------------------------------------------------------------------
let mailTransporter = null;
function getMailTransporter() {
  if (mailTransporter) return mailTransporter;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.SITE_EMAIL;
  const pass = process.env.SMTP_PASS;
  if (user && pass) {
    const options = {
      host,
      port,
      secure: port === 465,
      auth: { user: user.trim(), pass: pass.trim() },
    };
    if (port === 587) options.requireTLS = true;
    mailTransporter = nodemailer.createTransport(options);
  } else {
    mailTransporter = { sendMail: (opts) => { console.log('[EMAIL]', opts.to, opts.subject || ''); return Promise.resolve({ messageId: 'mock' }); } };
  }
  return mailTransporter;
}
const SITE_EMAIL = process.env.SITE_EMAIL || 'info@browdesignsongul.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || SITE_EMAIL;

/** Bei 535/EAUTH: Hinweis auf Anwendungspasswort oder E-Mail-Passwort zurücksetzen. */
function logEmailAuthHelp(err) {
  console.error('[EMAIL]', err.message || err);
  if (err.code === 'EAUTH' || err.responseCode === 535) {
    console.error('');
    console.error('[EMAIL] --- 535 = Sunucu kullanıcı adı/şifreyi kabul etmedi ---');
    console.error('[EMAIL] Seçenek A – E-posta şifresini sıfırla (çoğu IONOS paketinde bu yeterli):');
    console.error('[EMAIL]   IONOS > E-Mail > info@... adresini seç > Üç nokta > Passwort ändern');
    console.error('[EMAIL]   Yeni şifreyi .env SMTP_PASS olarak yaz, sunucuyu yeniden başlat.');
    console.error('[EMAIL] Seçenek B – Uygulama şifresi (Webmail Sicherheit\'te "Anwendungspasswörter" varsa):');
    console.error('[EMAIL]   Webmail > Einstellungen > Sicherheit > Anwendungspasswörter > Neues Passwort, SMTP_PASS.');
    console.error('[EMAIL] Test: node test-email.js');
    console.error('');
  }
}

function sendVerificationEmail(to, name, verifyUrl, lang) {
  const L = lang === 'tr' ? MESSAGES.tr : MESSAGES.de;
  const subject = lang === 'tr' ? 'Randevunuzu doğrulayın' : 'Bestätigen Sie Ihren Termin';
  const purposeTr = 'Bu e-postanın size ait olduğunu ve gerçekten kullandığınızı doğrulamak için aşağıdaki linke tıklayın. Randevunuz ancak bu doğrulamadan sonra geçerli olur.';
  const purposeDe = 'Klicken Sie auf den folgenden Link, um zu bestätigen, dass Sie diese E-Mail-Adresse besitzen und nutzen. Ihr Termin wird erst nach dieser Bestätigung gültig.';
  const html = `
    <p>${lang === 'tr' ? 'Merhaba' : 'Hallo'} ${name},</p>
    <p>${lang === 'tr' ? purposeTr : purposeDe}</p>
    <p><a href="${verifyUrl}">${lang === 'tr' ? 'E-postamı doğrula' : 'E-Mail bestätigen'}</a></p>
    <p>${lang === 'tr' ? 'Bu link 24 saat geçerlidir.' : 'Dieser Link ist 24 Stunden gültig.'}</p>
  `;
  return getMailTransporter().sendMail({ from: SITE_EMAIL, to, subject, html }).catch((err) => {
    logEmailAuthHelp(err);
  });
}

function sendManageRequestEmail(to, name, manageListUrl, lang) {
  const subject = lang === 'tr' ? 'Randevularınızı yönetin' : 'Verwalten Sie Ihre Termine';
  const html = `
    <p>${lang === 'tr' ? 'Merhaba' : 'Hallo'} ${name},</p>
    <p>${lang === 'tr' ? 'Randevularınızı görüntülemek ve iptal/değiştirmek için aşağıdaki linke tıklayın:' : 'Klicken Sie auf den folgenden Link, um Ihre Termine anzuzeigen und zu stornieren oder zu ändern:'}</p>
    <p><a href="${manageListUrl}">${manageListUrl}</a></p>
    <p>${lang === 'tr' ? 'Bu link 24 saat geçerlidir.' : 'Dieser Link ist 24 Stunden gültig.'}</p>
  `;
  return getMailTransporter().sendMail({ from: SITE_EMAIL, to, subject, html }).catch((err) => {
    logEmailAuthHelp(err);
  });
}

function notifyAdminNewQuestion(questionId, name, email, category) {
  const subject = `[Browdesing] Yeni soru: ${name} (${category})`;
  const html = `<p>Yeni soru geldi.</p><p><strong>${name}</strong> &lt;${email}&gt;</p><p>Kategori: ${category}</p><p>Admin panelinden yanıtlayın.</p>`;
  return getMailTransporter().sendMail({ from: SITE_EMAIL, to: ADMIN_EMAIL, subject, html }).catch((err) => {
    logEmailAuthHelp(err);
  });
}

function notifyAdminNewAppointment(appointmentId, name, email, date, time, service) {
  const subject = `[Browdesing] Yeni randevu: ${name} – ${date} ${time}`;
  const html = `<p>Yeni randevu talebi.</p><p><strong>${name}</strong> &lt;${email}&gt;</p><p>${date} ${time} – ${service}</p>`;
  return getMailTransporter().sendMail({ from: SITE_EMAIL, to: ADMIN_EMAIL, subject, html }).catch((err) => {
    logEmailAuthHelp(err);
  });
}

// ---------------------------------------------------------------------------
// POST /appointments – Randevu oluştur
// ---------------------------------------------------------------------------
app.post('/appointments', (req, res) => {
  try {
    const { email, name, phone, date, time, service, note } = req.body || {};
    const lang = (req.headers['accept-language'] || '').startsWith('tr') ? 'tr' : 'de';

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: msg('email_required', lang),
        message_de: MESSAGES.de.email_required,
        message_tr: MESSAGES.tr.email_required,
      });
    }
    const emailNorm = email.trim().toLowerCase();
    if (!isEmail(emailNorm)) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: msg('email_invalid', lang),
        message_de: MESSAGES.de.email_invalid,
        message_tr: MESSAGES.tr.email_invalid,
      });
    }
    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: msg('name_required', lang),
        message_de: MESSAGES.de.name_required,
        message_tr: MESSAGES.tr.name_required,
      });
    }
    if (!date || !time || !service) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: msg('invalid_datetime', lang),
        message_de: MESSAGES.de.invalid_datetime,
        message_tr: MESSAGES.tr.invalid_datetime,
      });
    }
    if (!ALLOWED_SERVICES.includes(service)) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: msg('invalid_datetime', lang),
      });
    }
    if (!isValidSlot(date, time)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_datetime',
        message: msg('invalid_datetime', lang),
        message_de: MESSAGES.de.invalid_datetime,
        message_tr: MESSAGES.tr.invalid_datetime,
      });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (date === today) {
      const now = new Date();
      const [h, m] = time.split(':').map(Number);
      const slotMinutes = h * 60 + m;
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (slotMinutes < nowMinutes) {
        return res.status(400).json({
          success: false,
          error: 'slot_in_past',
          message: lang === 'tr' ? 'Bu saat geçmiş. Lütfen ileri bir saat seçin.' : 'Diese Uhrzeit liegt in der Vergangenheit. Bitte wählen Sie eine spätere Uhrzeit.',
        });
      }
    }

    let user = db.prepare('SELECT id, email_verified_at FROM users WHERE email = ?').get(emailNorm);
    const isNewUser = !user;
    if (isNewUser) {
      user = { id: uuid(), email_verified_at: null };
      db.prepare(
        'INSERT INTO users (id, email, name, phone, email_verified_at) VALUES (?, ?, ?, ?, ?)'
      ).run(user.id, emailNorm, String(name).trim(), phone ? String(phone).trim() : null, null);
    }

    const dailyCount = db
      .prepare(
        `SELECT COUNT(*) AS c FROM appointments WHERE user_id = ? AND date = ? AND status IN ('pending_verification', 'confirmed')`
      )
      .get(user.id, date);
    if (dailyCount.c >= 3) {
      return res.status(400).json({
        success: false,
        error: 'daily_limit_exceeded',
        message: MESSAGES.tr.daily_limit,
        message_de: MESSAGES.de.daily_limit,
      });
    }

    const slotTaken = db
      .prepare(
        `SELECT 1 FROM appointments WHERE date = ? AND time = ? AND status IN ('pending_verification', 'confirmed') LIMIT 1`
      )
      .get(date, time);
    if (slotTaken) {
      return res.status(400).json({
        success: false,
        error: 'slot_not_available',
        message: MESSAGES.tr.slot_not_available,
        message_de: MESSAGES.de.slot_not_available,
      });
    }

    const appointmentId = uuid();
    const manageToken = secureToken(32);
    const langCode = lang === 'tr' ? 'tr' : 'de';
    const needsVerification = isNewUser || !user.email_verified_at;

    db.prepare(
      `INSERT INTO appointments (id, user_id, date, time, service, note, status, manage_token, lang) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      appointmentId,
      user.id,
      date,
      time,
      service,
      note ? String(note).trim() : null,
      needsVerification ? 'pending_verification' : 'confirmed',
      manageToken,
      langCode
    );

    if (needsVerification) {
      const evtId = uuid();
      const evtToken = secureToken(32);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      db.prepare(
        `INSERT INTO email_verification_tokens (id, token, user_id, appointment_id, expires_at) VALUES (?, ?, ?, ?, ?)`
      ).run(evtId, evtToken, user.id, appointmentId, expiresAt);

      const verifyUrl = `${BASE_URL}/verify-email?token=${evtToken}`;
      sendVerificationEmail(emailNorm, String(name).trim(), verifyUrl, langCode);
      notifyAdminNewAppointment(appointmentId, String(name).trim(), emailNorm, date, time, service);

      return res.status(201).json({
        success: true,
        requires_verification: true,
        message: MESSAGES.tr.verification_sent,
        message_de: MESSAGES.de.verification_sent,
      });
    }

    const manageUrl = `${FRONTEND_URL}/manage.html?token=${manageToken}`;
    notifyAdminNewAppointment(appointmentId, String(name).trim(), emailNorm, date, time, service);
    return res.status(201).json({
      success: true,
      requires_verification: false,
      appointment: { id: appointmentId, date, time, service, status: 'confirmed' },
      manage_url: manageUrl,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Ein Fehler ist aufgetreten.',
      message_tr: 'Bir hata oluştu.',
    });
  }
});

// ---------------------------------------------------------------------------
// GET /verify-email?token=... – Email doğrulama (link tıklanınca)
// ---------------------------------------------------------------------------
app.get('/verify-email', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.redirect(`${FRONTEND_URL}/verify-error.html?reason=invalid`);
  }
  try {
    const row = db
      .prepare(
        'SELECT id, user_id, appointment_id, expires_at, used_at FROM email_verification_tokens WHERE token = ?'
      )
      .get(token);
    if (!row || row.used_at) {
      return res.redirect(`${FRONTEND_URL}/verify-error.html?reason=invalid`);
    }
    const now = new Date().toISOString();
    if (row.expires_at < now) {
      return res.redirect(`${FRONTEND_URL}/verify-error.html?reason=expired`);
    }
    db.prepare("UPDATE email_verification_tokens SET used_at = ? WHERE id = ?").run(now, row.id);
    db.prepare('UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?').run(now, now, row.user_id);
    db.prepare("UPDATE appointments SET status = 'confirmed', updated_at = ? WHERE id = ?").run(now, row.appointment_id);
    return res.redirect(`${FRONTEND_URL}/verify-success.html`);
  } catch (err) {
    console.error(err);
    return res.redirect(`${FRONTEND_URL}/verify-error.html?reason=error`);
  }
});

// ---------------------------------------------------------------------------
// GET /availability?date=YYYY-MM-DD – Müsait slotlar
// ---------------------------------------------------------------------------
app.get('/availability', (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).json({ success: false, error: 'date_required' });
  const hours = getHoursForDate(date);
  const booked = db
    .prepare(
      `SELECT time FROM appointments WHERE date = ? AND status IN ('pending_verification', 'confirmed')`
    )
    .all(date)
    .map((r) => r.time);
  return res.json({ date, slots: hours, booked });
});

// ---------------------------------------------------------------------------
// GET /content – Site içeriği (herkese açık)
// ---------------------------------------------------------------------------
app.get('/content', (req, res) => {
  try {
    const row = db.prepare('SELECT data FROM site_content WHERE id = 1').get();
    const data = row ? JSON.parse(row.data || '{}') : {};
    return res.json(data);
  } catch (e) {
    return res.status(500).json({});
  }
});

// ---------------------------------------------------------------------------
// Admin auth middleware
// ---------------------------------------------------------------------------
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: 'unauthorized' });
  try {
    const row = db.prepare(
      'SELECT s.admin_id, u.username FROM admin_sessions s JOIN admin_users u ON u.id = s.admin_id WHERE s.token = ? AND s.expires_at > datetime(\'now\')'
    ).get(token);
    if (!row) return res.status(401).json({ success: false, error: 'unauthorized' });
    req.adminId = row.admin_id;
    req.adminUsername = row.username;
    next();
  } catch (e) {
    res.status(401).json({ success: false, error: 'unauthorized' });
  }
}

// ---------------------------------------------------------------------------
// GET /api/admin/reset-password – Tek seferlik şifre sıfırlama (canlı sunucuda SSH yoksa)
// Tarayıcıda aç: https://siteniz.com/api/admin/reset-password?secret=XXX&password=admin123
// .env'de RESET_SECRET=XXX tanımla (en az 8 karakter), şifreyi sıfırla, sonra RESET_SECRET'ı sil.
// ---------------------------------------------------------------------------
app.get('/api/admin/reset-password', (req, res) => {
  const secret = process.env.RESET_SECRET;
  if (!secret || secret.length < 8) {
    return res.status(404).json({ success: false, error: 'not_configured' });
  }
  const givenSecret = (req.query.secret || '').trim();
  const newPassword = (req.query.password || 'admin123').trim();
  if (givenSecret !== secret) {
    return res.status(401).json({ success: false, error: 'invalid_secret' });
  }
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ success: false, error: 'password_too_short' });
  }
  const username = (process.env.ADMIN_USER || 'admin').trim();
  const hash = passwordHash(newPassword);
  const row = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);
  if (row) {
    db.prepare('UPDATE admin_users SET password_hash = ? WHERE username = ?').run(hash, username);
  } else {
    db.prepare('INSERT INTO admin_users (id, username, password_hash) VALUES (?, ?, ?)').run(uuid(), username, hash);
  }
  return res.json({ success: true, message: 'Şifre güncellendi. Kullanıcı: ' + username + '. RESET_SECRET\'ı .env\'den silin.' });
});

// ---------------------------------------------------------------------------
// POST /api/admin/login – Admin giriş
// ---------------------------------------------------------------------------
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'missing_credentials' });
  }
  const user = db.prepare('SELECT id FROM admin_users WHERE username = ? AND password_hash = ?').get(username.trim(), passwordHash(password));
  if (!user) {
    return res.status(401).json({ success: false, error: 'invalid_credentials' });
  }
  const sessionId = uuid();
  const sessionToken = secureToken(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO admin_sessions (id, admin_id, token, expires_at) VALUES (?, ?, ?, ?)').run(sessionId, user.id, sessionToken, expiresAt);
  return res.json({ success: true, token: sessionToken });
});

// ---------------------------------------------------------------------------
// GET /api/admin/content – İçerik oku (admin)
// ---------------------------------------------------------------------------
app.get('/api/admin/content', adminAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT data FROM site_content WHERE id = 1').get();
    const data = row ? JSON.parse(row.data || '{}') : {};
    return res.json(data);
  } catch (e) {
    return res.status(500).json({});
  }
});

// ---------------------------------------------------------------------------
// PUT /api/admin/content – İçerik kaydet (admin) → site herkeste güncellenir
// ---------------------------------------------------------------------------
app.put('/api/admin/content', adminAuth, (req, res) => {
  try {
    const data = typeof req.body === 'object' ? req.body : {};
    const json = JSON.stringify(data);
    const now = new Date().toISOString();
    db.prepare('INSERT OR REPLACE INTO site_content (id, data, updated_at) VALUES (1, ?, ?)').run(json, now);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'save_failed' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/appointments – Randevu listesi (admin)
// ---------------------------------------------------------------------------
app.get('/api/admin/appointments', adminAuth, (req, res) => {
  const date = req.query.date;
  try {
    let rows;
    if (date) {
      rows = db.prepare(`
        SELECT a.id, a.date, a.time, a.service, a.note, a.status, a.manage_token, a.created_at, u.name, u.email, u.phone
        FROM appointments a JOIN users u ON u.id = a.user_id
        WHERE a.date = ? AND a.status IN ('pending_verification', 'confirmed')
        ORDER BY a.time
      `).all(date);
    } else {
      rows = db.prepare(`
        SELECT a.id, a.date, a.time, a.service, a.note, a.status, a.manage_token, a.created_at, u.name, u.email, u.phone
        FROM appointments a JOIN users u ON u.id = a.user_id
        WHERE a.status IN ('pending_verification', 'confirmed')
        ORDER BY a.date DESC, a.time DESC
        LIMIT 500
      `).all();
    }
    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ success: false, error: 'list_failed' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/appointments/:id/cancel – Randevu iptal (admin)
// ---------------------------------------------------------------------------
app.patch('/api/admin/appointments/:id/cancel', adminAuth, (req, res) => {
  const id = req.params.id;
  try {
    db.prepare("UPDATE appointments SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(id);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false });
  }
});

// ---------------------------------------------------------------------------
// POST /questions – Soru gönder (mail + isim zorunlu)
// ---------------------------------------------------------------------------
app.post('/questions', (req, res) => {
  const { name, email, category, message } = req.body || {};
  const emailNorm = email && String(email).trim().toLowerCase();
  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, error: 'name_required' });
  }
  if (!emailNorm || !isEmail(emailNorm)) {
    return res.status(400).json({ success: false, error: 'email_required' });
  }
  const cat = (category && String(category).trim()) || 'general';
  const id = uuid();
  try {
    db.prepare('INSERT INTO questions (id, name, email, category, message) VALUES (?, ?, ?, ?, ?)').run(id, String(name).trim(), emailNorm, cat, message ? String(message).trim() : null);
    notifyAdminNewQuestion(id, String(name).trim(), emailNorm, cat);
    return res.status(201).json({ success: true, id });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'send_failed' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/questions – Soru listesi (admin)
// ---------------------------------------------------------------------------
app.get('/api/admin/questions', adminAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT id, name, email, category, message, admin_reply, created_at, read_at, replied_at FROM questions ORDER BY created_at DESC').all();
    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ success: false, error: 'list_failed' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/questions/:id – Okundu / Cevap (admin)
// ---------------------------------------------------------------------------
app.patch('/api/admin/questions/:id', adminAuth, (req, res) => {
  const id = req.params.id;
  const { read_at, admin_reply } = req.body || {};
  try {
    if (read_at !== undefined) {
      db.prepare('UPDATE questions SET read_at = ? WHERE id = ?').run(read_at ? new Date().toISOString() : null, id);
    }
    if (admin_reply !== undefined) {
      db.prepare('UPDATE questions SET admin_reply = ?, replied_at = datetime(\'now\') WHERE id = ?').run(String(admin_reply), id);
    }
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/notifications – Yeni soru/randevu sayıları (bildirimler)
// ---------------------------------------------------------------------------
app.get('/api/admin/notifications', adminAuth, (req, res) => {
  try {
    const unreadQuestions = db.prepare('SELECT COUNT(*) AS c FROM questions WHERE read_at IS NULL').get();
    const recentAppointments = db.prepare(`
      SELECT COUNT(*) AS c FROM appointments WHERE status IN ('pending_verification', 'confirmed') AND created_at > datetime('now', '-7 days')
    `).get();
    const listQuestions = db.prepare('SELECT id, name, email, category, created_at FROM questions WHERE read_at IS NULL ORDER BY created_at DESC LIMIT 20').all();
    const listAppointments = db.prepare(`
      SELECT a.id, a.date, a.time, a.service, u.name, u.email, a.created_at
      FROM appointments a JOIN users u ON u.id = a.user_id
      WHERE a.status IN ('pending_verification', 'confirmed') AND a.created_at > datetime('now', '-3 days')
      ORDER BY a.created_at DESC LIMIT 20
    `).all();
    return res.json({
      unread_questions: unreadQuestions.c,
      recent_appointments: recentAppointments.c,
      questions: listQuestions,
      appointments: listAppointments,
    });
  } catch (e) {
    return res.status(500).json({ success: false });
  }
});

// ---------------------------------------------------------------------------
// POST /appointments/request-manage – Randevu yönetimi için email+isim → doğrulama maili
// ---------------------------------------------------------------------------
app.post('/appointments/request-manage', (req, res) => {
  const { email, name } = req.body || {};
  const lang = (req.headers['accept-language'] || '').startsWith('tr') ? 'tr' : 'de';
  const emailNorm = email && String(email).trim().toLowerCase();
  if (!emailNorm || !isEmail(emailNorm)) {
    return res.status(400).json({ success: false, error: 'email_required', message: msg('email_invalid', lang) });
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, error: 'name_required', message: msg('name_required', lang) });
  }
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(emailNorm);
  if (!user) {
    return res.status(404).json({ success: false, error: 'user_not_found', message: lang === 'tr' ? 'Bu e-posta ile kayıtlı randevu bulunamadı.' : 'Kein Termin mit dieser E-Mail gefunden.' });
  }
  const token = secureToken(32);
  const id = uuid();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO manage_request_tokens (id, token, user_id, expires_at) VALUES (?, ?, ?, ?)').run(id, token, user.id, expiresAt);
  const manageListUrl = `${FRONTEND_URL}/manage-list.html?token=${token}`;
  sendManageRequestEmail(emailNorm, String(name).trim(), manageListUrl, lang);
  return res.json({ success: true, message: lang === 'tr' ? 'E-posta adresinize yönetim linki gönderildi.' : 'Der Link wurde an Ihre E-Mail gesendet.' });
});

// ---------------------------------------------------------------------------
// GET /api/appointments/by-user?token= – Doğrulama token ile randevu listesi (manage-list sayfası)
// ---------------------------------------------------------------------------
app.get('/api/appointments/by-user', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).json({ success: false, error: 'token_required' });
  const row = db.prepare('SELECT user_id, expires_at, used_at FROM manage_request_tokens WHERE token = ?').get(token);
  if (!row || row.used_at) return res.status(404).json({ success: false, error: 'invalid_token' });
  const now = new Date().toISOString();
  if (row.expires_at < now) return res.status(410).json({ success: false, error: 'token_expired' });
  const appointments = db.prepare(`
    SELECT a.id, a.date, a.time, a.service, a.status, a.manage_token, a.created_at
    FROM appointments a WHERE a.user_id = ? AND a.status IN ('pending_verification', 'confirmed')
    ORDER BY a.date, a.time
  `).all(row.user_id);
  return res.json({ appointments });
});

// ---------------------------------------------------------------------------
// GET /api/appointments/manage?token= – Tek randevu (manage_token ile, manage.html)
// ---------------------------------------------------------------------------
app.get('/api/appointments/manage', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).json({ success: false, error: 'token_required' });
  const row = db.prepare(`
    SELECT a.id, a.date, a.time, a.service, a.note, a.status, a.manage_token, a.lang, u.name, u.email, u.phone
    FROM appointments a JOIN users u ON u.id = a.user_id
    WHERE a.manage_token = ? AND a.status IN ('pending_verification', 'confirmed')
  `).get(token);
  if (!row) return res.status(404).json({ success: false, error: 'not_found' });
  return res.json({
    id: row.id,
    date: row.date,
    time: row.time,
    service: row.service,
    note: row.note,
    status: row.status,
    manage_token: row.manage_token,
    lang: row.lang,
    name: row.name,
    email: row.email,
    phone: row.phone,
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/appointments/manage – Randevu iptal veya tarih değiştir (manage_token ile)
// ---------------------------------------------------------------------------
app.patch('/api/appointments/manage', (req, res) => {
  const { token, action, date: newDate, time: newTime } = req.body || {};
  if (!token) return res.status(400).json({ success: false, error: 'token_required' });
  const row = db.prepare('SELECT id, user_id, date, time FROM appointments WHERE manage_token = ? AND status IN (\'pending_verification\', \'confirmed\')').get(token);
  if (!row) return res.status(404).json({ success: false, error: 'not_found' });
  if (action === 'cancel') {
    db.prepare("UPDATE appointments SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(row.id);
    return res.json({ success: true, action: 'cancelled' });
  }
  if (action === 'reschedule' && newDate && newTime) {
    if (!isValidSlot(newDate, newTime)) {
      return res.status(400).json({ success: false, error: 'invalid_slot' });
    }
    const slotTaken = db.prepare(
      `SELECT 1 FROM appointments WHERE date = ? AND time = ? AND status IN ('pending_verification', 'confirmed') AND id != ? LIMIT 1`
    ).get(newDate, newTime, row.id);
    if (slotTaken) {
      return res.status(400).json({ success: false, error: 'slot_not_available' });
    }
    db.prepare("UPDATE appointments SET date = ?, time = ?, updated_at = datetime('now') WHERE id = ?").run(newDate, newTime, row.id);
    return res.json({ success: true, action: 'rescheduled', date: newDate, time: newTime });
  }
  return res.status(400).json({ success: false, error: 'invalid_action' });
});

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected' });
});

app.listen(PORT, () => {
  console.log('Browdesing Randevu API listening on port', PORT);
  console.log('BASE_URL:', BASE_URL, 'FRONTEND_URL:', FRONTEND_URL);
  const host = (process.env.SMTP_HOST || '').toLowerCase();
  if (host.includes('ionos') && process.env.SMTP_PASS) {
    console.log('[EMAIL] IONOS SMTP: Bei 535-Fehler bitte Anwendungspasswort verwenden (nicht das normale E-Mail-Passwort).');
  }
});
