/**
 * 计算两个字符串的编辑距离 (Levenshtein Distance)
 * 并计算其相似度百分比，用于合并重复、类似和刷屏的通知提示消息
 * 
 * @param s1 第一个字符串
 * @param s2 第二个字符串
 * @returns 0.0 到 1.0 之间的相似度数值 (80% 相似度即 >= 0.8)
 */
export const calculateSimilarity = (s1: string, s2: string): number => {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);

  if (maxLen === 0) return 1.0;

  // 使用一维滚动数组优化编辑距离算法的空间复杂度到 O(N)
  const dp: number[] = Array.from({ length: len2 + 1 }, (_, i) => i);

  for (let i = 1; i <= len1; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= len2; j++) {
      const temp = dp[j];
      if (s1[i - 1] === s2[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = Math.min(dp[j - 1] + 1, dp[j] + 1, prev + 1);
      }
      prev = temp;
    }
  }

  const distance = dp[len2];
  return 1.0 - distance / maxLen;
};
