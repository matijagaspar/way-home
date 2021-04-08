import React from 'react'
import PropTypes from 'prop-types'
import { withStyles, MuiThemeProvider } from '@material-ui/core/styles'
import CssBaseline from '@material-ui/core/CssBaseline'
import getMUIPageContext from './getMUIPageContext'
import { global_style } from '../style/mui_theme'
import { ThemeProvider } from 'styled-components'

let AppWrapper = props => props.children

// add global styles
AppWrapper = withStyles(global_style)(AppWrapper)

function withMUI (Component) {
  class WithMUI extends React.Component {
    constructor (props, context) {
      super(props, context)

      this.muiPageContext = this.props.muiPageContext || getMUIPageContext()
    }

    componentDidMount () {
      // Remove the server-side injected CSS.
      const jssStyles = document.querySelector('#jss-server-side')
      if (jssStyles && jssStyles.parentNode) {
        jssStyles.parentNode.removeChild(jssStyles)
      }
    }

        muiPageContext = null;

        render () {
        // MuiThemeProvider makes the theme available down the React tree thanks to React context.
          return (
            <MuiThemeProvider
              theme={this.muiPageContext.theme}
              sheetsManager={this.muiPageContext.sheetsManager}
            >
              {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
              <CssBaseline />
              <AppWrapper>
                <ThemeProvider theme={this.muiPageContext.theme}>
                  <Component {...this.props} />
                </ThemeProvider>
              </AppWrapper>
            </MuiThemeProvider>
          )
        }
  }

  WithMUI.propTypes = {
    pageContext: PropTypes.object,
  }

  WithMUI.getInitialProps = ctx => {
    if (Component.getInitialProps) {
      return Component.getInitialProps(ctx)
    }

    return {}
  }

  return WithMUI
}

export default withMUI
