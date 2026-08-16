<?php
declare(strict_types=1);

// 進行中シーズンのIDを返す。無ければ月次シーズン(企画設計書 3.5: 隔週〜月次)を新規に開く。
function bonno_current_season_id(PDO $pdo): string {
  $stmt = $pdo->query("SELECT id FROM seasons WHERE ends_at IS NULL ORDER BY starts_at DESC LIMIT 1");
  $row = $stmt->fetch();
  if ($row) return (string)$row['id'];
  $id = date('Y-m');
  $ins = $pdo->prepare('INSERT IGNORE INTO seasons (id, starts_at) VALUES (?, NOW())');
  $ins->execute([$id]);
  return $id;
}
