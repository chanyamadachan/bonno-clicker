<?php
declare(strict_types=1);
// cronから数分〜十数分おきに実行する集計バッチ(企画設計書 4.1)。
// world-status.php は contributions を直接ライブ集計して返すため即時性はこれに依存しないが、
// このバッチはシーズン単位の履歴(faction_totals)を残すために独立して回す。
// 例: */5 * * * * /usr/local/bin/php /home/xxxx/www/bonno-clicker.chanyama.com/backend/cron/aggregate.php >> /home/xxxx/log/bonno-clicker-aggregate.log 2>&1

require __DIR__ . '/../config.php';
require __DIR__ . '/../lib/cp.php';
require __DIR__ . '/../lib/season.php';

$pdo = bonno_pdo();
$windowHours = 48;
$seasonId = bonno_current_season_id($pdo);

$stmt = $pdo->prepare(
  'SELECT faction, COALESCE(SUM(cp),0) AS cp_sum, COUNT(DISTINCT player_id) AS active_players
   FROM contributions
   WHERE reported_at >= (NOW() - INTERVAL ? HOUR) AND room_id IS NULL
   GROUP BY faction'
);
$stmt->execute([$windowHours]);

$byFaction = ['kon' => ['cp_sum' => 0.0, 'active_players' => 0], 'shu' => ['cp_sum' => 0.0, 'active_players' => 0]];
foreach ($stmt->fetchAll() as $r) {
  $f = (string)$r['faction'];
  if (isset($byFaction[$f])) {
    $byFaction[$f] = ['cp_sum' => (float)$r['cp_sum'], 'active_players' => (int)$r['active_players']];
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
