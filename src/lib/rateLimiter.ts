type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// ทำความสะอาด entries ที่หมดอายุแล้ว (ป้องกัน memory leak)
function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

setInterval(cleanup, 5 * 60 * 1000); // ทุก 5 นาที

/**
 * ตรวจสอบ rate limit
 * @param identifier - IP address หรือ key อื่นๆ
 * @param action - ชื่อ action เช่น "login", "forgot-password"
 * @param maxRequests - จำนวนครั้งสูงสุดที่อนุญาต
 * @param windowMs - ช่วงเวลา (milliseconds)
 * @returns { allowed, retryAfterSeconds }
 */
export function rateLimit(
  identifier: string,
  action: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const key = `${action}:${identifier}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // เริ่ม window ใหม่
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * ดึง IP จาก NextRequest (รองรับ proxy/load balancer)
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}
