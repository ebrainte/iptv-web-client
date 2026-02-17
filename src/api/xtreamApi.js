import useAuthStore from '../store/useAuthStore'

function getBaseUrl() {
  const { server, username, password } = useAuthStore.getState()
  return `${server}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
}

async function apiCall(action, params = {}) {
  let url = getBaseUrl()
  if (action) url += `&action=${action}`
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null) url += `&${key}=${encodeURIComponent(val)}`
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function authenticate(server, username, password) {
  const url = `${server}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Authentication failed')
  const data = await res.json()
  if (data.user_info?.auth === 0) throw new Error('Invalid credentials')
  return data
}

// Live TV
export const getLiveCategories = () => apiCall('get_live_categories')
export const getLiveStreams = (categoryId) =>
  apiCall('get_live_streams', categoryId ? { category_id: categoryId } : {})

// VOD
export const getVodCategories = () => apiCall('get_vod_categories')
export const getVodStreams = (categoryId) =>
  apiCall('get_vod_streams', categoryId ? { category_id: categoryId } : {})
export const getVodInfo = (vodId) => apiCall('get_vod_info', { vod_id: vodId })

// Series
export const getSeriesCategories = () => apiCall('get_series_categories')
export const getSeries = (categoryId) =>
  apiCall('get_series', categoryId ? { category_id: categoryId } : {})
export const getSeriesInfo = (seriesId) =>
  apiCall('get_series_info', { series_id: seriesId })

// EPG
export const getShortEpg = (streamId, limit) =>
  apiCall('get_short_epg', { stream_id: streamId, ...(limit ? { limit } : {}) })
export const getFullEpg = (streamId) =>
  apiCall('get_simple_data_table', { stream_id: streamId })

// Stream URLs - direct to server
export function getLiveStreamUrl(streamId, extension) {
  const { server, username, password } = useAuthStore.getState()
  const ext = extension || 'm3u8'
  return `${server}/live/${username}/${password}/${streamId}.${ext}`
}

export function getVodStreamUrl(streamId, extension) {
  const { server, username, password } = useAuthStore.getState()
  const ext = extension || 'mkv'
  return `${server}/movie/${username}/${password}/${streamId}.${ext}`
}

export function getSeriesStreamUrl(streamId, extension) {
  const { server, username, password } = useAuthStore.getState()
  const ext = extension || 'mkv'
  return `${server}/series/${username}/${password}/${streamId}.${ext}`
}
