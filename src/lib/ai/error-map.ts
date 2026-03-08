export function humanizeAiError(error: unknown): string {
  if (error instanceof Error) {
    if (/does not support synchronous calls/i.test(error.message)) {
      return "Akun image model kamu hanya mendukung async. Aktifkan WAN_USE_ASYNC=true.";
    }
    if (/401|403/.test(error.message)) {
      return "Autentikasi API model gagal. Cek key sesuai region (WAN_API_KEY/QWEN_API_KEY).";
    }
    if (/404/.test(error.message)) {
      return "Endpoint model image tidak ditemukan (404). Cek WAN_BASE_URL/WAN endpoint atau QWEN image endpoint.";
    }
    if (/429/.test(error.message)) {
      return "Quota/rate limit model tercapai. Coba ulangi beberapa saat lagi.";
    }
    if (/task\s+(FAILED|CANCELED|UNKNOWN)/i.test(error.message)) {
      return "Task image generation gagal di provider. Coba ulangi, atau ganti region/model image.";
    }
    if (/timeout/i.test(error.message)) {
      return "Permintaan ke model timeout. Coba ulangi.";
    }
    return error.message;
  }
  return "Unknown AI error";
}
