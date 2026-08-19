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

// 済度・誘惑(5.13 / 9.3 Step 3-6)。劣勢陣営の判定は「拮抗」境界(bonno_balance_label)と揃え、
// 直感的にUIの世界情勢ラベルから発動可否を予測できるようにする。
$BOON_UNDERDOG_THRESHOLD = 0.2;
// 済度: 劣勢の煩悩陣営へのboost加算量・上限・持続時間。
$SEIDO_BOOST_BONUS = 0.1;
$SEIDO_BOOST_BONUS_CAP = 0.3;
$SEIDO_DURATION_HOURS = 3;
// 誘惑: 劣勢の仏教陣営へのコンボ判定幅拡張の持続時間。
$YUUWAKU_DURATION_HOURS = 3;

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
    // PHP側はdate.timezone=UTC想定(reported_at/expires_at等をPHPのDateTimeImmutableで書き込む)。
    // MySQLのSYSTEMタイムゾーンが異なる環境(例:JST)だとNOW()基準の比較が数時間ズレるため、
    // この接続内のNOW()/CURRENT_TIMESTAMPをUTCへ固定して両者を一致させる。
    $pdo->exec("SET time_zone = '+00:00'");
  }
  return $pdo;
}
