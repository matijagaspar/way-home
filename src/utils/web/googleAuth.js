
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import express from 'express'

export default function googleAuth ({ clientID, clientSecret, callbackURL, verify }) {
  passport.use(new GoogleStrategy({ clientID, clientSecret, callbackURL }, verify || ((accessToken, refreshToken, profile, cb) => cb(null, profile))))
  passport.serializeUser(function (user, done) {
    done(null, user)
  })

  passport.deserializeUser(function (user, done) {
    done(null, user)
  })

  const auth_app = express()
  auth_app.disable('x-powered-by')

  auth_app.use(passport.initialize())
  auth_app.use(passport.session())

  auth_app.get('/beginGoogleAuth', (req, res, next) => {
    let state = req.query.state
    if (!state && req.query.origin) {
      state = Buffer.from(JSON.stringify({
        origin: req.query.origin,
      })).toString('base64')
    }

    passport.authenticate('google', { scope: ['profile', 'email'], ux_mode: 'popup', state })(req, res, next)
  })

  auth_app.get('/googleCallback',
    passport.authenticate('google', { failureRedirect: '/error' }),
    function (req, res) {
      let redirect = '/'
      if (req.query.state) {
        const stateObj = JSON.parse(Buffer.from(req.query.state, 'base64').toString())
        if (stateObj && stateObj.origin) {
          redirect = stateObj.origin
        }
      }

      if (!req.session || !req.session.user_id) {
        // todo use get!
        const account_email = req.session.passport.user.emails.find(e => (e.type || '').toLowerCase() === 'account')
        const domain = req.session.passport.user.domain
        if (domain) {
          req.session.domain = domain
        }
        if (account_email) {
          req.session.user_id = account_email.value
        }
      }
      res.redirect(redirect)
    })
  return auth_app
}
