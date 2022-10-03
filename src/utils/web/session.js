import { getAppLogger } from '../logger'
const session = require('express-session')
const MemoryStore = require('memorystore')(session)
const cookie = require('cookie')
const signature = require('cookie-signature')
const logger = getAppLogger('controller_session', 'cyan')
const cookie_secret = 'keyboard cat'
const cookie_name = 'connect.sid'
const debug = logger.debug

const sessionStore = new MemoryStore({
  checkPeriod: 300000, // 86400000, // prune expired entries every 24h
  ttl: 300000,
})

// const sessionStore = new RedisStore({})
export default ({domain, secure = false }) => session({
  store: sessionStore,
  saveUninitialized: false,
  rolling: true,
  resave: true,
  cookie: {
    secure,
    sameSite: false,
    maxAge: 500000,
    domain,
  },
  secret: cookie_secret,
})

export function getSession (headers) {
  const sessionID = getcookie(headers)
  return new Promise((resolve, reject) => {
    sessionStore.get(sessionID, function (err, sess) {
      if (!sess) {
        resolve(null)
      }
      if (err) {
        reject(err)
      }
      sessionStore.touch(sessionID, sess, function ontouch () {
        resolve(sess)
      })
    })
  })
}

function getcookie (headers) {
  const header = headers.cookie
  let raw
  let val

  // read from cookie header
  if (header) {
    const cookies = cookie.parse(header)

    raw = cookies[cookie_name]

    if (raw) {
      if (raw.substr(0, 2) === 's:') {
        val = unsigncookie(raw.slice(2), [cookie_secret])

        if (val === false) {
          debug('cookie signature invalid')
          val = undefined
        }
      } else {
        debug('cookie unsigned')
      }
    }
  }
  return val
}

/**
 * Verify and decode the given `val` with `secrets`.
 *
 * @param {String} val
 * @param {Array} secrets
 * @returns {String|Boolean}
 * @private
 */
function unsigncookie (val, secrets) {
  for (let i = 0; i < secrets.length; i++) {
    const result = signature.unsign(val, secrets[i])

    if (result !== false) {
      return result
    }
  }

  return false
}

// var cookieId = req.sessionID = getcookie(req, name, secrets);

/*        store.touch(req.sessionID, req.session, function ontouch(err) {
          if (err) {
            defer(next, err);
          }

          debug('touched');
          writeend();
        });
        */

/* store.get(req.sessionID, function(err, sess){/ */
