/// <reference types="@cloudflare/workers-types" />

import { TOOL_ROUTES } from './routes'

export interface Env {
  ASSETS: Fetcher
}

/** Record types the DNS tool is allowed to ask for. */
const DNS_TYPES = new Set(['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'CAA', 'SRV', 'PTR'])

/**
 * A hostname, not a URL and not an address to be probed. The allowlist keeps this
 * endpoint a DNS resolver rather than a general-purpose request proxy that anyone could
 * point at an internal host.
 */
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\.?$/i

async function dnsQuery(url: URL): Promise<Response> {
  const name = (url.searchParams.get('name') ?? '').trim().toLowerCase()
  const type = (url.searchParams.get('type') ?? 'A').trim().toUpperCase()

  if (!HOSTNAME.test(name)) {
    return Response.json({ error: 'invalid_name' }, { status: 400 })
  }
  if (!DNS_TYPES.has(type)) {
    return Response.json({ error: 'invalid_type' }, { status: 400 })
  }

  const upstream = new URL('https://cloudflare-dns.com/dns-query')
  upstream.searchParams.set('name', name)
  upstream.searchParams.set('type', type)

  let response: Response
  try {
    response = await fetch(upstream, { headers: { accept: 'application/dns-json' } })
  } catch {
    return Response.json({ error: 'upstream_unreachable' }, { status: 502 })
  }
  if (!response.ok) {
    return Response.json({ error: 'upstream_failed', status: response.status }, { status: 502 })
  }

  const body = (await response.json()) as {
    Status?: number
    Answer?: { name: string; type: number; TTL: number; data: string }[]
    Authority?: { name: string; type: number; TTL: number; data: string }[]
  }

  // Pass through only the fields the tool renders, so the shape stays ours.
  return Response.json(
    {
      status: body.Status ?? 0,
      answers: (body.Answer ?? []).map((a) => ({ name: a.name, type: a.type, ttl: a.TTL, data: a.data })),
      authority: (body.Authority ?? []).map((a) => ({ name: a.name, type: a.type, ttl: a.TTL, data: a.data })),
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}

/**
 * Returns the SPA shell under a chosen status code.
 *
 * The client router renders the right screen either way; the status is what makes an
 * unknown path an actual 404 rather than a soft one — a page that says "not found"
 * while answering 200 still gets crawled and indexed as a real page.
 */
async function serveShell(env: Env, url: URL, status: number): Promise<Response> {
  const shell = await env.ASSETS.fetch(new Request(new URL('/index.html', url).toString()))
  return new Response(shell.body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=0, must-revalidate' : 'no-store',
    },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/ip') {
      const ip = request.headers.get('CF-Connecting-IP') ?? ''
      const country = request.cf?.country ?? null
      return Response.json({ ip, country })
    }

    if (url.pathname === '/api/dns') {
      return dnsQuery(url)
    }

    // Static files are served before the worker is reached, so anything arriving here is
    // either a client route or a genuine miss.
    const slug = url.pathname.replace(/^\/+|\/+$/g, '')
    if (slug === '' || TOOL_ROUTES.has(slug)) {
      return serveShell(env, url, 200)
    }

    // `not_found_handling = "none"` makes this a real 404 rather than the shell, which is
    // what lets the miss be told apart from a hit.
    const asset = await env.ASSETS.fetch(request)
    if (asset.status !== 404) return asset

    return serveShell(env, url, 404)
  },
} satisfies ExportedHandler<Env>
