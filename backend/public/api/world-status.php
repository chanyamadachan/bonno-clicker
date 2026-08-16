<?php
declare(strict_types=1);
require __DIR__ . '/../../config.php';
require __DIR__ . '/../../lib/security.php';
require __DIR__ . '/../../lib/cp.php';
require __DIR__ . '/../../lib/season.php';

header('Content-Type: application/json; charset=utf-8');
bonno_open_cors($ALLOWED_ORIGINS);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
  http_response_code(405);
  echo json_encode(['error' => 'method_not_allowed']);
  exit;
}

$pdo = bonno_pdo();
$windowHours = 48; // 直近48時間の移動窓(企画設計書 3.3)
$seasonId = bonno_current_season_id($pdo);

// グローバル集計のみ対象(room_id指定のルーム対戦は含めない)。常にサーバー時刻基準で窓を切る。
$stmt = $pdo->prepare(
  'SELECT faction, COALESCE(SUM(cp),0) AS cp_sum, COUNT(DISTINCT player_id) AS active_players
   FROM contributions
   WHERE reported_at >= (NOW() - INTERVAL ? HOUR) AND room_id IS NULL
   GROUP BY faction'
);
$stmt->execute([$windowHours]);

$cp = ['kon' => 0.0, 'shu' => 0.0];
$active = ['kon' => 0, 'shu' => 0];
foreach ($stmt->fetchAll() as $r) {
  $f = (string)$r['faction'];
  if (isset($cp[$f])) {
    $cp[$f] = (float)$r['cp_sum'];
    $active[$f] = (int)$r['active_players'];
  }
}

$totalActive = $active['kon'] + $active['shu'];
$boost = [
  'kon' => bonno_compute_boost($totalActive, $active['kon']),
  'shu' => bonno_compute_boost($totalActive, $active['shu']),
];

$eps = 1e-6;
$sum = $cp['kon'] + $cp['shu'];
$balance = $sum > 0 ? max(-1.0, min(1.0, ($cp['shu'] - $cp['kon']) / ($sum + $eps))) : 0.0;

echo json_encode([
  'seasonId' => $seasonId,
  'balance' => round($balance, 4),
  'label' => bonno_balance_label($balance),
  'konCP' => round($cp['kon'], 3),
  'shuCP' => round($cp['shu'], 3),
  'windowHours' => $windowHours,
  'activePlayers' => $active,
  'boost' => $boost,
  'updatedAt' => time(),
], JSON_UNESCAPED_UNICODE);
