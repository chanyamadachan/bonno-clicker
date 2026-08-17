<?php
declare(strict_types=1);
require __DIR__ . '/../../config.php';
require __DIR__ . '/../../lib/security.php';
require __DIR__ . '/../../lib/cp.php';
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
  http_response_code(400);
  echo json_encode(['error' => 'invalid_json']);
  exit;
}

$playerId = isset($body['playerId']) ? (string)$body['playerId'] : '';
$faction = isset($body['faction']) ? (string)$body['faction'] : '';
$delta = isset($body['delta']) ? (float)$body['delta'] : -1.0;
$clientTs = isset($body['clientTs']) ? (int)$body['clientTs'] : null;
// ルーム対戦中(3.7)の任意フィールド。未参加・未指定なら従来どおりグローバルのみに計上する。
$roomCodeRaw = isset($body['roomCode']) ? strtoupper(trim((string)$body['roomCode'])) : '';

if (!preg_match('/^[A-Za-z0-9_-]{8,64}$/', $playerId)) {
  http_response_code(400); echo json_encode(['error' => 'invalid_player_id']); exit;
}
if (!in_array($faction, ['kon', 'shu'], true)) {
  http_response_code(400); echo json_encode(['error' => 'invalid_faction']); exit;
}
if ($delta < 0 || !is_finite($delta)) {
  http_response_code(400); echo json_encode(['error' => 'invalid_delta']); exit;
}

$pdo = bonno_pdo();

// 直近60秒に20回を超える送信は拒否(フロント側は3〜5分間隔想定のため十分な余裕を持たせた値)。
if (!bonno_rate_limit_check($pdo, $playerId, 60, 20)) {
  http_response_code(429);
  echo json_encode(['error' => 'rate_limited']);
  exit;
}

$delta = bonno_clamp_delta($delta);

// ルームコードが指定されていれば、参加資格を検証してroom_idを解決する。
// 無効・終了済み・未参加などの理由で解決できなくても、グローバルへの報告自体は失敗させない
// (ルームの状態変化がその場のプレイをブロックしない設計、4.2の失敗時ベストエフォート方針を踏襲)。
$roomId = null;
$roomError = null;
if ($roomCodeRaw !== '') {
  if (!preg_match('/^[A-Z0-9]{6}$/', $roomCodeRaw)) {
    $roomError = 'invalid_room_code';
  } else {
    $roomRow = bonno_room_by_code($pdo, $roomCodeRaw);
    if ($roomRow === null) {
      $roomError = 'room_not_found';
    } elseif (bonno_room_effective_status($pdo, $roomRow) === 'finished') {
      $roomError = 'room_finished';
    } else {
      $memberStmt = $pdo->prepare('SELECT 1 FROM room_players WHERE room_id = ? AND player_id = ?');
      $memberStmt->execute([$roomRow['id'], $playerId]);
      if ($memberStmt->fetchColumn()) {
        $roomId = (int)$roomRow['id'];
      } else {
        $roomError = 'not_room_member';
      }
    }
  }
}

// 直近窓の判定・集計は常にサーバー受信時刻(reported_at)を正とする。clientTsは参考値として保存するのみ(8.3)。
$now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');

$upsertPlayer = $pdo->prepare(
  'INSERT INTO players (id, faction, created_at, last_seen_at) VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE faction = VALUES(faction), last_seen_at = VALUES(last_seen_at)'
);
$upsertPlayer->execute([$playerId, $faction, $now, $now]);

// 少数派救済ブースト(3.4)を送信時点の陣営人口比から算出し、CPに実際に反映する(0.3-B)。
$active = bonno_active_player_counts($pdo, $CONTRIB_WINDOW_HOURS);
$totalActive = $active['kon'] + $active['shu'];
$boost = bonno_compute_boost($totalActive, $active[$faction] ?? 0);
$cp = bonno_compute_cp($delta, $CP_K) * $boost;

$insert = $pdo->prepare(
  'INSERT INTO contributions (player_id, faction, raw_delta, cp, room_id, client_ts, reported_at, ip_hash)
   VALUES (?, ?, ?, ?, NULL, ?, ?, ?)'
);
$insert->execute([$playerId, $faction, $delta, $cp, $clientTs, $now, hash('sha256', bonno_client_ip())]);

// ルーム参加中は同じ増分をルーム側にも計上する(グローバルとルームは独立した別レイヤーとして両立させる、3.7)。
// ルームは母数の少ない閉じた対戦のため、グローバル人口比のboost(3.4)は掛けず素のCPのみを積む。
$roomCp = null;
if ($roomId !== null) {
  $roomCp = bonno_compute_cp($delta, $CP_K);
  $insertRoom = $pdo->prepare(
    'INSERT INTO contributions (player_id, faction, raw_delta, cp, room_id, client_ts, reported_at, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  $insertRoom->execute([$playerId, $faction, $delta, $roomCp, $roomId, $clientTs, $now, hash('sha256', bonno_client_ip())]);
}

http_response_code(202);
echo json_encode(['ok' => true, 'cp' => $cp, 'boost' => $boost, 'roomCp' => $roomCp, 'roomError' => $roomError]);
