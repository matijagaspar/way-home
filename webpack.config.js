const path = require('path')
const ROOT_DIR = process.cwd()
const fsReal = require('fs')

module.exports = {
    entry: 'index.js',
    // entry: { 'index.js': [ "babel-polyfill", 'index.js' ] },
    target: 'node',
    output: {
        path: path.resolve(ROOT_DIR, 'dist'),
        library: 'way-home',
        libraryTarget: 'commonjs2',
        filename: 'index.js',
    },
    devtool: 'inline-source-map',
    resolve: {
        modules: [ path.resolve(ROOT_DIR, 'src'), 'node_modules' ],
        extensions: [ '.ts', '.js', '.json' ],
    },
    externals: fsReal.readdirSync(path.resolve(ROOT_DIR, './node_modules')),
    node: {
        console: false,
        global: false,
        process: false,
        Buffer: false,
        __filename: false,
        __dirname: false,
        setImmediate: false,
    },
    optimization:{
        minimize: false,
    },
    module: {
        rules: [
            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader' },
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: [{
                    loader: 'babel-loader',
                }],
            },
            // {
            //     test: [ /\.js$/ ],
            //     enforce: 'post',
            //     exclude: /(node_modules|bower_components)/,
            //     loader: 'documentation',
            //     options: {
            //         entry: './assets/js/*.js .assets/js/**/*.js',
            //         github: true,
            //         format: 'html',
            //         output: './documentation/js',
            //     },
            // },

        ],
    },
}