<?php
declare(strict_types=1);
require __DIR__ . '/../../config.php';
require __DIR__ . '/../../lib/security.php';
require __DIR__ . '/../../lib/room.php';
require __DIR__ . '/../../lib/cp.php';

header('Content-Type: application/json; charset=utf-8');
bonno_open_cors($ALLOWED_ORIGINS);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
  http_response_code(405);
  echo json_encode(['error' => 'method_not_allowed']);
  exit;
}

$code = isset($_GET['code']) ? strtoupper(trim((string)$_GET['code'])) : '';
if (!preg_match('/^[A-Z0-9]{6}$/', $code)) {
  http_response_code(400); echo json_encode(['error' => 'invalid_code']); exit;
}

$pdo = bonno_pdo();
$room = bonno_room_by_code($pdo, $code);
if ($room === null) {
  http_response_code(404); echo json_encode(['error' => 'room_not_found']); exit;
}

$status = bonno_room_effective_status($pdo, $room);

// ルーム開始からの単純累計(3.7: グローバルの直近窓のような移動窓は不要。少人数ゆえにノイズに強い)。
$stmt = $pdo->prepare('SELECT faction, SUM(cp) AS cp_sum FROM contributions WHERE room_id = ? GROUP BY faction');
$stmt->execute([$room['id']]);
$cp = ['kon' => 0.0, 'shu' => 0.0];
foreach ($stmt->fetchAll() as $r) {
  $f = (string)$r['faction'];
  if (isset($cp[$f])) $cp[$f] = (float)$r['cp_sum'];
}

$eps = 1e-6;
$sum = $cp['kon'] + $cp['shu'];
$balance = $sum > 0 ? max(-1.0, min(1.0, ($cp['shu'] - $cp['kon']) / ($sum + $eps))) : 0.0;

$participantCount = bonno_room_participant_count($pdo, (int)$room['id']);
$factionCounts = bonno_room_faction_counts($pdo, (int)$room['id']);

$winnerFaction = null;
if ($status === 'finished') {
  if ($cp['kon'] > $cp['shu']) $winnerFaction = 'kon';
  elseif ($cp['shu'] > $cp['kon']) $winnerFaction = 'shu';
  // 完全同点はnull(引き分け)のまま。
}

$remainingSeconds = max(0, strtotime((string)$room['ends_at']) - time());

echo json_encode([
  'code' => $code,
  'status' => $status,
  'maxPlayers' => (int)$room['max_players'],
  'participants' => $participantCount,
  'konCount' => $factionCounts['kon'],
  'shuCount' => $factionCounts['shu'],
  'konCP' => round($cp['kon'], 3),
  'shuCP' => round($cp['shu'], 3),
  'balance' => round($balance, 4),
  'label' => bonno_balance_label($balance),
  'startsAt' => $room['starts_at'],
  'endsAt' => $room['ends_at'],
  'remainingSeconds' => $remainingSeconds,
  'winnerFaction' => $winnerFaction,
], JSON_UNESCAPED_UNICODE);
