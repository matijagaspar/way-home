import WebSocket from 'ws'
import Packet from './packet'
import net from 'net'
import { getAppLogger } from './logger'
import qs from 'querystring'
// todo: add ability to send custom packets to controller

const default_opts = {
  name: 'default_agent_name',
  controller_address: 'localhost:8080',
  ping_timeout: 30000,
  reconnect_timeout: 5000,
  is_ssl: false,
  getQuery: () => null,
  connectHandler: app_def => net.connect(app_def.remote_port, app_def.remote_host),
}

export default function agent (user_opts = {}) {
  const agent_opts = { ...default_opts, ...user_opts }

  const logger = agent_opts.logger || getAppLogger(agent_opts.name, 'blue')
  // dummy client

  logger.info('Started agent')

  let ws
  const stopAgent = (reason) => {
    if (ws && ws.terminate) {
      logger.info(`Stopping agent${reason ? ` reason: ${reason}` : ''}`)
      ws.removeAllListeners('close')
      ws.terminate()
      ws = null
    }
  }
  const connectAgent = (passed_query) => {
    const query = { ...agent_opts.getQuery() || {}, agent_name: agent_opts.name, ping_timeout: agent_opts.ping_timeout, ...passed_query || {} }
    const controller_url = `ws${agent_opts.is_ssl ? 's' : ''}://${agent_opts.controller_address}/agent${'?' + qs.stringify(query)}`

    stopAgent('Reconnecting')
    logger.debug(`Connecting to controller ${controller_url}`)

    ws = new WebSocket(controller_url)
    const streams = []
    ws.on('error', e => {
      if (e.message === 'Unexpected server response: 401') {
        logger.error(`Could not connect to ${controller_url}: Unauthorized `)

        if (agent_opts.onUnauthorized) {
          agent_opts.onUnauthorized()
        }
      } else {
        logger.error(`Could not connect to ${controller_url}${e.code ? 'code: ' + e.code : ''}`)
      }

      // console.log(e.message)
    })
    ws.on('close', code => {
      logger.info(`Connection with controller closed (code=${code})`)
      // very basic recconect
      setTimeout(() => {
        logger.info('Attempt reconnect')
        connectAgent()
      }, agent_opts.reconnect_timeout)
    })
    ws.on('open', function open () {
      logger.info('Connected to controller')
      if (agent_opts.onControllerConnected) {
        agent_opts.onControllerConnected()
      }
      ws.on('ping', () => {
        // logger.debug(`ping ${ agent_opts.controller_address }`)
        ws.isAlive = true
      })
      const TOInterval = setInterval(() => {
        if (ws.isAlive === false) {
          logger.warn('Detected dead socket, killing controller!')
          clearInterval(TOInterval)
          return ws.terminate()
        }
        ws.isAlive = false
      }, agent_opts.ping_timeout)

      ws.on('message', message => {
        const received_data = message // Buffer.from(message) //<== for uws compatibility!
        const packet_type = Packet.getPacketId(received_data)
        switch (packet_type) {
          case Packet.CONNECT: {
            // open connection
            const { port, app_id, app_def } = Packet.parseConnectPacket(received_data)
            const topicLogger = logger.topicLogger(agent_opts.name, app_id, port)
            topicLogger.debug(`recieved connect request on ${app_def.remote_host}:${app_def.remote_port}`)
            // better def?
            const sock = agent_opts.connectHandler(app_def)

            sock.on('connect', () => {
              streams[port] = sock
              const connect_packet = Packet.craftConnectPacket(port, app_id)
              Packet.wsSend(ws, connect_packet)
            })
            sock.on('error', e => {
              topicLogger.error('failed', e)
              Packet.wsSend(ws, Packet.craftErrorPacket(port, e.code))
            })
            sock.on('close', e => {
              topicLogger.debug('socket closed by app, sending close command')
              Packet.wsSend(ws, Packet.craftClosePacket(port))
              sock.removeAllListeners()
              delete streams[port]
            })
            sock.on('end', e => {
              topicLogger.debug('ending socket')
            })
            sock.on('data', d => {
              topicLogger.trace('responding with data')
              Packet.wsSend(ws, Packet.craftDataPacket(port, d))
            })

            break
          }
          case Packet.CLOSE_CONNECTION: {
            // close connection

            const { port } = Packet.parseClosePacket(received_data)
            if (streams[port]) {
              streams[port].destroy()
              delete streams[port]
            }
            logger.debug(`close command for port ${port}, closing`)
            break
          }
          case Packet.ERROR:
            // Packet.parseErrorPacket(received_data)
            // if port < reserved ports (agent error), throw/handle on client.js?
            // if port > reserved port = close connection?
            logger.info(`error connection on stream: ${received_data[1]}`)
            break
          default: {
            if (packet_type > Packet.RESERVED_PORTS) {
              const { port, data } = Packet.parseDataPacket(received_data)
              if (streams[port]) {
                logger.trace(`data  on stream: ${port}`)
                streams[port].write(data)
              } else {
                logger.info('invalid port')
              }
            }
          }
        }
      })
    })
  }

  connectAgent()

  return {
    stop: stopAgent,
    connect: connectAgent,
    sendAgentInfo: (info) => {
      Packet.wsSend(ws, Packet.craftAgentInfoPacket({
        name: agent_opts.name,
        ...info,
      }))
    },
  }
}
