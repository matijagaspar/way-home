const vm = require('vm')
const mLib = require('module')
// require('babel-polyfill')
process.once('message', cont => {
    const { code } = cont
    vm.runInThisContext(mLib.wrap(code))(exports, require, module, __filename, __dirname)

})

process.send('ready')
