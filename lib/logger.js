const { createLogger, format, transports } = require('winston')
const { inspect } = require('util')
// const FluentTransport = require('fluent-logger').support.winstonTransport()
// const fluentTag = 'infans-api'
// const fluentConfig = {
//   host: process.env.FLUENT_HOST || 'fluentd',
//   port: process.env.FLUENT_PORT || 24224,
//   timeout: 3.0,
//   reconnectInterval: 600000 // 10 minutes
// }
const consoleFormat = format.printf(({ timestamp, ms, label, level, message }) => {
  return `${timestamp} [${ms}] ${level}${label ? ' [' + label + ']' : ''} ${inspect(message, {
    compact: true,
    depth: 5,
    breakLength: 200,
    colors: true
  })}`
})

module.exports = createLogger({
  // !code: level
  // To see more detailed errors, change this to debug'
  level: 'debug',
  // !end
  // !code: format
  format: format.combine(
    format.splat(),
    format.timestamp(),
    format.ms(),
    format.colorize(),
    consoleFormat
  ),
  // !end
  // !code: transport
  transports: [
    new transports.Console(),
    new transports.File({
      filename: './errorlogs/errors.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    })
    // new FluentTransport(fluentTag, fluentConfig)
  ]
  // !end
  // !code: moduleExports // !end
})
