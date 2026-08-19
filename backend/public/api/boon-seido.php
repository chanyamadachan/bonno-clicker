<?php
declare(strict_types=1);
require __DIR__ . '/../../config.php';
require __DIR__ . '/../../lib/security.php';
require __DIR__ . '/../../lib/cp.php';
require __DIR__ . '/../../lib/boon.php';

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

if (!preg_match('/^[A-Za-z0-9_-]{8,64}$/', $playerId)) {
  http_response_code(400); echo json_encode(['error' => 'invalid_player_id']); exit;
}
// 済度は仏教陣営専用(5.13)。
if ($faction !== 'kon') {
  http_response_code(400); echo json_encode(['error' => 'invalid_faction']); exit;
}

$pdo = bonno_pdo();
$now = new DateTimeImmutable('now');
$nowStr = $now->format('Y-m-d H:i:s');

$upsertPlayer = $pdo->prepare(
  'INSERT INTO players (id, faction, created_at, last_seen_at) VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE faction = VALUES(faction), last_seen_at = VALUES(last_seen_at)'
);
$upsertPlayer->execute([$playerId, $faction, $nowStr, $nowStr]);

$result = bonno_cast_boon(
  $pdo, 'seido', $playerId, 'kon', 'shu',
  $SEIDO_BOOST_BONUS, $SEIDO_DURATION_HOURS,
  $CONTRIB_WINDOW_HOURS, $WINSORIZE_PCT, $BOON_UNDERDOG_THRESHOLD
);

if (!$result['ok']) {
  $status = $result['error'] === 'rate_limited_daily' ? 429 : 409;
  http_response_code($status);
  echo json_encode(['error' => $result['error']]);
  exit;
}

http_response_code(200);
echo json_encode([
  'ok' => true,
  'targetFaction' => 'shu',
  'effectValue' => $SEIDO_BOOST_BONUS,
  'durationHours' => $SEIDO_DURATION_HOURS,
  'expiresAt' => $result['expiresAt'],
  'balanceAtCast' => round($result['balanceAtCast'], 4),
], JSON_UNESCAPED_UNICODE);
