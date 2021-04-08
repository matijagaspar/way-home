
import { getAppLogger } from './utils/logger'
import express from 'express'
import request from 'request-promise-native'
import WebSocket from 'ws'
export default function mock () {
  const wss = new WebSocket.Server({ port: 9921 })

  wss.on('connection', function connection (ws) {
    ws.on('message', function incoming (message) {
      console.log('received: %s', message)
    })

    ws.send('something')
  })

  const demo_app1 = express()
  const demo_app1_logger = getAppLogger('demo_app1')
  const demo_app_response = 'Hello from demo_app1!'
  demo_app1.get('/*', (req, res) => {
    demo_app1_logger.debug(`Requested ${req.hostname} path: '${req.originalUrl}'`)
    res.send(demo_app_response)
  })
  demo_app1.listen(3003, () => {
    demo_app1_logger.debug('demo_app1 listening on port 3003!')

    request('http://localhost:8080/', { headers: { Host: 'demo_app1.way-home.si' } }).then(r => {
      if (r === demo_app_response) {
        demo_app1_logger.debug('Request test passed!')
      } else {
        demo_app1_logger.error('Request test failed\n Response: ' + r)
      }
    }).catch(e => {
      demo_app1_logger.error('Request test failed: ' + e)
    })
  })

  const demo_app2 = express()
  const demo_app2_logger = getAppLogger('demo_app2')
  const demo_app2_response = 'Hello from demo_app2!'
  demo_app2.get('/*', (req, res) => {
    demo_app2_logger.debug(`Requested ${req.hostname} path: '${req.originalUrl}'`)
    res.send(demo_app2_response)
  })
  demo_app2.listen(3004, () => {
    demo_app2_logger.debug('demo_app2 listening on port 3004!')

    request('http://localhost:8080/', { headers: { host: 'demo_app2.way-home.si' } }).then(r => {
      if (r === demo_app2_response) {
        demo_app2_logger.debug('Request test passed!')
      } else {
        demo_app2_logger.error('Request test failed\n Response: ' + r)
      }
    }).catch(e => {
      demo_app2_logger.error('Request test failed: ' + e)
    })
  })
}
