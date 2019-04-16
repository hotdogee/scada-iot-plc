// node amqp-feathers.js --supervisor=goo.bio:3030 --ampqstr=amqp://localhost
//
// Network
// - Network disconnect/reconnect event handling
//
// Register controller id on first connect to server
// Controller status: online/offline
// View creates a new controller settings document with controller id as key
// Get controller settings from server
// - Name - String
// - Location - String
// - RTUs - List
//   - Name
//   - Type
//   - Address
//   - Devices - List (sensor and actuator)
//     - Name
//     - Type
//     - Address
//     - Min
//     - Max
// -
// -
// -
// Collect sensor data into json document every x seconds
// Write to csv file (10MB per file with total max size limit 8GB)
// Send to RabbitMQ where workers try to send to server
// (no data loss if internet fail, minimum data loss if power failure)
const config = require('config')
// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
    default: {
        'supervisor': config.get('supervisor.url'),
        'ampqstr': 'amqp://localhost',
    }
});
const feathers = require('feathers/client')
const socketio = require('feathers-socketio/client')
const hooks = require('feathers-hooks')
const errors = require('feathers-errors') // An object with all of the custom error types.
const auth = require('feathers-authentication-client')
const io = require('socket.io-client')
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
      }),
      new winston.transports.File({
        filename: 'error.log',
        level: 'error',
        maxsize: 4 * 1024 * 1024,
        maxFiles: 10,
      }),
    ]
});
const util = require('util');
const amqplib = require('amqplib');
const localStorage = require('node-persist')
// setup localStorage
localStorage.initSync();
localStorage.setItem = localStorage.setItemSync
localStorage.getItem = localStorage.getItemSync


const ioConfig = config.get('supervisor')
const socket = io("https://scada.hanl.in", {
  path: "/api/socket.io" // default: /socket.io
})

const supervisor = feathers()
  .configure(socketio(socket, { timeout: 10000 }))
  .configure(hooks())
  .configure(auth({
    storage: localStorage
  }))

supervisor.on('reauthentication-error', err => {
  logger.error('reauthentication-error:', err)
  process.exit()
})

;(async function amqpFeathers() {
  // console.log(localStorage.getItem('feathers-jwt'))
  // run login.js first to save jwt to localStorage
  var access_token = await supervisor.authenticate({
    strategy: 'jwt',
    accessToken: localStorage.getItem('feathers-jwt')
  }).catch(err => {
    logger.error('supervisor.authenticate:', err)
    process.exit()
  })
  logger.info(util.format('feathers authenticated: ', access_token))

  // logs service
  const logs = supervisor.service('logs')
  const params = {
    query: {
      // $select: [ 'id', 'logTime' ] // return only the id field
    }
  }

  // assert ampq reads exchange and bind to logger queue
  var ex_reads = 'reads'
  var q_feathers = 'feathers'

  // connect to ampq server, connection is a ChannelModel object
  // 'amqp://localhost'
  var connection = await amqplib.connect(argv.ampqstr).catch(err => {
    logger.error('amqplib.connect:', err)
    process.exit()
  })
  logger.info(util.format('%s connected', argv.ampqstr))

  // channel is a Channel object
  var channel = await connection.createChannel().catch(err => {
    logger.error('connection.createChannel:', err)
    process.exit()
  })
  logger.info(util.format('Channel created'))

  var ok = await channel.assertExchange(ex_reads, 'fanout')
  console.log('reads exchange:', ok) // { exchange: 'reads' }
  var ok = await channel.assertQueue(q_feathers)
  console.log('logger queue:', ok) // { queue: 'logger', messageCount: 0, consumerCount: 0 }
  var ok = await channel.bindQueue(q_feathers, ex_reads, '') // {}
  var ok = await channel.prefetch(1)
  var ok = await channel.consume(q_feathers, function (msg) { // { consumerTag: 'amq.ctag-f-KUGP6js31pjKFX90lCvg' }
    if (msg !== null) {
      logger.info(`Got message: ${msg.fields.deliveryTag}`)
      //console.log(msg.content.toString());
      // Traversal order of properties is fixed in ES6
      // http://exploringjs.com/es6/ch_oop-besides-classes.html#_traversal-order-of-properties
      let message = JSON.parse(msg.content.toString())

      logs.create(message, params).then(log => {
        // results adds a field: "_id": "DO5DyBX0lz4suuzi"
        logger.info(`logs.create: ${log.logTime} ${log._id}`)
        // acknowledge message sucessfully processed
        channel.ack(msg)
      }).catch(err => {
        logger.error('logs.create:', err)
        // requeue the message
        channel.nack(msg)
        // exit and let pm2 restart auth
        process.exit()
      })
    }
  })
})()
