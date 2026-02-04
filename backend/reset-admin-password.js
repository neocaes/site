/**
 * Admin şifresini admin123 olarak sıfırlar.
 * Kullanım: backend klasöründe iken → node reset-admin-password.js
 * Giriş: Kullanıcı adı = admin (veya .env'deki ADMIN_USER), Şifre = admin123
 */
require('dotenv').config();
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'browdesing.db');
const db = new Database(dbPath);

function passwordHash(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

const username = process.env.ADMIN_USER || 'admin';
const newPassword = 'admin123';
const hash = passwordHash(newPassword);

const row = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);
if (row) {
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE username = ?').run(hash, username);
  console.log('Admin şifresi güncellendi. Kullanıcı adı:', username, '– Şifre: admin123');
} else {
  const uuid = require('crypto').randomUUID();
  db.prepare('INSERT INTO admin_users (id, username, password_hash) VALUES (?, ?, ?)').run(uuid, username, hash);
  console.log('Admin kullanıcısı oluşturuldu. Kullanıcı adı:', username, '– Şifre: admin123');
}

db.close();
