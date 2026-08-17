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
$code = isset($body['code']) ? strtoupper(trim((string)$body['code'])) : '';
$faction = isset($body['faction']) ? (string)$body['faction'] : '';

if (!preg_match('/^[A-Za-z0-9_-]{8,64}$/', $playerId)) {
  http_response_code(400); echo json_encode(['error' => 'invalid_player_id']); exit;
}
if (!in_array($faction, ['kon', 'shu'], true)) {
  http_response_code(400); echo json_encode(['error' => 'invalid_faction']); exit;
}
if (!preg_match('/^[A-Z0-9]{6}$/', $code)) {
  http_response_code(400); echo json_encode(['error' => 'invalid_code']); exit;
}

$pdo = bonno_pdo();
$room = bonno_room_by_code($pdo, $code);
if ($room === null) {
  http_response_code(404); echo json_encode(['error' => 'room_not_found']); exit;
}

$status = bonno_room_effective_status($pdo, $room);
if ($status === 'finished') {
  http_response_code(410); echo json_encode(['error' => 'room_finished']); exit;
}

$now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');

$upsertPlayer = $pdo->prepare(
  'INSERT INTO players (id, faction, created_at, last_seen_at) VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE faction = VALUES(faction), last_seen_at = VALUES(last_seen_at)'
);
$upsertPlayer->execute([$playerId, $faction, $now, $now]);

$existing = $pdo->prepare('SELECT 1 FROM room_players WHERE room_id = ? AND player_id = ?');
$existing->execute([$room['id'], $playerId]);
$alreadyIn = (bool)$existing->fetchColumn();

if (!$alreadyIn) {
  $count = bonno_room_participant_count($pdo, (int)$room['id']);
  if ($count >= (int)$room['max_players']) {
    http_response_code(400); echo json_encode(['error' => 'room_full']); exit;
  }
  $insert = $pdo->prepare('INSERT INTO room_players (room_id, player_id, faction, joined_at) VALUES (?, ?, ?, ?)');
  $insert->execute([$room['id'], $playerId, $faction, $now]);
} else {
  // 再参加(リロード等)は陣営の変更を許容する。
  $update = $pdo->prepare('UPDATE room_players SET faction = ? WHERE room_id = ? AND player_id = ?');
  $update->execute([$faction, $room['id'], $playerId]);
}

// 2人目以降の参加でwaiting→activeへ遷移させる。
if ($status === 'waiting') {
  $pdo->prepare("UPDATE rooms SET status = 'active' WHERE id = ?")->execute([$room['id']]);
}

http_response_code(200);
echo json_encode([
  'code' => $code,
  'maxPlayers' => (int)$room['max_players'],
  'endsAt' => $room['ends_at'],
  'faction' => $faction,
], JSON_UNESCAPED_UNICODE);
