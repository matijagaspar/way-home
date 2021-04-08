import React from 'react'
import PropTypes from 'prop-types'
import HTTPStatus from 'http-status'
import Head from 'next/head'

const styles = {
  error: {
    color: '#000',
    background: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, Roboto, "Segoe UI", "Fira Sans", Avenir, "Helvetica Neue", "Lucida Grande", sans-serif',
    height: '100vh',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },

  desc: {
    display: 'inline-block',
    textAlign: 'left',
    lineHeight: '49px',
    height: '49px',
    verticalAlign: 'middle',
  },

  h1: {
    display: 'inline-block',
    borderRight: '1px solid rgba(0, 0, 0,.3)',
    margin: 0,
    marginRight: '20px',
    padding: '10px 23px 10px 0',
    fontSize: '24px',
    fontWeight: 500,
    verticalAlign: 'top',
  },

  h2: {
    fontSize: '14px',
    fontWeight: 'normal',
    lineHeight: 'inherit',
    margin: 0,
    padding: 0,
  },
}

export default class Error extends React.Component {
  static getInitialProps ({ res, req, ...props }) {
    if (req && res) {
      const { err } = req.query || {}
      if (err && err.http_status) {
        res.statusCode = req.query.err.http_status
      }
      return { statusCode: res.statusCode, message: (err || {}).message }
    } else {
      return { statusCode: 400, message: 'Unknown Error' }
    }
  }

    static propTypes = {
      statusCode: PropTypes.number,
    }

    render () {
      const { statusCode, message } = this.props
      let title
      if (message) {
        title = message
      } else if (statusCode === 404) {
        title = 'This page could not be found'
      } else {
        title = HTTPStatus[statusCode]
      }

      return (
        <div style={styles.error}>
          <Head>
            <meta name='viewport' content='width=device-width, initial-scale=1.0' />
            <title>{statusCode}: {title}</title>
          </Head>
          <div>
            <style dangerouslySetInnerHTML={{ __html: 'body { margin: 0 }' }} />
            <If condition={statusCode}>
              <h1 style={styles.h1}>{statusCode}</h1>
            </If>
            <div style={styles.desc}>
              <h2 style={styles.h2}>{title}</h2>
            </div>
          </div>
        </div>
      )
    }
}
