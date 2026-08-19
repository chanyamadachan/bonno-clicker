<?php
declare(strict_types=1);
require __DIR__ . '/../../config.php';
require __DIR__ . '/../../lib/security.php';
require __DIR__ . '/../../lib/cp.php';
require __DIR__ . '/../../lib/season.php';
require __DIR__ . '/../../lib/boon.php';

header('Content-Type: application/json; charset=utf-8');
bonno_open_cors($ALLOWED_ORIGINS);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
  http_response_code(405);
  echo json_encode(['error' => 'method_not_allowed']);
  exit;
}

$pdo = bonno_pdo();
$windowHours = $CONTRIB_WINDOW_HOURS; // 直近窓の幅(企画設計書 3.3、config.phpで一元管理)
$seasonId = bonno_current_season_id($pdo);

// グローバル集計のみ対象(room_id指定のルーム対戦は含めない)。常にサーバー時刻基準で窓を切る。
// プレイヤーに直接見える天秤の値なので、単発の異常送信が振り切れないようwinsorizeしてから合算する(0.1-2)。
// boon.phpのbonno_compute_global_stats()に切り出し済み(9.3 Step 3-6、boon-seido/yuuwaku.phpの劣勢判定と計算を共有する)。
$stats = bonno_compute_global_stats($pdo, $windowHours, $WINSORIZE_PCT);
$cp = $stats['cp'];
$active = $stats['active'];
$balance = $stats['balance'];

$totalActive = $active['kon'] + $active['shu'];
// 少数派救済(3.4)に、済度による一時ボーナス(5.13)を合成した最終値。boost.*はこれが最終値であり、
// フロント(js/ui/world.js)は無改修でそのまま使う(0.3-Bのboost適用パイプラインをそのまま延長)。
$boost = [
  'kon' => bonno_compute_boost($totalActive, $active['kon']) + bonno_active_seido_bonus($pdo, 'kon', $SEIDO_BOOST_BONUS_CAP),
  'shu' => bonno_compute_boost($totalActive, $active['shu']) + bonno_active_seido_bonus($pdo, 'shu', $SEIDO_BOOST_BONUS_CAP),
];
$boons = [
  'seidoBonus' => [
    'kon' => round(bonno_active_seido_bonus($pdo, 'kon', $SEIDO_BOOST_BONUS_CAP), 4),
    'shu' => round(bonno_active_seido_bonus($pdo, 'shu', $SEIDO_BOOST_BONUS_CAP), 4),
  ],
  'yuuwakuUntilKon' => bonno_yuuwaku_expiry_ms($pdo),
];

echo json_encode([
  'seasonId' => $seasonId,
  'balance' => round($balance, 4),
  'label' => bonno_balance_label($balance),
  'konCP' => round($cp['kon'], 3),
  'shuCP' => round($cp['shu'], 3),
  'windowHours' => $windowHours,
  'activePlayers' => $active,
  'boost' => $boost,
  'boons' => $boons,
  'updatedAt' => time(),
], JSON_UNESCAPED_UNICODE);
