// haya-nt3lm.com — serves the Quizzes Hub and its quiz sites from GitHub Pages under one
// address. One address matters: the Hub and its quizzes share the browser sign-in, and the
// browser keeps that sign-in per address. The GitHub addresses keep working unchanged.
const ORIGIN = 'https://ahmad9077.github.io'
const HOST = 'haya-nt3lm.com'
const HUB = 'quizzes-hub'
// Quiz sites that belong to the Hub. Other GitHub Pages sites on the account are not served here.
const SITES = [
  'world-flags-quiz',
  'country-map-quiz',
  'spelling-quiz',
  'little-words-picture-quiz',
  'english-word-choice-quiz',
  'country-border-letter-quiz',
  'arabic-phonics-quiz',
  'science-grade1-quiz',
]
const TEXT = /^(text\/|application\/(javascript|json|manifest\+json|xml)|image\/svg\+xml)/
const FORWARDED = ['accept', 'accept-language', 'range', 'if-none-match', 'if-modified-since']

export function upstreamPath(pathname) {
  const first = pathname.split('/')[1] ?? ''
  return first === HUB || SITES.includes(first) ? pathname : `/${HUB}${pathname}`
}

// GitHub addresses written inside pages and scripts point back to this domain.
export function localize(text, self) {
  let out = text.replaceAll(`${ORIGIN}/${HUB}/`, `${self}/`).replaceAll(`${ORIGIN}/${HUB}`, self)
  for (const site of SITES) out = out.replaceAll(`${ORIGIN}/${site}`, `${self}/${site}`)
  return out
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    // Always the secure address: passwords are typed here, and the admin tools only accept https.
    if (url.protocol !== 'https:' || url.hostname !== HOST) {
      return Response.redirect(`https://${HOST}${url.pathname}${url.search}`, 301)
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } })
    }

    const self = `https://${HOST}`
    const headers = new Headers()
    for (const name of FORWARDED) {
      const value = request.headers.get(name)
      if (value) headers.set(name, value)
    }
    const upstream = await fetch(new URL(upstreamPath(url.pathname) + url.search, ORIGIN), {
      method: request.method,
      headers,
      redirect: 'manual',
    })

    const out = new Headers(upstream.headers)
    const location = out.get('location')
    if (location) out.set('location', localize(new URL(location, ORIGIN).href, self))

    const type = out.get('content-type') ?? ''
    if (request.method === 'GET' && upstream.body && TEXT.test(type) && upstream.status !== 206) {
      out.delete('content-length')
      return new Response(localize(await upstream.text(), self), { status: upstream.status, headers: out })
    }
    return new Response(upstream.body, { status: upstream.status, headers: out })
  },
}
