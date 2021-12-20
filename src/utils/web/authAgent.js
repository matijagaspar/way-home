
import express from 'express'
import WebError from './WebError'
import { getAppLogger } from '../logger'

import server_persistence from '../server_persistence'
const s_pin = require('secure-pin')
const auth_code_cs = new s_pin.CharSet()
auth_code_cs.addLowerCaseAlpha().addUpperCaseAlpha().addNumeric().randomize()
const web_app = express()
const agent_verifications = {}
const logger = getAppLogger('server', 'magenta')

web_app.get('/verify_agent', (req, res, next) => {
  const { pin, agent_name } = req.query

  // res.locals.verified_agent = agent_name
  // return next()

  // todo: make util method loginRedirect(req,res)
  const db_user_groups = new Set(req.session.passport.user.groups)
  const group_match = ['admin', 'super-user', agent_name].find(x => db_user_groups.has(x))
  if (!db_user_groups || !group_match) {
    throw new WebError(403, `${req.session.passport.user.main_email} not authorized to add '${agent_name}'`)
  }

  if (!pin) {
    throw new WebError(400, 'No Pin')
  }
  if (!agent_name) {
    throw new WebError(400, 'No agent name')
  }
  const agent_verification = agent_verifications[agent_name]

  if (agent_verification && pin === agent_verification.pin) {
    res.locals.verified_agent = agent_name
    next()

    s_pin.generateString(10, auth_code_cs, pin => {
      const db = server_persistence()
      const existing_authorized_agent = db.get('authorized_agents').find({ agent_name })
      if (existing_authorized_agent.value()) {
        existing_authorized_agent.assign({ agent_name, key: pin }).write()
      } else {
        db.get('authorized_agents')
          .push({ agent_name, key: pin })
          .write()
      }

      agent_verification.success(pin)
    })
  } else {
    if (agent_verification && pin !== agent_verification.pin) {
      logger.warn(`Invalid ${agent_name} agent verification, pin not matching`)
    } else {
      logger.warn(`Invalid ${agent_name} agent verification`)
    }
    throw new WebError(400, 'Bad agent verification')
  }
})
web_app.get('/authorize_agent', (req, res) => {
  const sendChunk = obj => {
    res.write(JSON.stringify(obj) + '\n')
  }
  const { agent_name } = req.query
  if (!agent_name) {
    throw new WebError(400, 'No agent name')
  }

  if (agent_verifications[agent_name]) {
    agent_verifications[agent_name].fail('new auth request for ' + agent_name)
  }

  const failTimeout = setTimeout(() => {
    if (agent_verifications[agent_name]) {
      agent_verifications[agent_name].fail(`${agent_name} timeout: no verify after 60s`)
    }
  }, 60000)

  agent_verifications[agent_name] = {

    fail: (message) => {
      delete agent_verifications[agent_name]
      logger.warn(`${agent_name} failed to authorize: ${message}`)
      sendChunk({
        type: 'error',
        message,
      })
      res.end()
    },
    success: code => {
      delete agent_verifications[agent_name]
      clearTimeout(failTimeout)
      logger.info(`${agent_name} successfuly authorized`)
      sendChunk({
        type: 'success',
        code,
      })
      res.end()
    },
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=UTF-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Transfer-Encoding': 'chunked',
  })
  // it probably should be there in time?
  s_pin.generatePin(5, pin => {
    agent_verifications[agent_name].pin = pin
    sendChunk({ type: 'pin', pin })
  })
})

export default web_app
