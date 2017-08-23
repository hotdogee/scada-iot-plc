const feathers = require('feathers/client')
const socketio = require('feathers-socketio/client')
const io = require('socket.io-client')
const config = require('config')
const winston = require('winston')
var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
        // setup console logging with timestamps
        level: 'debug',
        timestamp: function() {
          return (new Date()).toISOString();
        },
        formatter: function(options) {
          return options.timestamp() + ' ' + options.level[0].toUpperCase() + ' ' + (options.message ? options.message : '') +
            (options.meta && Object.keys(options.meta).length ? JSON.stringify(options.meta, null, 2) : '' );
        }
      })
    ]
});

const socket = io(config.get('supervisor.url'))

const supervisor = feathers()
  .configure(socketio(socket))

const logs = supervisor.service('logs')
const params = {
  query: {
    $limit: 1,
    $sort: {
      logTime: -1
    }
  }
}
logs.find(params).then(results => {
  logger.info('Logs: ', results)
  process.exit()
}).catch(err => {
  logger.error('logs.find:', err)
  process.exit()
})
