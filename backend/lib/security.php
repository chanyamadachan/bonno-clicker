<?php
declare(strict_types=1);

// 書き込み系(POST /api/contribute)向け: Origin未送信・不一致は拒否する(8.3)。
function bonno_require_origin(array $allowedOrigins): void {
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if ($origin === '' || !in_array($origin, $allowedOrigins, true)) {
    http_response_code(403);
    echo json_encode(['error' => 'origin_not_allowed']);
    exit;
  }
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
}

// 読み取り系(GET /api/world-status)向け: 公開集計値なので同一オリジン以外からの閲覧もブロックしない。
function bonno_open_cors(array $allowedOrigins): void {
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
  }
}

function bonno_client_ip(): string {
  return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

// 理論上あり得ない巨大な申告を丸める、粗い上限チェック(4.5)。
function bonno_clamp_delta(float $delta): float {
  $maxPerReport = 1e13;
  if ($delta < 0 || !is_finite($delta)) return 0.0;
  return min($delta, $maxPerReport);
}

// プレイヤー単位のDBベースのレート制限(8.3: 共有レンタルサーバでインメモリストアが使えない前提)。
// 直近 windowSeconds 以内の送信回数が maxCount を超えたら false を返す。
function bonno_rate_limit_check(PDO $pdo, string $playerId, int $windowSeconds, int $maxCount): bool {
  $pdo->beginTransaction();
  try {
    $stmt = $pdo->prepare('SELECT window_start, count FROM rate_limits WHERE player_id = ? FOR UPDATE');
    $stmt->execute([$playerId]);
    $row = $stmt->fetch();
    $now = new DateTimeImmutable('now');

    if ($row === false) {
      $ins = $pdo->prepare('INSERT INTO rate_limits (player_id, window_start, count) VALUES (?, ?, 1)');
      $ins->execute([$playerId, $now->format('Y-m-d H:i:s')]);
      $pdo->commit();
      return true;
    }

    $windowStart = new DateTimeImmutable((string)$row['window_start']);
    if ($now->getTimestamp() - $windowStart->getTimestamp() > $windowSeconds) {
      $upd = $pdo->prepare('UPDATE rate_limits SET window_start = ?, count = 1 WHERE player_id = ?');
      $upd->execute([$now->format('Y-m-d H:i:s'), $playerId]);
      $pdo->commit();
      return true;
    }

    if ((int)$row['count'] >= $maxCount) {
      $pdo->commit();
      return false;
    }

    $upd = $pdo->prepare('UPDATE rate_limits SET count = count + 1 WHERE player_id = ?');
    $upd->execute([$playerId]);
    $pdo->commit();
    return true;
  } catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
  }
}
