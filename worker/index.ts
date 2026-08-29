/// <reference types="@cloudflare/workers-types" />

export interface Env {
  ASSETS: Fetcher
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/ip') {
      const ip = request.headers.get('CF-Connecting-IP') ?? ''
      const country = request.cf?.country ?? null
      return Response.json({ ip, country })
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
