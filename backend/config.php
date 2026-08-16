<?php
declare(strict_types=1);

// デフォルトはローカル開発用のダミー値。本番の実接続情報・許可オリジンは
// config.local.php (git管理外。サーバー上に直接作成する) で上書きする。
$DB_HOST = '127.0.0.1';
$DB_NAME = 'bonno_clicker_dev';
$DB_USER = 'root';
$DB_PASS = '';

// /api/contribute へのPOSTを許可するフロントエンドのOrigin(8.3参照)。
$ALLOWED_ORIGINS = ['http://localhost:8811', 'http://127.0.0.1:8811'];

$bonnoLocalConfig = __DIR__ . '/config.local.php';
if (is_file($bonnoLocalConfig)) {
  require $bonnoLocalConfig;
}

function bonno_pdo(): PDO {
  global $DB_HOST, $DB_NAME, $DB_USER, $DB_PASS;
  static $pdo = null;
  if ($pdo === null) {
    $dsn = "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4";
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES => false,
    ]);
  }
  return $pdo;
}
