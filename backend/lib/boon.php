<?php
declare(strict_types=1);

// 済度・誘惑(企画設計書 5.13 / 9.3 Step 3-6)の共通ロジック。

// グローバル48時間窓のbalance・陣営別CP・アクティブ人数(world-status.phpと共有する計算)。
// ルーム対戦は含めない(room_id IS NULL)。world-status.php側もこの関数を使い計算を一本化する。
function bonno_compute_global_stats(PDO $pdo, int $windowHours, float $winsorizePct): array {
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
    $cp[$f] = array_sum(bonno_winsorize_cp($rawCp[$f], $winsorizePct));
    $active[$f] = count($players[$f]);
  }

  $eps = 1e-6;
  $sum = $cp['kon'] + $cp['shu'];
  $balance = $sum > 0 ? max(-1.0, min(1.0, ($cp['shu'] - $cp['kon']) / ($sum + $eps))) : 0.0;

  return ['balance' => $balance, 'cp' => $cp, 'active' => $active];
}

// 指定陣営が現在「劣勢」(拮抗境界を超えて不利)かどうかを判定する。
// kon(仏教)が劣勢 <=> balanceが煩悩優勢側に閾値を超えて傾いている。shu(煩悩)が劣勢はその逆。
function bonno_is_underdog(string $targetFaction, float $balance, float $threshold): bool {
  return $targetFaction === 'kon' ? ($balance >= $threshold) : ($balance <= -$threshold);
}

// 指定陣営に現在有効な済度ボーナスの合計(capでクランプ)。期限切れは都度SELECTで除外する遅延評価。
function bonno_active_seido_bonus(PDO $pdo, string $faction, float $cap): float {
  $stmt = $pdo->prepare(
    "SELECT COALESCE(SUM(effect_value), 0) AS bonus FROM boon_events
     WHERE boon_type = 'seido' AND target_faction = ? AND expires_at > NOW()"
  );
  $stmt->execute([$faction]);
  $bonus = (float)$stmt->fetch()['bonus'];
  return min($cap, max(0.0, $bonus));
}

// 仏教陣営に現在有効な誘惑効果の最終失効時刻(UNIXミリ秒)。無ければnull。
function bonno_yuuwaku_expiry_ms(PDO $pdo): ?int {
  $stmt = $pdo->prepare(
    "SELECT MAX(expires_at) AS until FROM boon_events
     WHERE boon_type = 'yuuwaku' AND target_faction = 'kon' AND expires_at > NOW()"
  );
  $stmt->execute();
  $until = $stmt->fetch()['until'] ?? null;
  return $until === null ? null : strtotime((string)$until) * 1000;
}

// 済度・誘惑の発動を試みる。劣勢判定→INSERT→日次UNIQUE違反捕捉までを担う共通処理。
// 戻り値: ['ok'=>true,'expiresAt'=>string,'balanceAtCast'=>float] または ['ok'=>false,'error'=>string]
function bonno_cast_boon(
  PDO $pdo,
  string $boonType,
  string $actorPlayerId,
  string $actorFaction,
  string $targetFaction,
  float $effectValue,
  int $durationHours,
  int $windowHours,
  float $winsorizePct,
  float $underdogThreshold
): array {
  $stats = bonno_compute_global_stats($pdo, $windowHours, $winsorizePct);
  $balance = $stats['balance'];

  if (!bonno_is_underdog($targetFaction, $balance, $underdogThreshold)) {
    return ['ok' => false, 'error' => 'target_not_underdog'];
  }

  $now = new DateTimeImmutable('now');
  $expiresAt = $now->modify("+{$durationHours} hours")->format('Y-m-d H:i:s');

  try {
    $insert = $pdo->prepare(
      'INSERT INTO boon_events
         (boon_type, actor_player_id, actor_faction, target_faction, effect_value, balance_at_cast, cast_date, started_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $insert->execute([
      $boonType, $actorPlayerId, $actorFaction, $targetFaction, $effectValue, $balance,
      $now->format('Y-m-d'), $now->format('Y-m-d H:i:s'), $expiresAt,
    ]);
  } catch (PDOException $e) {
    // uniq_actor_type_day違反(MySQL SQLSTATE 23000)は「本日すでに発動済み」として扱う。
    if ((string)$e->getCode() === '23000') {
      return ['ok' => false, 'error' => 'rate_limited_daily'];
    }
    throw $e;
  }

  return ['ok' => true, 'expiresAt' => $expiresAt, 'balanceAtCast' => $balance];
}
