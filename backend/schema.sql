-- ============================================================
-- Browdesing Songül - Randevu Sistemi Veritabanı Şeması
-- Production-ready, email doğrulama ve randevu limiti destekli
-- ============================================================

-- Uygulama zaman dilimi (Mannheim için Europe/Berlin)
SET time_zone = '+01:00';

-- ----------------------------------------
-- 1. KULLANICILAR
-- Email + isim birlikte saklanır. Aynı email = mevcut kullanıcı.
-- ----------------------------------------
CREATE TABLE users (
  id                CHAR(36)     NOT NULL PRIMARY KEY,
  email             VARCHAR(255) NOT NULL,
  name              VARCHAR(255) NOT NULL,
  phone             VARCHAR(50)  NULL,
  email_verified_at TIMESTAMP    NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_email_verified (email, email_verified_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------
-- 2. RANDEVULAR
-- status: pending_verification | confirmed | cancelled
-- ----------------------------------------
CREATE TABLE appointments (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  user_id      CHAR(36)     NOT NULL,
  date         DATE         NOT NULL,
  time         TIME         NOT NULL,
  service      VARCHAR(100) NOT NULL,
  note         TEXT         NULL,
  status       VARCHAR(30)  NOT NULL DEFAULT 'pending_verification',
  manage_token CHAR(64)     NOT NULL,
  lang         CHAR(2)      NOT NULL DEFAULT 'de',
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_appointments_user_date (user_id, date),
  KEY idx_appointments_date_time (date, time),
  KEY idx_appointments_status (status),
  KEY idx_appointments_manage_token (manage_token),
  CONSTRAINT fk_appointments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------
-- 3. EMAIL DOĞRULAMA TOKENLARI
-- Süre: 24 saat. Kullanıldıktan sonra used_at set edilir.
-- ----------------------------------------
CREATE TABLE email_verification_tokens (
  id             CHAR(36)    NOT NULL PRIMARY KEY,
  token          CHAR(64)    NOT NULL,
  user_id        CHAR(36)    NOT NULL,
  appointment_id CHAR(36)    NOT NULL,
  expires_at     TIMESTAMP   NOT NULL,
  used_at        TIMESTAMP   NULL,
  created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_evt_token (token),
  KEY idx_evt_expires (expires_at),
  KEY idx_evt_used (used_at),
  CONSTRAINT fk_evt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_evt_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------
-- 4. RANDEVU LİMİTİ KONTROLÜ İÇİN GÖRÜNÜM (opsiyonel)
-- Aynı kullanıcının aynı gün onaylı/bekleyen randevu sayısı
-- ----------------------------------------
-- Kullanım: SELECT daily_count FROM v_appointments_per_user_per_day
--          WHERE user_id = ? AND date = ?;
CREATE OR REPLACE VIEW v_appointments_per_user_per_day AS
SELECT
  user_id,
  date,
  COUNT(*) AS daily_count
FROM appointments
WHERE status IN ('pending_verification', 'confirmed')
GROUP BY user_id, date;
