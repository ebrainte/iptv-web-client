import { useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getLiveStreamUrl, getVodStreamUrl, getSeriesStreamUrl } from '../api/xtreamApi'
import Player from '../components/Player'

export default function PlayerPage() {
  const { type, id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const ext = location.state?.ext

  const { hlsUrl, fallbackUrl } = useMemo(() => {
    const getUrl = type === 'live' ? getLiveStreamUrl : type === 'vod' ? getVodStreamUrl : getSeriesStreamUrl
    if (type === 'live') {
      // Live is always HLS, no fallback needed
      return { hlsUrl: getUrl(id, 'm3u8'), fallbackUrl: null }
    }
    // VOD/Series: try m3u8 first, fall back to original extension
    return {
      hlsUrl: getUrl(id, 'm3u8'),
      fallbackUrl: getUrl(id, ext || 'mkv'),
    }
  }, [type, id, ext])

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <Player src={hlsUrl} fallbackSrc={fallbackUrl} onBack={() => navigate(-1)} />
    </div>
  )
}
