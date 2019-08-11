// node amqp-feathers.js --supervisor=goo.bio:3030 --ampqstr=amqp://localhost
//
// Steps
// - Get jpeg from camera
// - Upload to supervisor
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
// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'supervisorUrl': process.env.API_URL,
    'cam1PhotoUrl': process.env.CAM1_PHOTO_URL
  }
})
const fs = require('fs')
// jpeg, 2048x1536
const request = require('request')

const blobService = 'https://scada.hanl.in/api' + '/blob'
const cam1 = 'http://plc:5ZHGwbbShBEzG2Kv@192.168.2.85/Streaming/channels/3/picture'
const req = request
  .get('http://plc:5ZHGwbbShBEzG2Kv@192.168.2.85/Streaming/channels/1/picture')
  .on('response', function (response) {
    if (response.statusCode === 200) {
      console.log(response.statusCode) // 200
      console.log(response.headers['content-type']) // 'image/png'
      const formData = {
        // Pass a simple key-value pair
        type: 'image',
        metadata: {
          name: 'cam1'
        },
        timestamp: new Date(),
        file: req
      }
      request.post({ url: blobService, formData }, function (err, httpResponse, body) {
        if (err) {
          return console.error('upload failed:', err)
        }
        console.log('Upload successful!  Server responded with:', body)
      })
    } else {
      console.error(response.statusCode) // 200
      console.error(response.headers['content-type']) // 'image/png'
    }
  })
  .on('error', function (err) {
    console.error(err)
  })

let req = request.get('http://192.168.2.85/Streaming/channels/1/picture').on('end', () => {console.log('end')}).on('response', function (response) { console.log(response.statusCode); console.log(response.headers['content-type']); if (response.statusCode === 200) req.pipe(fs.createWriteStream('cam3.jpg'))}).on('error', function (err) { console.error(err) })
request.get(cam1).on('end', () => {console.log('end')}).on('response', function (response) { console.log(response.statusCode); console.log(response.headers['content-type']) }).on('error', function (err) { console.error(err) })

request.get('http://192.168.2.85/Streaming/channels/1/picture').on('response', function (response) { console.log(response.statusCode); if (response.statusCode !== 200) this.pause(); console.log(response.headers['content-type']) }).on('error', function (err) { console.error(err) }).pipe(fs.createWriteStream('cam1.jpg'))

request('http://plc:5ZHGwbbShBEzG2Kv@192.168.2.85/Streaming/channels/2/picture').pipe(fs.createWriteStream('cam1.jpg'))

request('http://plc:5ZHGwbbShBEzG2Kv@192.168.2.85/Streaming/channels/3/picture').pipe(fs.createWriteStream('cam1.jpg'))

request(cam1, function (error, response, body) {
  console.error('error:', error) // Print the error if one occurred
  console.log('statusCode:', response && response.statusCode) // Print the response status code if a response was received
  // console.log('body:', body); // Print the HTML for the Google homepage.
})

const formData = {
  // Pass a simple key-value pair
  type: 'image',
  metadata: {
    name: 'cam1'
  },
  timestamp: new Date(),
  file: request(cam1)
}
request.post({ url: supervisorUrl, formData }, function (err, httpResponse, body) {
  if (err) {
    return console.error('upload failed:', err)
  }
  console.log('Upload successful!  Server responded with:', body)
})

const feathers = require('feathers/client')
const socketio = require('feathers-socketio/client')
const hooks = require('feathers-hooks')
// const errors = require('feathers-errors') // An object with all of the custom error types.
const auth = require('feathers-authentication-client')
const io = require('socket.io-client')
const logger = require('../lib/logger')
const util = require('util')
const localStorage = require('node-persist')
// setup localStorage
localStorage.initSync()
localStorage.setItem = localStorage.setItemSync
localStorage.getItem = localStorage.getItemSync

// const ioConfig = config.get('supervisor')
const socket = io('https://scada.hanl.in', {
  path: '/api/socket.io' // default: /socket.io
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

;(async function () {
  // console.log(localStorage.getItem('feathers-jwt'))
  // run login.js first to save jwt to localStorage
  var accessToken = await supervisor.authenticate({
    strategy: 'jwt',
    accessToken: localStorage.getItem('feathers-jwt')
  }).catch(err => {
    logger.error('supervisor.authenticate:', err)
    process.exit()
  })
  logger.info(util.format('feathers authenticated: ', accessToken))

  // logs service
  const logs = supervisor.service('images')
  const params = {
    query: {
      // $select: [ 'id', 'logTime' ] // return only the id field
    }
  }

  logs.create(message, params).then(log => {
    // results adds a field: "_id": "DO5DyBX0lz4suuzi"
    logger.info(`logs.create: ${log.logTime} ${log._id}`)
  }).catch(err => {
    logger.error('logs.create:', err)
    // exit and let pm2 restart auth
    process.exit()
  })
})()
