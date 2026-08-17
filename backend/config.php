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

// CP係数(3.2)。バランス調整のたびにAPIのロジックファイルを触らずに済むようここに集約する(0.3-E)。
$CP_K = 12.0;

// 直近窓の幅(3.3/3.4)。contribute.php(boost計算)・world-status.php・aggregate.phpで共有する。
$CONTRIB_WINDOW_HOURS = 48;

// 単発cpの外れ値クリップ比率(0.1-2)。時間窓内の上位この割合を分位点でクリップしてから合算する。
// 個人開発規模の実データ量では1%だと発動に100件以上のサンプルを要し実質機能しないため、
// 数十件規模でも意味を持つ5%を既定値とした(実測: n=21件から1件クリップが効き始める)。
$WINSORIZE_PCT = 0.05;

// 天秤急変時にPOSTするDiscord/Slack等のWebhook URL。未設定(null)なら通知しない。
$ALERT_WEBHOOK_URL = null;

// 直前ウィンドウ比でこの割合以上cp_sumが変化したら通知する(暫定値)。
$ALERT_THRESHOLD_RATIO = 0.5;

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
