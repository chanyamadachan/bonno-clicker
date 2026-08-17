<?php
declare(strict_types=1);

// 招待コード生成(企画設計書 3.7)。誤読しやすい 0/O/1/I を除いた英大文字+数字6桁。
function bonno_generate_room_code(): string {
  $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  $code = '';
  for ($i = 0; $i < 6; $i++) {
    $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
  }
  return $code;
}

// codeからroom行を取得する。見つからなければnull。
function bonno_room_by_code(PDO $pdo, string $code): ?array {
  $stmt = $pdo->prepare('SELECT * FROM rooms WHERE code = ?');
  $stmt->execute([$code]);
  $row = $stmt->fetch();
  return $row === false ? null : $row;
}

// 終了時刻(ends_at)を過ぎていれば'finished'として扱う遅延判定(専用cronは持たない、9.3 Step 3-2)。
// DB上のstatusがまだ追いついていなければ、この呼び出しの副作用として更新しておく。
function bonno_room_effective_status(PDO $pdo, array $room): string {
  if ($room['status'] === 'finished') return 'finished';
  if ($room['ends_at'] !== null && strtotime((string)$room['ends_at']) <= time()) {
    $upd = $pdo->prepare("UPDATE rooms SET status = 'finished' WHERE id = ?");
    $upd->execute([$room['id']]);
    return 'finished';
  }
  return (string)$room['status'];
}

function bonno_room_participant_count(PDO $pdo, int $roomId): int {
  $stmt = $pdo->prepare('SELECT COUNT(*) AS n FROM room_players WHERE room_id = ?');
  $stmt->execute([$roomId]);
  return (int)$stmt->fetch()['n'];
}
