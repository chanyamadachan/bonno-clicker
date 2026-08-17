<?php
declare(strict_types=1);

// CP = log10(deltaResource + 1) × k (企画設計書 3.2)
function bonno_compute_cp(float $delta, float $k): float {
  if ($delta <= 0) return 0.0;
  return log10($delta + 1) * $k;
}

// boost = clamp( sqrt(totalActive / (2*factionActive)), 1.0, 2.0 ) (企画設計書 3.4)
function bonno_compute_boost(int $totalActive, int $factionActive): float {
  if ($factionActive <= 0) return 2.0;
  $b = sqrt($totalActive / (2 * $factionActive));
  return max(1.0, min(2.0, $b));
}

// -1(涅槃寂静)〜+1(煩悩まみれ)の5段階ラベル(企画設計書 3.3)
function bonno_balance_label(float $balance): string {
  if ($balance <= -0.6) return '涅槃寂静';
  if ($balance <= -0.2) return '平穏';
  if ($balance <= 0.2) return '拮抗';
  if ($balance <= 0.6) return '煩悩渦巻く';
  return '煩悩まみれ';
}

// 陣営ごとの直近アクティブ人数(players.last_seen_atベースの軽量カウント、企画設計書 0.3-B)。
function bonno_active_player_counts(PDO $pdo, int $windowHours): array {
  $stmt = $pdo->prepare(
    'SELECT faction, COUNT(*) AS n FROM players WHERE last_seen_at >= (NOW() - INTERVAL ? HOUR) GROUP BY faction'
  );
  $stmt->execute([$windowHours]);
  $active = ['kon' => 0, 'shu' => 0];
  foreach ($stmt->fetchAll() as $r) {
    $f = (string)$r['faction'];
    if (isset($active[$f])) $active[$f] = (int)$r['n'];
  }
  return $active;
}

// 単発cpのうち上位pctを、その分位点の値にクリップしてから返す(外れ値のロバスト統計、企画設計書 0.1-2)。
// サンプルが少なすぎる時は分位点が不安定になるため素通しする。既定値はconfig.phpの$WINSORIZE_PCTを使う。
function bonno_winsorize_cp(array $cpValues, float $pct = 0.05): array {
  $n = count($cpValues);
  if ($n < 20) return $cpValues;
  sort($cpValues);
  $cutIdx = min($n - 1, (int)floor($n * (1 - $pct)));
  $threshold = $cpValues[$cutIdx];
  return array_map(fn($v) => min($v, $threshold), $cpValues);
}
