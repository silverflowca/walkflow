// ── Reverse geocoding via Nominatim (no API key required) ─────

interface NominatimResult {
  display_name: string
  address: {
    house_number?: string
    road?: string
    suburb?: string
    neighbourhood?: string
    city?: string
    town?: string
    village?: string
    state?: string
    country?: string
  }
}

// Simple LRU-style in-memory cache keyed by "lat,lng" truncated to 4dp
const cache = new Map<string, string>()

function cacheKey(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

/** Returns a short street address like "42 Main St" or "Main St, Downtown" */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = cacheKey(lat, lng)
  if (cache.has(key)) return cache.get(key)!

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'PrayerMap/1.0' },
    })
    if (!res.ok) throw new Error('geocode fetch failed')
    const data = await res.json() as NominatimResult
    const a = data.address
    const parts: string[] = []
    if (a.house_number && a.road) parts.push(`${a.house_number} ${a.road}`)
    else if (a.road) parts.push(a.road)
    const locality = a.suburb ?? a.neighbourhood ?? a.city ?? a.town ?? a.village ?? ''
    if (locality) parts.push(locality)
    const result = parts.join(', ') || data.display_name.split(',').slice(0, 2).join(',').trim()
    cache.set(key, result)
    return result
  } catch {
    const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    cache.set(key, fallback)
    return fallback
  }
}
