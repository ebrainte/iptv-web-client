import { useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getLiveStreamUrl, getLiveStreamUrlProxied, getVodStreamUrl, getSeriesStreamUrl } from '../api/xtreamApi'
import Player from '../components/Player'

export default function PlayerPage() {
  const { type, id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const ext = location.state?.ext

  const streamUrl = useMemo(() => {
    switch (type) {
      case 'live':
        return getLiveStreamUrl(id, 'm3u8')
      case 'vod':
        return getVodStreamUrl(id, ext || 'mkv')
      case 'series':
        return getSeriesStreamUrl(id, ext || 'mkv')
      default:
        return ''
    }
  }, [type, id, ext])

  // Proxied fallback URL for live TV (used when direct fails due to CORS)
  const proxiedUrl = useMemo(() => {
    if (type === 'live') return getLiveStreamUrlProxied(id, 'm3u8')
    return null
  }, [type, id])

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <Player src={streamUrl} proxiedSrc={proxiedUrl} type={type} onBack={() => navigate(-1)} />
    </div>
  )
}
