import wsAgent from './utils/ws_agent'
// TODO: replace request with got ormsth?
import request from 'request'

// import lowdb from 'lowdb'
import { getAppLogger } from './utils/logger'
import getPersistence from './utils/client_persistence'
// import FileSync from 'lowdb/adapters/FileSync'
// todo: file location
// const adapter = new FileSync('./agent_settings.json', {
//     defaultValue: {
//         agent_name: '',
//         controller_address: '',
//         isSsl: false,
//         permissions: {
//             mode: 'session',
//             groups: [
//                 'admin',
//             ],
//         },

//     },
// })

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
  /* const agent_name = 'agent1'

db.get('authorization_key').value()
    const controller_address = 'localhost:8080' */

  const agent = wsAgent({
    name: agent_name,
    controller_address,
    is_ssl: isSsl,
    getQuery: () => ({ authorized: db.get('authorization_key').value() }),
    logger,
    onControllerConnected: () => {
      agent.sendAgentInfo({ permissions, apps })
    },
    onUnauthorized: () => {
      agent.stop('Unauthorized, try authorize ')

      let authorized = false
      request(`http://${controller_address}/authorize_agent?agent_name=${agent_name}`).on('data', d => {
        const message = JSON.parse(d.toString())
        if (message.type === 'pin') {
          logger.warn(`please authorize at: http://${controller_address}/verify_agent?agent_name=${agent_name}&pin=${message.pin}`)
        } else if (message.type === 'success') {
          db.set('authorization_key', message.code).write()
          authorized = message.code
        } else if (message.type === 'error') {
          logger.error(message.message)
        }
      })
        .on('end', r => {
          if (authorized) {
            logger.info('authorized the agent')
            agent.connect({ authorized })
          } else {
            throw new Error('failed to authorize')
          }
        })
    },
  })
}
