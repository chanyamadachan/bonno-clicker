<?php
declare(strict_types=1);

// 天秤急変時などに開発者へ通知するための軽量Webhook送信(企画設計書 0.1-2)。
// Discord({"content":...})・Slack({"text":...})の両方が拾えるよう両キーを含めて送る。
// 失敗しても集計バッチ自体は止めない(通知はベストエフォート)。
function bonno_send_alert_webhook(string $webhookUrl, string $message): void {
  $payload = json_encode(['content' => $message, 'text' => $message], JSON_UNESCAPED_UNICODE);
  $ctx = stream_context_create([
    'http' => [
      'method' => 'POST',
      'header' => "Content-Type: application/json\r\n",
      'content' => $payload,
      'timeout' => 5,
      'ignore_errors' => true,
    ],
  ]);
  try {
    @file_get_contents($webhookUrl, false, $ctx);
  } catch (Throwable $e) {
    // 通知の失敗はログに残す価値が薄い(cronの標準出力ログで十分追える)ため握りつぶす。
  }
}
