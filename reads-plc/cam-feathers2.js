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
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const logger = require('../lib/logger')
// jpeg, 2048x1536
const request = require('request')
// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    apiUrl: process.env.API_ORIGIN + process.env.API_PATHNAME,
    bearer: process.env.API_KEY
  }
})
const bearer = argv.bearer
if (!bearer) throw new Error('bearer required')
const service = argv.apiUrl + '/images'

const camList = [
  {
    prefix: 'cam1',
    albumId: '5d50734cdcb7d22aa7057a88',
    photoUrl:
      'http://plc:5ZHGwbbShBEzG2Kv@192.168.2.85/Streaming/channels/3/picture'
  },
  {
    prefix: 'cam2',
    albumId: '5d50734cdcb7d22aa7057a89',
    photoUrl:
      'http://plc:tssXr5DtJPdg1gCA@192.168.2.86/Streaming/channels/3/picture'
  },
  {
    prefix: 'cam3',
    albumId: '5d50734cdcb7d22aa7057a8a',
    photoUrl:
      'http://plc:pZZ4L3lqdGLyxiLZ@192.168.2.87/Streaming/channels/3/picture'
  },
  {
    prefix: 'cam4',
    albumId: '5d50734cdcb7d22aa7057a8b',
    photoUrl:
      'http://plc:H1gN9WURTvgBRBHj@192.168.2.88/Streaming/channels/3/picture'
  }
]

;(async () => {
  const result = await camList.reduce(async (p, s) => {
    const acc = await
    try {
      const result = await new Promise((resolve, reject) => {
        const formData = {
          // Pass a simple key-value pair
          timestamp: new Date().toJSON(),
          albumId: s.albumId,
          file: {
            value: request(s.photoUrl, { timeout: 1500 }, (err, res, body) => {
              if (err) reject(err)
            }),
            options: {
              // 'cam1-20190812-102939.jpg'
              filename: `${s.prefix}-${new Date()
                .toISOString()
                .replace(/[-:]/g, '')
                .replace(/\..+/, '')
                .replace(/T/, '-')}.jpg`,
              contentType: 'image/jpeg'
            }
          }
        }
        request.post(
          { url: service, formData, json: true, auth: { bearer } },
          (err, res, body) => {
            logger.debug(res.statusCode) // 201
            logger.debug(res.headers['content-type']) // 'application/json; charset=utf-8'
            if (err) {
              logger.error(err, { label: 'request.post' })
              reject(err)
            }
            logger.info(body, { label: 'request.post' })
            resolve(body)
          }
        )
      })
      acc.push(result)
    } catch (error) {
      acc.push(error)
    }
    return acc
  }, Promise.resolve([]))
  logger.info(result, { label: 'camList.reduce' })
})()
