import wsAgent from './utils/ws_agent'
import { request } from 'undici'
import { getAppLogger } from './utils/logger'
import getPersistence from './utils/client_persistence'

export default function client () {
  // TODO: check config exists
  const db = getPersistence()
  const { controller_address, agent_name, permissions, apps, isSsl } = db.getState()
  if (!controller_address || !agent_name) {
    throw new Error('set up agent_name and controller_address in client_db')
  }
  if (!apps) {
    throw new Error('No apps defined in the agent_settings.json')
  }
  const logger = getAppLogger(agent_name, 'blue')

  const agent = wsAgent({
    name: agent_name,
    controller_address,
    is_ssl: isSsl,
    getQuery: () => ({ authorized: process.env.WH_AUTH_KEY || db.get('authorization_key').value() }),
    logger,
    onControllerConnected: () => {
      agent.sendAgentInfo({ permissions, apps })
    },
    onUnauthorized: async () => {
      agent.stop('Unauthorized, try authorize ')

      let authorized = false
      /* .stream().pipe(split()).on('data').on('end') */
      const { body } = await request(`http${isSsl? 's' : ''}://${controller_address}/authorize_agent?agent_name=${agent_name}`, { timeout:180000 })
      for await (const d of body){
        const message = JSON.parse(d.toString())
        if (message.type === 'pin') {
          logger.warn(`please authorize at: http://${controller_address}/verify_agent?agent_name=${agent_name}&pin=${message.pin}`)
        } else if (message.type === 'success') {
          db.set('authorization_key', message.code).write()
          authorized = message.code
          logger.info(`${agent_name}: successfully authorized with ${controller_address}`)
        } else if (message.type === 'error') {
          logger.error(message.message)
        }
      }

      if (authorized) {
        logger.info('authorized the agent')
        agent.connect({ authorized })
      } else {
        throw new Error('failed to authorize')
      }
    },
  })
}
