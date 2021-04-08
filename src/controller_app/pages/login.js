import React from 'react'
import applyWrappers from '../lib/applyWrappers'
import Button from '@material-ui/core/Button'
import { withRouter } from 'next/router'
import { URLSearchParams } from 'whatwg-url'
import MidAlign from '../components/MidAlign'

const Login = applyWrappers(withRouter)((props) => {
  let auth_url = '/beginGoogleAuth'
  if (props.router.query) {
    const { origin } = props.router.query
    if (origin) {
      auth_url += '?' + (new URLSearchParams({ origin })).toString()
    }
  }
  return (
    <MidAlign>
      <Button onClick={() => props.router.push(auth_url)} color='primary' variant='outlined'>Login</Button>
    </MidAlign>
  )
},
)

export default Login
