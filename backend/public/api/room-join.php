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
// 2人ルームはサーバー側で相手の逆陣営を自動決定するため、factionはnull/未指定でよい
// (3.7 改善案: 参加者が陣営を自由選択すると同じ陣営に被って入れてしまうため)。
$factionRaw = array_key_exists('faction', $body) && $body['faction'] !== null ? (string)$body['faction'] : null;

if (!preg_match('/^[A-Za-z0-9_-]{8,64}$/', $playerId)) {
  http_response_code(400); echo json_encode(['error' => 'invalid_player_id']); exit;
}
if ($factionRaw !== null && !in_array($factionRaw, ['kon', 'shu'], true)) {
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

$maxPlayers = (int)$room['max_players'];
$now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');

$pdo->beginTransaction();
try {
  // 同時参加時の陣営偏り/定員超過を避けるため、参加者一覧を行ロックしてから人数・陣営を確定する。
  $stmt = $pdo->prepare('SELECT player_id, faction FROM room_players WHERE room_id = ? FOR UPDATE');
  $stmt->execute([$room['id']]);
  $members = $stmt->fetchAll();

  $alreadyIn = null;
  $counts = ['kon' => 0, 'shu' => 0];
  foreach ($members as $m) {
    if ($m['player_id'] === $playerId) $alreadyIn = $m;
    if (isset($counts[$m['faction']])) $counts[$m['faction']]++;
  }

  if ($maxPlayers === 2) {
    if ($alreadyIn !== null) {
      $faction = (string)$alreadyIn['faction']; // 再参加(リロード等)は既存陣営を維持する。
    } elseif (count($members) > 0) {
      $faction = $members[0]['faction'] === 'kon' ? 'shu' : 'kon';
    } else {
      $faction = random_int(0, 1) === 0 ? 'kon' : 'shu';
    }
  } else {
    if ($factionRaw === null) {
      $pdo->rollBack();
      http_response_code(400); echo json_encode(['error' => 'invalid_faction']); exit;
    }
    $faction = $factionRaw;
    $cap = intdiv($maxPlayers, 2);
    $needsSlot = $alreadyIn === null || $alreadyIn['faction'] !== $faction;
    if ($needsSlot && $counts[$faction] >= $cap) {
      $pdo->rollBack();
      http_response_code(400); echo json_encode(['error' => 'faction_full']); exit;
    }
  }

  if ($alreadyIn === null) {
    if (count($members) >= $maxPlayers) {
      $pdo->rollBack();
      http_response_code(400); echo json_encode(['error' => 'room_full']); exit;
    }
    $insert = $pdo->prepare('INSERT INTO room_players (room_id, player_id, faction, joined_at) VALUES (?, ?, ?, ?)');
    $insert->execute([$room['id'], $playerId, $faction, $now]);
  } else {
    $update = $pdo->prepare('UPDATE room_players SET faction = ? WHERE room_id = ? AND player_id = ?');
    $update->execute([$faction, $room['id'], $playerId]);
  }

  $upsertPlayer = $pdo->prepare(
    'INSERT INTO players (id, faction, created_at, last_seen_at) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE faction = VALUES(faction), last_seen_at = VALUES(last_seen_at)'
  );
  $upsertPlayer->execute([$playerId, $faction, $now, $now]);

  // 2人目以降の参加でwaiting→activeへ遷移させる。
  if ($status === 'waiting') {
    $pdo->prepare("UPDATE rooms SET status = 'active' WHERE id = ?")->execute([$room['id']]);
  }

  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  throw $e;
}

http_response_code(200);
echo json_encode([
  'code' => $code,
  'maxPlayers' => $maxPlayers,
  'endsAt' => $room['ends_at'],
  'faction' => $faction,
], JSON_UNESCAPED_UNICODE);
