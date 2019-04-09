const { createLogger, format, transports } = require('winston')
// const FluentTransport = require('fluent-logger').support.winstonTransport()
// const fluentTag = 'infans-api'
// const fluentConfig = {
//   host: process.env.FLUENT_HOST || 'fluentd',
//   port: process.env.FLUENT_PORT || 24224,
//   timeout: 3.0,
//   reconnectInterval: 600000 // 10 minutes
// }

const moduleExports = createLogger({
  // !code: level
  // To see more detailed errors, change this to debug'
  level: 'debug',
  // !end
  // !code: format
  format: format.combine(
    format.splat(),
    format.timestamp(),
    format.ms(),
    format.simple()
  ),
  // !end
  // !code: transport
  transports: [
    new transports.Console(),
    // new FluentTransport(fluentTag, fluentConfig)
  ]
  // !end
  // !code: moduleExports // !end
})
