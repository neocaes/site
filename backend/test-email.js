/**
 * SMTP bağlantısını test eder. .env'deki SMTP bilgileriyle giriş yapmayı dener.
 * Kullanım: node test-email.js
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || '587', 10);
const user = process.env.SMTP_USER || process.env.SITE_EMAIL;
const pass = process.env.SMTP_PASS;

if (!user || !pass) {
  console.error('Hata: .env dosyasında SMTP_USER ve SMTP_PASS tanımlı olmalı.');
  process.exit(1);
}

const options = {
  host,
  port,
  secure: port === 465,
  auth: { user: user.trim(), pass: pass.trim() },
};
if (port === 587) options.requireTLS = true;

console.log('SMTP test ediliyor:', host, 'port', port, 'kullanıcı', user);
const transporter = nodemailer.createTransport(options);

transporter.verify((err, success) => {
  if (err) {
    console.error('Bağlantı / giriş hatası:', err.message);
    if (err.code === 'EAUTH' || err.responseCode === 535) {
      console.error('');
      console.error('535 = Sunucu kullanıcı adı veya şifreyi kabul etmedi.');
      console.error('Uygulama şifresi (App Password) 535 veriyorsa: IONOS SMTP bazen sadece POSTA KUTUSU şifresini kabul eder.');
      console.error('Yapın: IONOS ana panel > E-Mail > info@... satırında üç nokta > Passwort ändern');
      console.error('Yeni şifreyi belirleyin, .env SMTP_PASS olarak yazın. Port 587 denendi; hâlâ 535 ise SMTP_PORT=465 yapıp tekrar deneyin.');
      console.error('Tekrar: node test-email.js');
    }
    process.exit(1);
  }
  console.log('SMTP bağlantısı ve giriş başarılı.');
  process.exit(0);
});
