import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

const TRACE_EVENTS = [
  { id: '1', type: 'ROUTER', status: 'SUCCESS', title: 'Route resolved', detail: '/api/process', timestamp: Date.now(), payload: { path: '/api/process', method: 'POST' } },
  { id: '2', type: 'PLANNER', status: 'SUCCESS', title: 'Step 1: Analyze input', detail: 'Parsing user request', timestamp: Date.now() + 100, parentId: '1' },
  { id: '3', type: 'PLANNER', status: 'RUNNING', title: 'Step 2: Plan actions', detail: 'Generating action plan', timestamp: Date.now() + 200, parentId: '1' },
  { id: '4', type: 'TOOL_CALL', status: 'SUCCESS', title: 'search_index', detail: 'Query executed', timestamp: Date.now() + 300, payload: { tool: 'search_index', query: 'sample', results: 3 } },
  { id: '5', type: 'TOOL_CALL', status: 'RUNNING', title: 'fetch_data', detail: 'Retrieving records', timestamp: Date.now() + 400, payload: { tool: 'fetch_data', params: { limit: 10 } } },
  { id: '6', type: 'HUMAN_ESCALATION', status: 'PENDING', title: 'Confidence below threshold', detail: 'Awaiting human review', timestamp: Date.now() + 500, payload: { confidence: 0.42, threshold: 0.7 } },
]

const MOCK_RESPONSE = `This is a mock cloud inference response. In production, replace mockCloudApi with your actual backend endpoint. The AI Gateway routes here when WebGPU is unavailable or when cloud mode is selected.`

function sendSse(res: ServerResponse, data: unknown) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

export function mockApiPlugin(): Plugin {
  return {
    name: 'vaic-mock-api',
    configureServer(server) {
      server.middlewares.use('/api/mock-trace', (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.flushHeaders()

        let index = 0
        const interval = setInterval(() => {
          if (index >= TRACE_EVENTS.length) {
            clearInterval(interval)
            res.end()
            return
          }
          const event = { ...TRACE_EVENTS[index], id: String(index + 1), timestamp: Date.now() }
          sendSse(res, event)
          index++
        }, 800)

        req.on('close', () => clearInterval(interval))
      })

      server.middlewares.use('/api/mock-inference', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        const body = await readBody(req)
        let prompt = ''
        try {
          prompt = JSON.parse(body).prompt ?? ''
        } catch {
          prompt = body
        }

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.flushHeaders()

        const prefix = prompt ? `Response to: "${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}"\n\n` : ''
        const text = prefix + MOCK_RESPONSE
        const words = text.split(' ')
        let i = 0

        const interval = setInterval(() => {
          if (i >= words.length) {
            sendSse(res, { type: 'done' })
            clearInterval(interval)
            res.end()
            return
          }
          const token = (i === 0 ? '' : ' ') + words[i]
          sendSse(res, { type: 'token', token })
          i++
        }, 60)

        req.on('close', () => clearInterval(interval))
      })
    },
  }
}
