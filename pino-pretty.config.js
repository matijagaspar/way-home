
const labelColorizer = require('pino-pretty/lib/colors')(true)
const chalk = require('chalk')

const colors = [
    'magenta',
    'cyan',
    'redBright',
    'greenBright',
    'yellowBright',
    'blueBright',
    'magentaBright',
    'cyanBright',
]

const level_paddings = {
    default: '',
    40: ' ',
    30: ' ',
}
const levelPadding = value => Object.prototype.hasOwnProperty.call(level_paddings, value.level) ? level_paddings[value.level] : level_paddings.default

function createHashDjb2 (str) {
    let hash = 5381
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) + hash + str.charCodeAt(i) /* hash * 33 + c */
    }
    return hash
}

module.exports = {
    // colorize: chalk.supportsColor,
    levelFirst: false,
    ignore: 'hostname,pid,name_color,time,name,level,topic,stack,type',
    messageFormat: l => {
        const name_color = l.name_color ? l.name_color : l.name ? colors[Math.abs(createHashDjb2(l.name) % colors.length)] : 'white'
        // do some log message customization
        return `${ labelColorizer(l.level) }${ levelPadding(l) }${ l.name ? ' ' : '' }${ chalk[name_color] ? chalk[name_color](l.name || '') : l.name || '' }${ l.topic ? chalk[colors[Math.abs(createHashDjb2(l.topic) % colors.length)]](` ${ l.topic }`) : '' }${ chalk.white(`: ${ l.msg }`) }`
    },
}
