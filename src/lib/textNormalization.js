/**
 * 中文语音识别有时按 token 返回「你 好，我 是」这类文本。
 * 只清理 CJK 字符与中文标点之间的异常横向空格；英文单词、数字、换行不动。
 */
export function normalizeCjkSpacing(value) {
  const text = String(value ?? '')
  if (!text) return text

  const cjk = '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}'
  return text
    .replace(new RegExp(`([${cjk}])[ \\t]+(?=[${cjk}])`, 'gu'), '$1')
    .replace(new RegExp(`([${cjk}])[ \\t]+([，。！？；：、,.!?;:）》】”’])`, 'gu'), '$1$2')
    .replace(new RegExp(`([（《【“‘])[ \\t]+(?=[${cjk}])`, 'gu'), '$1')
    .replace(new RegExp(`([，。！？；：、,.!?;:])[ \\t]+(?=[${cjk}])`, 'gu'), '$1')
}
