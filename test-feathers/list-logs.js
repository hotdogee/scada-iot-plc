const feathers = require('feathers/client')
const socketio = require('feathers-socketio/client')
const hooks = require('feathers-hooks')
const errors = require('feathers-errors') // An object with all of the custom error types.
const auth = require('feathers-authentication-client')
const io = require('socket.io-client')
const config = require('config')
const winston = require('winston')
const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
        // setup console logging with timestamps
        level: 'debug',
        timestamp: function() {
          return (new Date()).toISOString();
        },
        formatter: function(options) {
          return options.timestamp() + ' ' + options.level[0].toUpperCase() + ' ' + (options.message ? options.message : '') +
            (options.meta && Object.keys(options.meta).length ? JSON.stringify(options.meta, null, 2) : '' )
        }
      })
    ]
})
// const Storage = require('dom-storage')
// var localStorage = new Storage('./localStorage.json')
const localStorage = require('node-persist')
// setup localStorage
localStorage.initSync();
localStorage.setItem = localStorage.setItemSync
localStorage.getItem = localStorage.getItemSync

logger.info(`Connecting to feathers server: ${config.get('supervisor.url')}`)
const socket = io(config.get('supervisor.url'))

const supervisor = feathers()
  .configure(socketio(socket))
  .configure(hooks())
  .configure(auth({
    storage: localStorage
  }))

// console.log(localStorage.getItem('feathers-jwt'))
// run login.js first to save jwt to localStorage
//supervisor.service('users').find().then(results => logger.info('Users: ', results))
supervisor.authenticate({
  strategy: 'jwt',
  accessToken: localStorage.getItem('feathers-jwt')
}).then(response => {
  logger.debug(response)
  // get logs
  const logs = supervisor.service('logs')
  const params = {
    query: {
      $limit: 10,
      $select: [ 'logTime' ], // return only the id field
      $sort: {
        logTime: -1
      }
      // logTime: {
      //   $gt: new Date((new Date().getTime() - 1*60*1000)).toISOString() // find all logs within 1 minute
      // }
    }
  }
  let start = new Date()
  logs.find(params).then(results => {
    let elapsed = new Date() - start
    logger.info('Logs: ', results)
    logger.info(`Elapsed: ${elapsed} ms`)
    process.exit()
  }).catch(err => {
    logger.error('logs.find:', err)
    process.exit()
  })
}).catch(err => {
  logger.error('supervisor.authenticate:', err)
  process.exit()
})
