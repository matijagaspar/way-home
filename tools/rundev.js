'use strict'
/* eslint no-console: 0 */

const path = require('path')
const webpack = require('webpack')
const MemoryFileSystem = require('memory-fs')
const fs = new MemoryFileSystem()
const fse = require('fs-extra')
const os = require('os')
const cp = require('child_process')
const isWindows = os.platform() === 'win32'
const chalk = require('chalk')
const nextBuild = require('next/dist/build').default
const ora = require('ora')
let compilationSpinner
let child
let pp
// todo take options to do this!
const WEBPACK_CONF = require('../webpack.config.js')
const { compilation } = require('webpack')

const withDefineNodeEnv = (conf, mode) => {
  if (!conf.plugins) {
    conf.plugins = []
  }
  // conf.plugins = [ ...conf.plugins, new webpack.DefinePlugin({
  //     'process.env.NODE_ENV': JSON.stringify(mode),
  // }),

  // add shebang and hardcode node_env
  conf.plugins = [...conf.plugins,
    new webpack.BannerPlugin({ banner: `${mode === 'production' ? '#!/usr/bin/env node' : ''}\nprocess.env.NODE_ENV="${mode}"\n`, raw: true }), // ,
    new webpack.ProgressPlugin({
      modulesCount: 20,
      handler: (percentage, message, ...args) => {
        if (!compilationSpinner) {
          compilationSpinner = ora({ spinner: 'dots', text: 'Compiling' }).start()
        }
        if (percentage === 1 && compilationSpinner) {
          compilationSpinner.stop()
          compilationSpinner = null
        }
      },
    }),
    // new webpack.BannerPlugin({ banner: `;`, raw: true }),
  ]
  return conf
}

let lastHash
if (process.argv[2] === 'build') {
  (async () => {
    WEBPACK_CONF.mode = 'production'

    const compiler = webpack(withDefineNodeEnv(WEBPACK_CONF, WEBPACK_CONF.mode))
    await new Promise((res, rej) => {
      compiler.run(function (err, stats) {
        if (err) {
          console.log('build failed: ', err)
          return rej(err)
        }
        console.log(stats.toString({ colors: true }))
        console.log('built: ' + path.resolve(WEBPACK_CONF.output.path, WEBPACK_CONF.output.filename))
        res()
      })
    })

    // TODO: better output path definition
    const distFolder = WEBPACK_CONF.output.path
    // better app dir definition
    const nextControllerAppDir = path.resolve('./src/controller_app')

    // clean next files
    await fse.remove(path.resolve(distFolder, '.next'))
    await fse.remove(path.resolve(distFolder, 'public'))
    await fse.remove(path.resolve(nextControllerAppDir, '.next'))

    // production build next
    await nextBuild(nextControllerAppDir)

    // create next dist folder
    await fse.ensureDir(path.resolve(distFolder, '.next'))

    // get next build id
    const build_id = await require('fs').promises.readFile(path.join(nextControllerAppDir, '.next/BUILD_ID'))

    // prepare next files to copy to dist
    const filesToCopy = [
      '.next/server',
      '.next/static/chunks',
            `.next/static/${build_id}`,
            'public/static',
            ...require(path.join(nextControllerAppDir, '.next', 'required-server-files.json')).files,

    ]
    // copy next files
    for (const fileToCopy of filesToCopy) {
      await fse.copy(
        path.join(nextControllerAppDir, fileToCopy),
        path.resolve(distFolder, fileToCopy),
      )
    }
  })().then(() => console.log('Build done'))
} else {
  WEBPACK_CONF.mode = 'development'
  const compiler = webpack(withDefineNodeEnv(WEBPACK_CONF, WEBPACK_CONF.mode))
  compiler.outputFileSystem = fs

  // pp.stdout.pipe(process.stdoout)
  compiler.watch({ // watch options:
    aggregateTimeout: 500, // wait so long for more changes
  }, async function (err, stats) {
    if (compilationSpinner) {
      compilationSpinner.stop()
      compilationSpinner = null
    }
    if (err) {
      console.log('error:')
      console.log(err)
      console.log('------')
      return
    }

    if (stats.hasErrors()) {
      console.log(stats.toString({ colors: true }))
      return
    }

    // watch retriggers sometimes?
    if (stats.hash === lastHash) {
      return
    } else {
      lastHash = stats.hash
    }

    async function stopProcess (signal) {
      if (child) {
        // todo implement timeout!!
        await new Promise((res, rej) => {
          if (child.exitCode !== null) {
            return res()
          }
          console.log('got into stopping promise')
          child.removeAllListeners('exit')
          child.once('exit', (e) => {
            console.log('================ EXITED ' + (e || '') + ' ==================')
            res()
          })

          if (signal) {
            child.kill(child.id, signal)
          } else {
            //
            child.kill()
          }
        })
      }
    }

    await stopProcess('SIGINT')

    // console.log(stats.toString({version:true, colors:true}))
    const [n, r, ...rest_argvs] = process.argv

    child = cp.fork('./tools/worker.js', rest_argvs, { shell: true, stdio: 'pipe', env: { FORCE_COLOR: true, ...process.env } })// , process.argv)// ,[], {execArgv: [[ '--debug' ]]})
    // TODO: possibly inprove so pino is for sure dead!
    // if (pp && pp.exitCode === null) {
    //     console.log(pp)
    //     await new Promise((res, rej) => {
    //         // pp.removeAllListeners('exit')
    //         pp.once('exit', (e) => {
    //             // console.log('================ EXITED ' + (e || '') + ' ==================')
    //             res()
    //         })
    //         pp.kill()
    //     })
    // }

    pp = cp.spawn(path.resolve(process.cwd(), `node_modules/.bin/pino-pretty${isWindows && '.cmd'}`), { cwd: path.resolve(process.cwd()), stdio: ['pipe', 'inherit', 'inherit'] })// , { env: { FORCE_COLOR: true, ...process.env } })
    pp.on('error', function (err) {
      console.warn(`${chalk.yellow('WARN')}: pino-pretty failed: ${err.message}`)
    })
    child.stdout.pipe(pp.stdin)
    child.stderr.pipe(pp.stdin)
    // } else {
    //     child.stdout.pipe(process.stdout)
    //     child.stderr.pipe(process.stderr)
    // }
    // pp.stdin.pipe(child.stdout)
    // child.stdout.on('data', d => pp.stdin.write(d))
    console.log('============= STARTING WORKER ==============')

    // child.once('exit', (e) => {
    //     console.log('================ EXITED ' + (e || '') + ' ==================')
    //     // hmm?
    //     // stopProcess()
    // })
    const endEvents = [
      'SIGINT',
      'SIGTERM',
      'SIGHUP',
      'SIGQUIT',
      'uncaughtException',
    ]
    endEvents.forEach(event => child.on(event, stopProcess))

    const bundle_path = path.resolve(WEBPACK_CONF.output.path, WEBPACK_CONF.output.filename)
    console.log(bundle_path)
    const code = fs.readFileSync(bundle_path)
    const globals = {}
    child.once('message', () => {
      child.send({ globals, code: code.toString() })
    })
  })
}
