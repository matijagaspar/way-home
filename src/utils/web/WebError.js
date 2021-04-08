export default class WebError extends Error {
  constructor (http_status, ...args) {
    if (typeof http_status === 'string') {
      super(http_status, ...args)
      this.http_status = 500
    } else {
      super(...args)
      this.http_status = http_status
    }
    Error.captureStackTrace(this, WebError)
  }
}

export const webErrorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }
  res.status(err.http_status || 500)
  return next(err)
}
