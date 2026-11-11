import { NextRequest, NextResponse } from 'next/server'

// Convert Instagram shortcode to media_id (base64 alphabet decode)
function shortcodeToMediaId(shortcode: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  let id = BigInt(0)
  for (let i = 0; i < shortcode.length; i++) {
    const char = shortcode[i]
    const index = BigInt(alphabet.indexOf(char))
    id = id * BigInt(64) + index
  }
  return id.toString()
}

// Extract comments from Instagram's embedded page HTML (window._sharedData / additional_data)
function extractCommentsFromHtml(html: string): any[] {
  const comments: any[] = []

  // Try extracting from window._sharedData
  const sharedDataMatch = html.match(/window\._sharedData\s*=\s*(\{[\s\S]+?\});<\/script>/)
  if (sharedDataMatch) {
    try {
      const sharedData = JSON.parse(sharedDataMatch[1])
      const media = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media
      const edges = media?.edge_media_to_parent_comment?.edges || media?.edge_media_to_comment?.edges || []
      for (const edge of edges) {
        if (edge?.node) {
          comments.push({
            id: edge.node.id,
            username: edge.node.owner?.username || 'unknown',
            avatarUrl: edge.node.owner?.profile_pic_url || '',
            text: edge.node.text || '',
            timestamp: 'Canlı Yorum'
          })
        }
      }
    } catch (_) { /* parse error, continue to next strategy */ }
  }

  // Try extracting from __additionalDataLoaded
  if (comments.length === 0) {
    const additionalMatch = html.match(/__additionalDataLoaded\s*\(\s*['"][^'"]+['"]\s*,\s*(\{[\s\S]+?\})\s*\)/)
    if (additionalMatch) {
      try {
        const additionalData = JSON.parse(additionalMatch[1])
        const media = additionalData?.graphql?.shortcode_media || additionalData?.items?.[0]
        const edges = media?.edge_media_to_parent_comment?.edges || media?.edge_media_to_comment?.edges || []
        for (const edge of edges) {
          if (edge?.node) {
            comments.push({
              id: edge.node.id,
              username: edge.node.owner?.username || 'unknown',
              avatarUrl: edge.node.owner?.profile_pic_url || '',
              text: edge.node.text || '',
              timestamp: 'Canlı Yorum'
            })
          }
        }
      } catch (_) { /* parse error, continue */ }
    }
  }

  // Try extracting from require("ServerJS").handleWithCustomApplyEach (newer IG format)
  if (comments.length === 0) {
    const commentBlockRegex = /"text"\s*:\s*"([^"]+)"\s*,[\s\S]*?"username"\s*:\s*"([^"]+)"/g
    let match
    while ((match = commentBlockRegex.exec(html)) !== null) {
      comments.push({
        id: `html_${comments.length}`,
        username: match[2],
        avatarUrl: '',
        text: match[1],
        timestamp: 'Canlı Yorum'
      })
    }
  }

  return comments
}

// Cached at the CDN so repeated or bot hits never re-run the Instagram scraping function.
const CACHE_OK = 'public, s-maxage=300, stale-while-revalidate=3600'
const CACHE_MISS = 'public, s-maxage=60, stale-while-revalidate=300'

export async function GET(req: NextRequest) {
  const res = await handleGet(req)
  const body = await res.clone().json().catch(() => null)
  res.headers.set('Cache-Control', res.status === 200 && body?.success ? CACHE_OK : CACHE_MISS)
  return res
}

