import { useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getLiveStreamUrl, getVodStreamUrl, getSeriesStreamUrl } from '../api/xtreamApi'
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
        // Use original container — most servers don't support HLS for VOD
        return getVodStreamUrl(id, ext || 'mkv')
      case 'series':
        return getSeriesStreamUrl(id, ext || 'mkv')
      default:
        return ''
    }
  }, [type, id, ext])

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <Player src={streamUrl} type={type} onBack={() => navigate(-1)} />
    </div>
  )
}
