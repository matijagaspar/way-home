export const CONNECT = 1
export const CLOSE_CONNECTION = 2
export const ERROR = 3
export const AGENT_INFO = 4
export const RESERVED_PORTS = 0x0f
const PORT_BYTES = 1
const MAX_PORTS = Math.pow(2, 8 * PORT_BYTES) - 1
// export const MAX_PORTS = 0xff //* portBytes // a byte

export const craftDataPacket = (port, data) => Buffer.concat([Buffer.from([port]), Buffer.from(data)])

export const craftConnectPacket = (port, app_id, app_def) => Buffer.concat([
  Buffer.from([CONNECT]),
  Buffer.from([port]),
  Buffer.from(JSON.stringify({ app_id, app_def })),
])

export const craftClosePacket = port => Buffer.concat([Buffer.from([CLOSE_CONNECTION]), Buffer.from([port])])

export const craftErrorPacket = (port, error_code) => Buffer.concat([Buffer.from([ERROR]), Buffer.from([port]), Buffer.from(error_code)])

export const craftAgentInfoPacket = agent_info => Buffer.concat([
  Buffer.from([AGENT_INFO]),
  Buffer.from(JSON.stringify(agent_info)),
])

export const getPacketId = data => data[0]

export const parseConnectPacket = data => {
  const payload = Buffer.from(data.buffer, data.byteOffset + 2, data.byteLength - 2)
  const parsed_packet = {
    port: data[1], // TODO: fix hardcoded port size
  }
  if (payload) {
    const { app_def, app_id } = JSON.parse(payload)
    parsed_packet.app_def = app_def
    parsed_packet.app_id = app_id
  }
  return parsed_packet
}

export const parseClosePacket = data => ({
  port: data[1], // TODO: fix hardcoded port size
})

export const parseErrorPacket = data => {
  const error_code = Buffer.from(data.buffer, data.byteOffset + 2, data.byteLength - 2)
  const parsed_packet = {
    port: data[1], // TODO: fix hardcoded port size
  }
  if (error_code) {
    parsed_packet.error_code = error_code
  }
  return parsed_packet
}

export const parseDataPacket = dataBuffer => ({
  port: dataBuffer[0], // TODO: fix hardcoded port size
  data: Buffer.from(
    dataBuffer.buffer,
    dataBuffer.byteOffset + 1,
    dataBuffer.byteLength - 1,
  ),
})

export const parseAgentInfoPacket = dataBuffer => {
  const data = Buffer.from(
    dataBuffer.buffer,
    dataBuffer.byteOffset + 1,
    dataBuffer.byteLength - 1,
  )
  return JSON.parse(data)
}

function getNewPort (streams) {
  // get a random port above the reserved ports, and less then max ports
  const generate_port = () => RESERVED_PORTS + 1 + Math.round(Math.random() * (MAX_PORTS - RESERVED_PORTS - 1))

  let tentative_port
  let retries = 0
  do {
    retries++
    tentative_port = generate_port()
    if (retries > 100) {
      throw new Error('No port')
    }
  } while (streams[tentative_port])
  return tentative_port
}

const wsSend = (ws, data) => {
  if (ws && ws.readyState === 1) {
    ws.send(data)
  }
}

// neat but... slow :S
const parse = packet => {
  const id = getPacketId(packet)

  const handlers = {}

  let parsed_packet
  switch (id) {
    case CONNECT:
      parsed_packet = parseConnectPacket(packet)
      if (handlers.connect) {
        handlers.connect(parsed_packet)
      }
      break
    case CLOSE_CONNECTION:
      parsed_packet = parseClosePacket(packet)
      if (handlers.close) {
        handlers.close(parsed_packet)
      }
      break
    case ERROR:
      if (handlers.error) {
        handlers.error(parsed_packet)
      }
      break
    default:
      if (id > RESERVED_PORTS) {
        parsed_packet = parseDataPacket(packet)
        if (handlers.data) {
          handlers.data(parsed_packet)
        }
      }
  }

  const parsers = {}
  parsers.onConnect = handler => {
    handlers.connect = handler
    return parsers
  }
  parsers.onClose = handler => {
    handlers.close = handler
    return parsers
  }
  parsers.onError = handler => {
    handlers.error = handler
    return parsers
  }

  parsers.onData = handler => {
    handlers.data = handler
    return parsers
  }
  return parsers
}
export default {
  CONNECT,
  CLOSE_CONNECTION,
  ERROR,
  AGENT_INFO,
  RESERVED_PORTS,
  MAX_PORTS,
  craftDataPacket,
  craftConnectPacket,
  craftAgentInfoPacket,
  craftClosePacket,
  craftErrorPacket,
  getPacketId,
  parseConnectPacket,
  parseClosePacket,
  parseAgentInfoPacket,
  parseErrorPacket,
  parseDataPacket,
  parse,
  getNewPort,
  wsSend,
}