async function handleGet(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const postUrl = searchParams.get('url')

  if (!postUrl) {
    return NextResponse.json({ error: 'URL parametresi gerekli' }, { status: 400 })
  }

  try {
    // Extract shortcode from post URL (e.g., https://www.instagram.com/p/Dc_yanHNI3x/)
    const match = postUrl.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/)
    const shortcode = match ? match[1] : null

    if (!shortcode) {
      return NextResponse.json({ error: 'Geçersiz Instagram Gönderi URL adresi' }, { status: 400 })
    }

    const mediaId = shortcodeToMediaId(shortcode)

    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'X-IG-App-ID': '936619743392459',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': '*/*',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': `https://www.instagram.com/p/${shortcode}/`,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin'
    }

    // Strategy 1: Direct Instagram Web API v1 Endpoint
    try {
      const webApiUrl = `https://www.instagram.com/api/v1/media/${mediaId}/comments/?can_support_threading=true&permalink_enabled=false`
      const res = await fetch(webApiUrl, {
        headers: browserHeaders,
        next: { revalidate: 0 }
      })

      if (res.ok) {
        const data = await res.json()
        const rawComments = data?.comments || []

        if (rawComments.length > 0) {
          const comments = rawComments.map((c: any, idx: number) => ({
            id: c.pk || `ig_c_${idx}`,
            username: c.user?.username || `user_${idx}`,
            avatarUrl: c.user?.profile_pic_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user?.username}`,
            text: c.text || '',
            timestamp: 'Canlı Yorum'
          }))

          return NextResponse.json({
            success: true,
            comments,
            count: comments.length,
            source: 'Instagram Direct API'
          })
        }
      }
    } catch (_) { /* continue to next strategy */ }

    // Strategy 2: GraphQL Query with shortcode
    try {
      const gqlUrl = `https://www.instagram.com/graphql/query/?query_hash=b76008b12e61fe077e6e65c1bda3a925&variables=${encodeURIComponent(JSON.stringify({ shortcode, first: 50 }))}`
      const gqlRes = await fetch(gqlUrl, { headers: browserHeaders, next: { revalidate: 0 } })

      if (gqlRes.ok) {
        const gqlData = await gqlRes.json()
        const edges = gqlData?.data?.shortcode_media?.edge_media_to_parent_comment?.edges || []

        if (edges.length > 0) {
          const comments = edges.map((e: any, idx: number) => ({
            id: e.node?.id || `gql_${idx}`,
            username: e.node?.owner?.username || `user_${idx}`,
            avatarUrl: e.node?.owner?.profile_pic_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${e.node?.owner?.username}`,
            text: e.node?.text || '',
            timestamp: 'Canlı Yorum'
          }))

          return NextResponse.json({
            success: true,
            comments,
            count: comments.length,
            source: 'Instagram GraphQL'
          })
        }
      }
    } catch (_) { /* continue to next strategy */ }

    // Strategy 3: Fetch full HTML page and parse embedded data
    try {
      const pageUrl = `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`
      const htmlRes = await fetch(pageUrl, {
        headers: {
          'User-Agent': browserHeaders['User-Agent'],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9',
        },
        next: { revalidate: 0 }
      })

      if (htmlRes.ok) {
        const contentType = htmlRes.headers.get('content-type') || ''
        
        if (contentType.includes('application/json')) {
          // If Instagram returns JSON directly
          const jsonData = await htmlRes.json()
          const media = jsonData?.graphql?.shortcode_media || jsonData?.items?.[0]
          const edges = media?.edge_media_to_parent_comment?.edges || media?.edge_media_to_comment?.edges || []
          const caption_comments = media?.comments?.data || []

          const allComments = edges.length > 0 ? edges : caption_comments

          if (allComments.length > 0) {
            const comments = allComments.map((item: any, idx: number) => {
              const node = item.node || item
              return {
                id: node.id || node.pk || `json_${idx}`,
                username: node.owner?.username || node.user?.username || `user_${idx}`,
                avatarUrl: node.owner?.profile_pic_url || node.user?.profile_pic_url || '',
                text: node.text || '',
                timestamp: 'Canlı Yorum'
              }
            })

            return NextResponse.json({
              success: true,
              comments,
              count: comments.length,
              source: 'Instagram JSON API'
            })
          }
        } else {
          // Parse HTML for embedded JSON data
          const html = await htmlRes.text()
          const htmlComments = extractCommentsFromHtml(html)

          if (htmlComments.length > 0) {
            return NextResponse.json({
              success: true,
              comments: htmlComments,
              count: htmlComments.length,
              source: 'Instagram HTML Parse'
            })
          }
        }
      }
    } catch (_) { /* continue to next strategy */ }

    // Strategy 4: CORS Proxy Fallback (via corsproxy.io)
    try {
      const proxyApiUrl = `https://corsproxy.io/?${encodeURIComponent(`https://www.instagram.com/api/v1/media/${mediaId}/comments/?can_support_threading=true`)}`
      const proxyRes = await fetch(proxyApiUrl, { headers: browserHeaders, next: { revalidate: 0 } })

      if (proxyRes.ok) {
        const proxyData = await proxyRes.json()
        const rawComments = proxyData?.comments || []

        if (rawComments.length > 0) {
          const comments = rawComments.map((c: any, idx: number) => ({
            id: c.pk || `proxy_${idx}`,
            username: c.user?.username || `user_${idx}`,
            avatarUrl: c.user?.profile_pic_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user?.username}`,
            text: c.text || '',
            timestamp: 'Canlı Yorum'
          }))

          return NextResponse.json({
            success: true,
            comments,
            count: comments.length,
            source: 'Instagram Proxy'
          })
        }
      }
    } catch (_) { /* continue to fallback */ }

    // All strategies failed - return guidance for browser-side scraping
    return NextResponse.json({
      success: false,
      requiresPaste: true,
      message: 'Instagram oturum koruması nedeniyle canlı yorumlar sunucu tarafından çekilemedi. Tarayıcı konsolundan 1-tık kopyalama yöntemini veya manuel yapıştırma seçeneğini kullanabilirsiniz.',
      browserScriptAvailable: true
    })

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      requiresPaste: true,
      error: err.message
    }, { status: 500 })
  }
}
