const dev = process.env.NODE_ENV !== 'production'
const path = require('path')

// console.log('is dev?', dev, __dirname)
module.exports = {
  dir: dev ? './src/controller_app' : path.resolve(__dirname, '../dist')/* , distDir: dev ? undefined : '../../dist/.next' */,
  dev,
  webpack5: false,
  conf: {

    webpack: c => {
      if (dev) {
        const fe = c.plugins.findIndex(p => {
          return p && !!p.compilationSuccessInfo
        })
        if (fe > -1) {
        // c.plugins[fe] = undefined
          c.plugins.splice(fe, 1)
        }
        const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin')

        c.plugins.push(new FriendlyErrorsWebpackPlugin({
          clearConsole: false,
          additionalFormatters: [errors => errors.map(e => `WEBPACK: ${e}`)],
        }))
      }
      // c.devServer = {
      //     quiet: false,
      // }
      // console.log(c.plugins)
      // c.plugins.push(new WebpackLoggerPlugin())

      return c
    },
  // webpackDevMiddleware: config => {
  //     // Perform customizations to webpack dev middleware config
  //     // config.log = true
  //     // config.stats = 'none'
  //     // config.quiet = false
  //     // config.logger = logger
  //     // console.log(logger )
  //     // Important: return the modified config
  //     return { ...config }
  // },
  },
}
