/**
 * 获取当前用户ID的工具函数
 * 从AuthContext获取，如果没有则fallback到默认值
 */
export function getUserId(user: { userId?: string } | null): number {
  if (user?.userId) {
    const parsed = parseInt(user.userId, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return 1; // Fallback值
}
