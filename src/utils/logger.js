const pino = require('pino')

let logger
const defaultPinoOpts = {
  safe: true,
  level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
}
export function initLogger () {
  if (logger) {
    throw new Error('Logger already initialized')
  }
  logger = pino(defaultPinoOpts)
  return logger
}

const getLogger = () => logger || initLogger()

export function getAppLogger (app_id, color) {
  // const name_color = color
  const return_logger = getLogger().child({
    name: app_id,
    name_color: color,
  })
  return_logger.topicLogger = (agent_name, app_id, port) => return_logger.child({ topic: `${agent_name}/${app_id}:${port}` })
  return return_logger
}

export default getLogger
