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
