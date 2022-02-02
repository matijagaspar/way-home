import WebSocket from 'ws'
import http from 'http'
import qs from 'querystring'
import { URL, URLSearchParams } from 'url'
import { getAppLogger } from './logger'
import httpHeaders from 'http-headers'
import Packet from './packet'

const logger = getAppLogger('router', 'magenta')
const default_opts = {
  ping_interval: 5000,
  ping_timeout: 30000,
  header_timeout: 10000,
  listen_port: 8080,
  web_app: req => req.socket.end('HTTP/1.1 501 Not Implemented\n\n No controller webapp implemented'),
  getRoute: () => ({ type: 'controller' }),
}
// ENDOFDEFS
export default function wsRouter (user_opts = {}) {
  logger.info('Started ws router')
  const agents = {}
  const router_opts = { ...default_opts, ...user_opts }
  const web_app = router_opts.web_app
  const wsDataHandler = agent_name => recieved_data => {
    const packet_type = Packet.getPacketId(recieved_data)
    const agent = agents[agent_name]
    const handleClientClose = port => {
      Packet.wsSend(agent.ws, Packet.craftClosePacket(port))
      delete agent.streams[port]
    }
    if (!agent) {
      // handle this error
      logger.info('agent is null')
    }

    if (packet_type === Packet.CONNECT) {
      const { port } = Packet.parseConnectPacket(recieved_data)
      const stream = agent.streams[port]

      if (!stream || !stream.pendingData) {
        handleClientClose(port)
        logger.error(`No stream ${port} on data handler`)
        return
      }

      // if (!stream ) {
      //   throw new Error('no stream')
      // }

      logger.topicLogger(agent_name, stream.app_id, port).debug('got connection approval')

      const initialDataPacket = Packet.craftDataPacket(port, stream.pendingData)
      Packet.wsSend(agent.ws, initialDataPacket)
      stream.pendingData = null
      // add handler that forwards
      stream.socket.on('data', d => {
        Packet.wsSend(agent.ws, Packet.craftDataPacket(port, d))
      })
      // questionable
      stream.socket.on('close', () => {
        logger.topicLogger(agent_name, stream.app_id, port).debug('stream closed by client, sent close command')
        handleClientClose(port)
      })
    } else if (packet_type === Packet.CLOSE_CONNECTION) {
      const { port } = Packet.parseClosePacket(recieved_data)
      const stream = agent.streams[port]

      if (!stream) {
        logger.debug(`No stream ${port} on close handler`)
        return
      }

      logger.topicLogger(agent_name, stream.app_id, port).debug('recieved close command from agent, closing stream')
      stream.socket.end()
      agent.streams[port] = null
    } else if (packet_type === Packet.ERROR) {
      const { port, error_code } = Packet.parseErrorPacket(recieved_data)
      const stream = agent.streams[port]
      if (!stream) {
        handleClientClose(port)
        logger.error(`No stream ${port} on error handler`)
        return
      }
      const errMessage = `error creating connection on app ${stream.app_id} '${error_code}'`
      logger
        .topicLogger(agent_name, stream.app_id, port)
        .debug(errMessage)
      stream.socket.end(`HTTP/1.1 502 Bad Gateway\n\n ${errMessage}`)
    } else if (packet_type === Packet.AGENT_INFO) {
      const agent_info = Packet.parseAgentInfoPacket(recieved_data)
      if (router_opts.onAgentInfo) {
        router_opts.onAgentInfo(agent_name, agent_info)
      }
    } else if (packet_type > Packet.RESERVED_PORTS) {
      const { port, data } = Packet.parseDataPacket(recieved_data)

      const stream = agent.streams[port]
      if (!stream) {
        handleClientClose(port)
        logger.error(`No stream ${port} on data handler`)
        return
      }
      logger.topicLogger(agent_name, stream.app_id, port).trace('writing to http')
      agent.streams[port].socket.write(data)
    }
  }

  const httpConnectHandler = socket => {
    socket.asdasd = true
    //  <= end of header!
    // parse-headers
    const regex = /(?:\r\n|\r|\n){2}/
    // const regex = /Host: (.*?)$/im
    let collectedData = ''
    const host = null

    const toolongTO = setTimeout(() => {
      if (!host) {
        logger.warn('Timeout parsing header\n', collectedData)
        socket.end()
      }
    }, router_opts.header_timeout)
    const collectHeader = async d => {
      collectedData += d.toString()

      if (regex.test(collectedData)) {
        // const parsed_headers = parseHeaders(collectedData)
        // const req_url = parsed_headers[Object.keys(parsed_headers)[0]].split(' ')[1]
        // better request construct!
        // const parsed_request = { url: req_url, headers: parsed_headers }
        const parsed_request = httpHeaders(collectedData)
        const { headers, url } = parsed_request

        socket.removeListener('data', collectHeader)
        clearTimeout(toolongTO)
        const route = await router_opts.getRoute(url, headers)

        if (route.type === 'controller') {
          logger.debug('New request to controler')
          return
        }
        if (route.type === 'error') {
          logger.error(`Router returned error '${route.message}' on request`, parsed_request)
          let passHeaders = ''
          if (route.headers) {
            passHeaders = Object.entries(route.headers).reduce((res, [key, value]) => `${res}\n${key}: ${value}`, '')
          }
          socket.end(`HTTP/1.1 ${route.status}${passHeaders}\n\n${route.message}`)
          return
        }
        if (route.type === 'redirect') {
          const { url, params, permanent } = route
          const redirectUrl = new URL(url)
          const searchparams = new URLSearchParams(params)
          redirectUrl.search = searchparams.toString()
          logger.error(`Router returned reddirect to '${redirectUrl.href}' on request`, parsed_request)
          socket.end(`HTTP/1.1 ${permanent ? 301 : 302}\nLocation: ${redirectUrl.href}\n\n`)
          return
        }
        if (route.type === 'remote_route') {
          const agent = agents[route.agent]

          // append to tunnel if host is right!
          if (agent && agent.ws) {
            agent.port = Packet.getNewPort(agent.streams)
            logger.topicLogger(route.agent, route.app_id, agent.port).debug('New http connection')

            const connectPacket = Packet.craftConnectPacket(agent.port, route.app_id, route)
            Packet.wsSend(agent.ws, connectPacket)
            agent.streams[agent.port] = {
              socket,
              app_id: route.app_id,
              pendingData: Buffer.from(collectedData),
            }
          } else {
            logger.warn(`agent '${route.agent}' for '${route.app_id}' not connected`)
            socket.end('HTTP/1.1 502 Bad Gateway\n\n agent down')
          }
        }
      }
    }
    socket.on('data', collectHeader)
  }

  const wss = new WebSocket.Server({ noServer: true })

  const http_server = http.createServer()

  http_server.on('connection', httpConnectHandler)

  http_server.on('request', async (request, res) => {
    // console.log(Object.keys(request.socket).join('\n'))
    const route = await router_opts.getRoute(request.url, request.headers, true)
    if (route && route.type === 'controller') {
      logger.debug('Controller request')
      web_app(request, res)
    }
  },
  )

  http_server.on('upgrade', async function upgrade (request, socket, head) {
    const route = await router_opts.getRoute(request.url, request.headers, true)
    if (route && route.type === 'controller') {
      // const url = url_util.parse(`http://${request.headers.host}${request.url}`)
      const url = new URL(`http://${request.headers.host}${request.url}`)
      if (url.pathname === '/agent') {
        if (router_opts.agentAuthorization && !router_opts.agentAuthorization(request)) {
          socket.end('HTTP/1.1 401 Unauthorized\n\n')
          return
        }
        wss.handleUpgrade(request, socket, head, function done (ws) {
          wss.emit('connection', ws, request)
        })
      } else {
        // todo: handle possibility of using ws on controller
        socket.destroy()
      }
    }
  })

  http_server.listen(router_opts.listen_port)

  wss.on('connection', function connection (ws, request) {
    // const url = url_util.parse(`http://${request.headers.host}${request.url}`)
    const url = new URL(`http://${request.headers.host}${request.url}`)
    const { agent_name, ping_timeout } = qs.parse(url.search)
    ws.agent_name = agent_name
    logger.info(`agent '${agent_name}' connected`)

    if (agents[agent_name]) {
      // end all streams?
      agents[agent_name].ws.close()
      delete agents[agent_name]
    }

    ws.isAlive = true
    ws.on('pong', () => {
      logger.debug(`pong ${agent_name}`)
      ws.isAlive = true
    })
    agents[agent_name] = { ws, request, streams: [] }
    ws.on('message', wsDataHandler(agent_name))

    const pingInterval = setInterval(function ping () {
      // wss.clients.forEach(function each (ws) {
      logger.debug(`ping ${ws.agent_name}`)
      ws.ping(() => {})
      // })
    }, router_opts.ping_interval)

    const TOInterval = setInterval(() => {
      if (ws.isAlive === false) {
        logger.warn('Detected dead socket, killing controller!')
        clearInterval(TOInterval)
        clearInterval(pingInterval)
        return ws.terminate()
      }
      ws.isAlive = false
    }, ping_timeout || (router_opts.ping_timeout || 30000))

    ws.on('close', () => {
      if (router_opts.onAgentDisconnect) {
        router_opts.onAgentDisconnect(agent_name)
      }
      logger.debug(`closing ws ${agent_name}`)
      clearInterval(TOInterval)
      clearInterval(pingInterval)
      if (agents[agent_name]) {
        agents[agent_name].ws.close()
        delete agents[agent_name]
      }
    })
  })
}
