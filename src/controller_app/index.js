import express from 'express'

import next from 'next'
import WebError from '../utils/web/WebError'

export default async function appendControllerApp (root_app) {
  const next_app = next(require('./next_config'))
  const app_ui = express()
  const handle = next_app.getRequestHandler()
  root_app.get('/error', (req, res, next) => {
    // :err_code([4-5]{1}\\d{2})
    const { code, message } = req.query
    if (!code || !message) {
      throw new WebError(400, 'bad request')
    }

    throw new WebError(Number(code), message)
  })

  await next_app.prepare()

  app_ui.get('*', (req, res) => {
    return handle(req, res)
  })

  root_app.use(app_ui)

  root_app.use((err, req, res, next) => {
    let queryParams = Object.assign(req.query, req.params)
    queryParams = Object.assign(queryParams, { err })
    return next_app.render(req, res, '/_error', queryParams)
  })
}
