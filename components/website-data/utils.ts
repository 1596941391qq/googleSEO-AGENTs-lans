/**
 * 获取当前用户ID的工具函数
 * 从AuthContext获取，如果没有则fallback到默认值
 */
export function getUserId(user: { userId?: string } | null): string {
  if (user?.userId) {
    return user.userId;
  }
  return "1"; // Fallback值 (测试用)
}
