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
$windowHours = $CONTRIB_WINDOW_HOURS; // 直近窓の幅(企画設計書 3.3、config.phpで一元管理)
$seasonId = bonno_current_season_id($pdo);

// グローバル集計のみ対象(room_id指定のルーム対戦は含めない)。常にサーバー時刻基準で窓を切る。
// プレイヤーに直接見える天秤の値なので、単発の異常送信が振り切れないようwinsorizeしてから合算する(0.1-2)。
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

$cp = ['kon' => 0.0, 'shu' => 0.0];
$active = ['kon' => 0, 'shu' => 0];
foreach (['kon', 'shu'] as $f) {
  $cp[$f] = array_sum(bonno_winsorize_cp($rawCp[$f], $WINSORIZE_PCT));
  $active[$f] = count($players[$f]);
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
