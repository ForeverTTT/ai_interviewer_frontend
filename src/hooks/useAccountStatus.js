import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import { authenticatedFetch } from '../lib/authenticatedFetch'

/**
 * 账号状态：能量值、求职状态、头像。
 * 顶栏（首页）和侧栏（站内）共用这一份逻辑，保证两处显示与写回完全一致：
 *   - 首次加载读 /api/profile，失败时退回直接读 profiles 表的 tokens；
 *   - 监听全局 `tokensChanged` 事件；
 *   - 通过 Supabase Realtime 跨标签页 / 跨设备同步能量值；
 *   - 切换求职状态时乐观更新并 PUT /api/profile。
 * 每个页面只挂载一次（Realtime 频道名唯一）。
 */
export function useAccountStatus(user) {
  const [jobStatus, setJobStatus] = useState('seeking')
  const [avatarId, setAvatarId] = useState(null)
  const [tokens, setTokens] = useState(0)

  useEffect(() => {
    if (!user) return

    const fetchStatus = async () => {
      let session = null
      const fetchOwnTokensDirectly = async () => {
        const userId = session?.user?.id || user.id
        const { data, error } = await supabase
          .from('profiles')
          .select('tokens')
          .eq('id', userId)
          .maybeSingle()
        if (!error && data?.tokens !== undefined) setTokens(data.tokens)
      }
      try {
        const sessionResult = await supabase.auth.getSession()
        session = sessionResult.data.session
        if (!session?.access_token) return

        const backendUrl = getBackendBaseUrl()
        const res = await authenticatedFetch(`${backendUrl}/api/profile`)
        if (res.ok) {
          const j = await res.json()
          if (j.jobSearchStatus !== undefined && j.jobSearchStatus !== null) {
            setJobStatus(j.jobSearchStatus)
          }
          if (j.avatarId) {
            setAvatarId(j.avatarId)
          }
          if (j.tokens !== undefined) {
            setTokens(j.tokens)
          }
          return
        }
        await fetchOwnTokensDirectly()
      } catch (err) {
        console.error('Failed to fetch job status', err)
        await fetchOwnTokensDirectly()
      }
    }

    const onTokensChanged = () => { void fetchStatus() }

    fetchStatus()
    window.addEventListener('tokensChanged', onTokensChanged)

    // Supabase Realtime: instantly reflect token changes from DB (cross-tab, cross-device)
    const channel = supabase
      .channel(`navbar-tokens-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new?.tokens !== undefined) {
            setTokens(payload.new.tokens)
          }
        }
      )
      .subscribe()

    return () => {
      window.removeEventListener('tokensChanged', onTokensChanged)
      supabase.removeChannel(channel)
    }
  }, [user])

  const toggleJobStatus = useCallback(async () => {
    const newStatus = jobStatus === 'seeking' ? 'hired' : 'seeking'
    setJobStatus(newStatus)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return

      const backendUrl = getBackendBaseUrl()
      await authenticatedFetch(`${backendUrl}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobSearchStatus: newStatus }),
      })
    } catch (err) {
      console.error('Failed to update job status', err)
    }
  }, [jobStatus])

  const avatarSrc = avatarId
    ? (avatarId.startsWith('data:') || avatarId.startsWith('http') ? avatarId : `/avatars/${avatarId}.png`)
    : null

  return { jobStatus, avatarId, avatarSrc, tokens, toggleJobStatus }
}
