-- 陣営対戦システム 最小DBスキーマ(企画設計書 4.4 準拠)
-- faction は state.s.faction の値(kon=仏教陣営 / shu=煩悩陣営)に合わせる。

CREATE TABLE IF NOT EXISTS players (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  faction ENUM('kon','shu') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 送信された差分の生ログ(監査・不正検知の元データ)。room_idがあればルーム対戦、NULLならグローバル集計。
CREATE TABLE IF NOT EXISTS contributions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  player_id VARCHAR(64) NOT NULL,
  faction ENUM('kon','shu') NOT NULL,
  raw_delta DOUBLE NOT NULL,
  cp DOUBLE NOT NULL,
  room_id BIGINT UNSIGNED NULL,
  client_ts BIGINT UNSIGNED NULL,
  reported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_hash CHAR(64) NULL,
  INDEX idx_reported (reported_at),
  INDEX idx_player_reported (player_id, reported_at),
  INDEX idx_faction_reported (faction, reported_at),
  INDEX idx_room (room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 時間窓ごとの集計値(cronバッチが書き込む)。world-status.phpはここを読む。
CREATE TABLE IF NOT EXISTS faction_totals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  season_id VARCHAR(32) NOT NULL,
  faction ENUM('kon','shu') NOT NULL,
  window_hours INT UNSIGNED NOT NULL,
  cp_sum DOUBLE NOT NULL DEFAULT 0,
  active_players INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_season_faction (season_id, faction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS seasons (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NULL,
  winner_faction ENUM('kon','shu') NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rooms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(16) NOT NULL UNIQUE,
  host_player_id VARCHAR(64) NOT NULL,
  max_players TINYINT UNSIGNED NOT NULL DEFAULT 2,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  status ENUM('waiting','active','finished') NOT NULL DEFAULT 'waiting'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ルーム対戦(3.7)の参加者ロースター。roomsテーブル単体では参加者一覧・人数上限判定ができないため
-- 実装レベルで追加(9.3 Step 3-2。企画書4.4の最小構成には明記されていないが、参加人数の判定・表示に必須)。
CREATE TABLE IF NOT EXISTS room_players (
  room_id BIGINT UNSIGNED NOT NULL,
  player_id VARCHAR(64) NOT NULL,
  faction ENUM('kon','shu') NOT NULL,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, player_id),
  INDEX idx_player (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 送信レート制限用(企画設計書 8.3): player_idごとの直近ウィンドウの送信回数。
CREATE TABLE IF NOT EXISTS rate_limits (
  player_id VARCHAR(64) NOT NULL PRIMARY KEY,
  window_start DATETIME NOT NULL,
  count INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
