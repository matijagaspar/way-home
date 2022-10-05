import wsRouter from './utils/ws_router'
import { URL, URLSearchParams } from 'url'
import qs from 'querystring'
import appendControllerUI from './controller_app'
import sessionMiddleware from './utils/web/session'
import server_persistence from './utils/server_persistence'
import WebError, { webErrorHandler } from './utils/web/WebError'
import { authorize } from './utils/web/permissions'
import { getAppLogger } from './utils/logger'
import express from 'express'
import googleAuth from './utils/web/googleAuth'
import authAgent from './utils/web/authAgent'
import AgentRegistry, { RouteError } from './utils/AgentRegistry'
import bodyParser from 'body-parser'

import get from 'just-safe-get'
const logger = getAppLogger('server', 'magenta')
const jsonParser = bodyParser.json()

export default async function server (use_next) {
  // getControllerApp().then(web_app => {
  const web_app = express()
  const db = server_persistence()

  const { contoller_domain, controller_listen_port, controller_public_url, isSSL } = db.get('config').value()
  // const controller_url = `http:${ isSSL ? 's' : '' }//${ contoller_domain }:${ controller_port }/`

  const agentRegistry = new AgentRegistry(controller_public_url)

  const google_api_opts = db.get('google_api').value()
  //
  web_app.get('/beginGoogleAuth', (req, res, next) => {
    // this logs out when starting the login procedure, prevents wierd auth loops
    res.clearCookie('connect.sid', { path: '/', domain: contoller_domain })
    next()
  })
  web_app.get('/logout', function (req, res) {
    res.clearCookie('connect.sid', { path: '/', domain: contoller_domain })
    res.redirect('/')
  })

  web_app.use(sessionMiddleware({domain: contoller_domain, secure: isSSL}))
  // contoller_domain.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")
  // (.*?)\.?way-home\.si
  web_app.use(googleAuth({
    ...google_api_opts,
    verify: (accessToken, refreshToken, profile, cb) => {
      const email = (profile.emails.find(e => (e.type || '').toLowerCase() === 'account') || {}).value
      const domain = get(profile, '_json.domain')

      let authorized_user = {
        ...profile,
        is_authorized: false,
        main_email: email,
      }

      if (domain) {
        const domain_user = db.get('user_domains').find({ domain }).value()
        if (domain_user) {
          authorized_user = {
            ...authorized_user,
            is_authorized: true,
            domain: domain_user.domain,
            groups: domain_user.groups,
          }
        }
      }

      const user = db.get('users').find({ email }).value()
      if (user) {
        authorized_user = {
          ...authorized_user,
          is_authorized: true,
          groups: user.groups,
        }
      }
      if (email && authorized_user.is_authorized) {
        delete authorized_user.is_authorized
        cb(null, authorized_user)
      } else {
        cb(new WebError(403, 'GTFO'))
      }
      // console.log('user?', email, user)
    },
  }))

  web_app.use(function (req, res, next) {
    const query = new URLSearchParams({
      origin: req.originalUrl,
    })

    if (['/_next', '/login', '/authorize_agent'].some(t => req.url.startsWith(t))) {
      return next()
    }
    if (!req.session || !req.session.passport || !req.session.passport.user) {
      return res.redirect(`/login?${query.toString()}`)
    }
    next()
  })

  web_app.use(authAgent)

  const api = (req, res) => {
    return {
      getUsers: () => {
        authorize(['admin', 'super-user'])(req, res)
        return db.get('users').value()
      },
      setUser: () => {
        authorize(['admin', 'super-user'])(req, res)
        const { email, groups } = req.body
        if (!email || !groups || !Array.isArray(groups)) {
          throw new WebError(400, 'Bad request')
        }

        const user_to_change = db.get('users').find({ email })
        if (user_to_change.value()) {
          user_to_change.assign({ groups }).write()
        } else {
          db.get('users').push({ email, groups }).write()
        }

        res.json(db.get('users').value())
      },
      deleteUser: () => {
        authorize(['admin', 'super-user'])(req, res)
        const { email } = req.body
        if (!email) {
          throw new WebError(400, 'Bad request')
        }

        const user_to_change = db.get('users').find({ email })
        if (user_to_change.value()) {
          db.get('users')
            .remove({ email })
            .write()
        }
        res.json(db.get('users').value())
      },
      getGroups: () => {
        authorize(['admin', 'super-user'])(req, res)
        return db.get('user_groups').value()
      },
      getAuthorizedApps: () => {
        return agentRegistry.getAuthorizedApps(req.url, req.headers)
      },
    }
  }
  const apiMw = (apiName) => (req, res) => {
    const apiFn = res.locals.api[apiName]
    if (!apiFn) {
      throw new WebError(404, 'no such api')
    }
    return res.json(res.locals.api[apiName]())
  }

  web_app.use((req, res, next) => {
    res.locals.agentRegistry = agentRegistry
    res.locals.api = api(req, res)
    next()
  })

  web_app.get('/api/getAuthorizedApps', async (req, res) => {
    const authorizedApps = await agentRegistry.getAuthorizedApps(req.url, req.headers)
    res.json(authorizedApps)
  })// authorize
  web_app.get('/api/getUsers', apiMw('getUsers'))
  web_app.post('/api/deleteUser', jsonParser, apiMw('deleteUser'))
  web_app.post('/api/setUser', jsonParser, apiMw('setUser'))

  web_app.use('/', (req, res, next) => {
    res.locals.agentRegistry = agentRegistry
    res.locals.db = db
    next()
  })

  if (use_next) {
    await appendControllerUI(web_app)
  }
  web_app.use(webErrorHandler)

  const router = wsRouter({
    web_app,
    listen_port: controller_listen_port,
    onAgentDisconnect: (agent_id) => {
      agentRegistry.agentStatus(agent_id, false)
    },
    onAgentInfo: (agent_id, agent_info) => {
      agentRegistry.updateAgentInfo(agent_id, agent_info)
    },
    agentAuthorization: request => {
      const { authorized, agent_name } = qs.parse(request.url.split('?')[1])
      if (authorized && agent_name) {
        const authorized_agent = db.get('authorized_agents').find({ agent_name }).value()
        if (authorized_agent && authorized_agent.key === authorized) {
          // log?
          return true
        }
      }
      return false
    },
    getRoute: async (request_url, headers, controller_only) => {
      // const parsed_url = url_util.parse(`${isSSL?'https':'http'}://${ headers.host }`)
      const req_host = Array.isArray(headers.host) ? headers.host[0] : headers.host
      const parsed_url = new URL(`${isSSL ? 'https' : 'http'}://${req_host}${request_url}`)
      if (parsed_url.hostname === contoller_domain || parsed_url.hostname === 'localhost') {
        return {
          type: 'controller', // controller, //error
          // / request_handler //optional
        }
      } else if (controller_only) {
        return null
      } else {
        try {
          const app_route = await agentRegistry.getRoute(request_url, headers)

          return app_route
        } catch (e) {
          if (e instanceof RouteError) {
            switch (e.type) {
              case 'expected_google_auth': {
                const reddirectUrl = new URL(controller_public_url)
                reddirectUrl.pathname = '/beginGoogleAuth'
                return {
                  type: 'redirect',
                  url: reddirectUrl.href,
                  params: {
                    origin: parsed_url.href,
                  },
                }
              }
              case 'expected_basic': {
                return {
                  type: 'error',
                  status: 401,
                  headers: { 'WWW-Authenticate': 'Basic realm="Must provide basic auth"' },
                  message: 'Unauthorized',
                }
              }
              case 'no_app':
                return {
                  type: 'error',
                  status: 501,
                  message: 'Bad app',
                }
                            /* return {
                                // url, params, permanent
                                type: 'redirect',
                                url: controller_public_url + 'error',
                                params: {
                                    code: 501,
                                    message: 'No such app',
                                },

                            } */
                            // No Default
            }
          }
          logger.error('Error resolving route')
          logger.error(e)
          return {
            // url, params, permanent
            type: 'error',
            status: 500,
            message: 'Cpt. Sum Ting Wong',
          }

          // switch(e.type)
          /*
                    {
                    // url, params, permanent
                    type: 'redirect',
                    url: this.root_url + 'error',
                    params: {
                        code: 501,
                        message: 'No such app',
                    },

                } */
        }
        // console.log('approute', app_route)
      }
    },
  })
  // })
}
