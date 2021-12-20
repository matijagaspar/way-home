import { getAppLogger } from './logger'
import { getSession } from './web/session'
import server_persistence from './server_persistence'
import { URL } from 'url'
const logger = getAppLogger('server', 'magenta')

export class RouteError extends Error {
  constructor (type, ...args) {
    super(...args)
    this.type = type
    Error.captureStackTrace(this, RouteError)
  }
}

const permissionHandler = (permissions, logger) => {
  if (!permissions || typeof permissions !== 'object') {
    logger.error('no permissions defined, all requests will be unauthorized')
    return () => false
  }

  const db = server_persistence()
  const { mode } = permissions
  switch (mode) {
    case 'hidden':
      return () => false
    case 'open':
      return () => true
    case 'basic': {
      return async (request_url, headers, _) => {
        // check for basic auth header
        if (!headers.authorization || headers.authorization.indexOf('Basic ') === -1) {
          throw new RouteError('expected_basic')
          //     if (res) {
          //         res.status(401).json({ message: 'Missing Authorization Header' })
          //     }
          //     return true
        }

        // verify auth credentials
        const base64Credentials = headers.authorization.split(' ')[1]
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
        const [username, password] = credentials.split(':')
        if (permissions.users && permissions.users[username] && permissions.users[username] === password) { // todo hash pass
          return true
        } else {
          throw new RouteError('expected_basic')
        }
      }
    }
    case 'session': {
      const pUsers = new Set(permissions.users)
      const pGroups = new Set(permissions.groups)

      return async (request_url, headers, use_session) => {
        // console.log('session test?')

        let session = null
        if (use_session) {
          session = use_session
        } else {
          session = await getSession(headers)
        }
        if (!session) throw new RouteError('expected_google_auth')
        const { user_id, domain } = session
        if (!user_id) throw new RouteError('expected_google_auth')

        if (pUsers.has(user_id)) return true

        let group_match = null

        if (domain) {
          const db_domain_user = db.get('user_domains').find({ domain }).value()
          if (db_domain_user) {
            const db_domain_groups = new Set(db_domain_user.groups)
            group_match = [...pGroups].find(x => db_domain_groups.has(x))
          }
        }

        const db_user = db.get('users').find({ email: user_id }).value()
        if (db_user) {
          const db_user_groups = new Set(db_user.groups)
          group_match = [...pGroups].find(x => db_user_groups.has(x))
        }

        if (!group_match) {
          throw new RouteError('expected_google_auth')
        }
        return true
      }
    }
    default:
      logger.error('No valid mode, all requests will be unauthorized')
      return () => { throw new RouteError('expected_google_auth') }
  }
  // { mode: 'session', groups: '', users: '' }
}

export default class AgentRegistry {
  constructor (root_url) {
    const parsed_url = new URL(root_url)

    this.root_url = root_url

    this.root_domain = parsed_url.host
    this.root_regex = new RegExp('(.*?)\\.?' + this.root_domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    this.logger = logger
    this.agents = {}
    this.apps = {}
  }

  agentStatus (agent_id, status) {
    if (this.agents[agent_id]) {
      this.agents[agent_id] = { status }
    }
  }

  updateAgentInfo (agent_id, info) {
    // check forbidden ()
    const { apps } = info
    const agentLogger = logger.child({ topic: `${agent_id}` })

    this.agents[agent_id] = { info, online: true }
    const agent_permissions = info.permissions

    for (const app_config of apps) {
      const { app_id } = app_config
      if (!app_id) {
        agentLogger.warn('Trying to register app without id')
      }
      // handle existing
      if (this.apps[app_id] && this.apps[app_id].agent !== agent_id) {
        agentLogger.warn(`app_id already exists: ${app_id} on ${this.apps[app_id].agent} `)
        continue
      }

      // do proper object deep merge
      app_config.isAuthorized = permissionHandler(app_config.permissions || agent_permissions, logger.child({ topic: `${agent_id}/${app_id}` }))
      // ability to override app visibility, uses agent permissions first, than app override visiblity
      if (app_config.visibility || agent_permissions) {
        // do proper object deep merge
        app_config.isVisible = permissionHandler(app_config.visibility || agent_permissions, logger.child({ topic: `${agent_id}/${app_id}` }))
      }
      // isVisible
      const staging_url = new URL(this.root_url)
      staging_url.host = app_id + '.' + this.root_domain

      const app_url = staging_url.toString()
      this.apps[app_id] = { color: info.color, ...app_config, agent: agent_id, app_id, app_url }
    }
  }

  async getAuthorizedApps (request_url, headers) {
    const session = await getSession(headers)
    if (!session) {
      return []
    }
    const authorizedApps = []
    for (const { isAuthorized, isVisible, ...app } of Object.values(this.apps)) {
      let isAppAuthorized = false
      try {
        if (isVisible) {
          isAppAuthorized = await isVisible(request_url, headers, session)
        } else {
          isAppAuthorized = await isAuthorized(request_url, headers, session)
        }
      } catch (e) {
        isAppAuthorized = false
      }
      if (isAppAuthorized && this.agents[app.agent].online) {
        authorizedApps.push(app)
      }
    }
    return authorizedApps
  }

  async getRoute (request_url, headers, res) {
    const { host } = headers
    const host_match = this.root_regex.exec(host)
    if (host_match) {
      const app_id = host_match[1]
      const app = this.apps[app_id]
      if (app) {
        // handle

        // const agent = this.agents[app.agent]

        const { isAuthorized, ...root_app_def } = app
        const authorized = await isAuthorized(request_url, headers, null)

        logger.debug(`host match: ${host_match} is auth: ${authorized}`)
        if (!authorized) {
          throw new RouteError('expected_google_auth')
        }
        return { ...root_app_def, type: 'remote_route' }
      } else {
        // error!
        logger.debug(request_url)
        logger.debug(host)
        logger.debug(host_match)
        throw new RouteError('no_app')
      }
    }
  }
}
