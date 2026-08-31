/**
 * dsh-plugin-web-editors — node half.
 *
 * Registers the `/web-editors` prefix route used by the browser file picker.
 * The endpoint only lists candidate file names; editor plugins own file
 * read/write access through their own bridges.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { listWorkspaceFiles } from './file-bridge.ts'

export const name = 'dsh-plugin-web-editors'

/** Required service: the web server whose route table this plugin extends. */
export const inject = ['webServer']

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store',
  })
  res.end(data)
}

function readQuery(req: IncomingMessage): { pathname: string; params: URLSearchParams } {
  const url = new URL(req.url ?? '/', 'http://localhost')
  return { pathname: url.pathname, params: url.searchParams }
}

function extensionsFrom(params: URLSearchParams): string[] {
  const raw = params.get('extensions')
  if (raw === null || raw === '') return []
  return raw.split(',').map(part => part.trim()).filter(part => part !== '')
}

export function apply(ctx: Context): void {
  const webServer = ctx.webServer
  const defaultRoot = resolve(process.cwd())

  const disposer = webServer.register({
    kind: 'prefix',
    path: '/web-editors',
    handler: async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
      try {
        const { pathname, params } = readQuery(req)
        if (pathname === '/web-editors/api/health') {
          sendJson(res, 200, { ok: true })
          return
        }
        if (pathname === '/web-editors/api/list') {
          const root = params.get('root') ?? defaultRoot
          const files = await listWorkspaceFiles(root, extensionsFrom(params))
          sendJson(res, 200, { root, count: files.length, files })
          return
        }
        sendJson(res, 404, { error: 'unknown endpoint' })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!res.headersSent) sendJson(res, 500, { error: message })
        else res.destroy()
      }
    },
  })

  ctx.effect(() => disposer, 'dsh-plugin-web-editors: /web-editors routes')
}
