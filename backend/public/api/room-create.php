<?php
declare(strict_types=1);
require __DIR__ . '/../../config.php';
require __DIR__ . '/../../lib/security.php';
require __DIR__ . '/../../lib/room.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
  bonno_require_origin($ALLOWED_ORIGINS);
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  http_response_code(204);
  exit;
}

bonno_require_origin($ALLOWED_ORIGINS);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'method_not_allowed']);
  exit;
}

$body = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($body)) {
  http_response_code(400); echo json_encode(['error' => 'invalid_json']); exit;
}

$playerId = isset($body['playerId']) ? (string)$body['playerId'] : '';
$faction = isset($body['faction']) ? (string)$body['faction'] : '';
$maxPlayers = isset($body['maxPlayers']) ? (int)$body['maxPlayers'] : 2;
$durationMinutes = isset($body['durationMinutes']) ? (int)$body['durationMinutes'] : 1440;

if (!preg_match('/^[A-Za-z0-9_-]{8,64}$/', $playerId)) {
  http_response_code(400); echo json_encode(['error' => 'invalid_player_id']); exit;
}
if (!in_array($faction, ['kon', 'shu'], true)) {
  http_response_code(400); echo json_encode(['error' => 'invalid_faction']); exit;
}
if ($maxPlayers < 2 || $maxPlayers > 8) {
  http_response_code(400); echo json_encode(['error' => 'invalid_max_players']); exit;
}
// 15分スプリント/24時間の短期決戦/1週間のロング戦、の3プリセットのみ許可する(企画設計書 3.7)。
if (!in_array($durationMinutes, [15, 1440, 10080], true)) {
  http_response_code(400); echo json_encode(['error' => 'invalid_duration']); exit;
}

$pdo = bonno_pdo();
$now = new DateTimeImmutable('now');
$nowStr = $now->format('Y-m-d H:i:s');

$upsertPlayer = $pdo->prepare(
  'INSERT INTO players (id, faction, created_at, last_seen_at) VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE faction = VALUES(faction), last_seen_at = VALUES(last_seen_at)'
);
$upsertPlayer->execute([$playerId, $faction, $nowStr, $nowStr]);

// 招待コードの衝突は33^6通りの空間ではほぼ起きないが、念のため数回だけリトライする。
$code = null;
for ($i = 0; $i < 5; $i++) {
  $candidate = bonno_generate_room_code();
  if (bonno_room_by_code($pdo, $candidate) === null) { $code = $candidate; break; }
}
if ($code === null) {
  http_response_code(500); echo json_encode(['error' => 'code_generation_failed']); exit;
}

$endsAt = $now->modify("+{$durationMinutes} minutes")->format('Y-m-d H:i:s');

$insertRoom = $pdo->prepare(
  'INSERT INTO rooms (code, host_player_id, max_players, starts_at, ends_at, status) VALUES (?, ?, ?, ?, ?, "waiting")'
);
$insertRoom->execute([$code, $playerId, $maxPlayers, $nowStr, $endsAt]);
$roomId = (int)$pdo->lastInsertId();

$insertMember = $pdo->prepare(
  'INSERT INTO room_players (room_id, player_id, faction, joined_at) VALUES (?, ?, ?, ?)'
);
$insertMember->execute([$roomId, $playerId, $faction, $nowStr]);

http_response_code(201);
echo json_encode([
  'code' => $code,
  'maxPlayers' => $maxPlayers,
  'durationMinutes' => $durationMinutes,
  'endsAt' => $endsAt,
], JSON_UNESCAPED_UNICODE);
