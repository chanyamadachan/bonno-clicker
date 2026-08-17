<?php
declare(strict_types=1);
// cronから数分〜十数分おきに実行する集計バッチ(企画設計書 4.1)。
// world-status.php は contributions を直接ライブ集計して返すため即時性はこれに依存しないが、
// このバッチはシーズン単位の履歴(faction_totals)を残すために独立して回す。
// 例: */5 * * * * /usr/local/bin/php /home/xxxx/www/bonno-clicker.chanyama.com/backend/cron/aggregate.php >> /home/xxxx/log/bonno-clicker-aggregate.log 2>&1

require __DIR__ . '/../config.php';
require __DIR__ . '/../lib/cp.php';
require __DIR__ . '/../lib/season.php';
require __DIR__ . '/../lib/alert.php';

$pdo = bonno_pdo();
$windowHours = $CONTRIB_WINDOW_HOURS;
$seasonId = bonno_current_season_id($pdo);

// 単発の異常送信が集計を振り切らないようwinsorizeしてから合算する(0.1-2)。
$stmt = $pdo->prepare(
  'SELECT player_id, faction, cp
   FROM contributions
   WHERE reported_at >= (NOW() - INTERVAL ? HOUR) AND room_id IS NULL'
);
$stmt->execute([$windowHours]);

$rawCp = ['kon' => [], 'shu' => []];
$players = ['kon' => [], 'shu' => []];
foreach ($stmt->fetchAll() as $r) {
  $f = (string)$r['faction'];
  if (!isset($rawCp[$f])) continue;
  $rawCp[$f][] = (float)$r['cp'];
  $players[$f][(string)$r['player_id']] = true;
}

$byFaction = ['kon' => ['cp_sum' => 0.0, 'active_players' => 0], 'shu' => ['cp_sum' => 0.0, 'active_players' => 0]];
foreach (['kon', 'shu'] as $f) {
  $byFaction[$f] = [
    'cp_sum' => array_sum(bonno_winsorize_cp($rawCp[$f], $WINSORIZE_PCT)),
    'active_players' => count($players[$f]),
  ];
}

// 天秤急変の検知(0.1-2): upsertで上書きする前に直前の集計値を読み、変化率が閾値を超えたら通知する。
if (!empty($ALERT_WEBHOOK_URL)) {
  $prevStmt = $pdo->prepare('SELECT faction, cp_sum FROM faction_totals WHERE season_id = ? AND window_hours = ?');
  $prevStmt->execute([$seasonId, $windowHours]);
  $prev = ['kon' => null, 'shu' => null];
  foreach ($prevStmt->fetchAll() as $r) {
    $f = (string)$r['faction'];
    // 値がnullのため isset() ではなく array_key_exists() で判定する(issetはnull値のキーを「未設定」扱いしてしまう)。
    if (array_key_exists($f, $prev)) $prev[$f] = (float)$r['cp_sum'];
  }
  foreach ($byFaction as $faction => $v) {
    if ($prev[$faction] === null) continue; // 初回集計は比較対象がないためスキップ
    $diff = abs($v['cp_sum'] - $prev[$faction]);
    $base = max(1.0, abs($prev[$faction]));
    if ($diff / $base >= $ALERT_THRESHOLD_RATIO) {
      $label = $faction === 'kon' ? '仏教' : '煩悩';
      bonno_send_alert_webhook($ALERT_WEBHOOK_URL, sprintf(
        '⚠️ 陣営スコア急変検知: %s陣営のCPが %.1f → %.1f (%.0f%%変化、直近%d時間窓)',
        $label, $prev[$faction], $v['cp_sum'], ($diff / $base) * 100, $windowHours
      ));
    }
  }
}

$upsert = $pdo->prepare(
  'INSERT INTO faction_totals (season_id, faction, window_hours, cp_sum, active_players)
   VALUES (?, ?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE window_hours = VALUES(window_hours), cp_sum = VALUES(cp_sum), active_players = VALUES(active_players)'
);
foreach ($byFaction as $faction => $v) {
  $upsert->execute([$seasonId, $faction, $windowHours, $v['cp_sum'], $v['active_players']]);
}

printf("[%s] aggregated season=%s kon_cp=%.3f shu_cp=%.3f kon_active=%d shu_active=%d\n",
  date('c'), $seasonId, $byFaction['kon']['cp_sum'], $byFaction['shu']['cp_sum'],
  $byFaction['kon']['active_players'], $byFaction['shu']['active_players']);
