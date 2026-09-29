import { useEffect, useState } from 'react'

/** 订阅一条媒体查询；首帧同步读取，避免桌面 / 移动两套视觉同时挂载 */
export function useMediaQuery(query) {
  const get = () => {
    try {
      return window.matchMedia(query).matches
    } catch {
      return false
    }
  }
  const [matches, setMatches] = useState(get)

  useEffect(() => {
    let mql
    try {
      mql = window.matchMedia(query)
    } catch {
      return undefined
    }
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [query])

  return matches
}
