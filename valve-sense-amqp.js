// examples
// sudo node test/manual-valve-control-pigpio.js
// sudo node test/manual-valve-control-pigpio.js --wait 1000
// sudo node test/manual-valve-control-pigpio.js --relay 18 --button 22 --wait 1000

// RPi Relay Board
// All the terminals are low active
// CH1 - GPIO26 - PIN37
// CH2 - GPIO20 - PIN38
// CH3 - GPIO21 - PIN40

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'wait': 500, // valve state changes can not happen more than one in 500ms
    'amqpUrl': 'amqp://localhost'
  }
})
const logger = require('./lib/logger')
const amqplib = require('amqplib')
const util = require('util')
const imu = require("../../nodeimu")
const IMU = new imu.IMU()

const print_vector3 = function(name, data) {
  const sx = data.x >= 0 ? ' ' : '';
  const sy = data.y >= 0 ? ' ' : '';
  const sz = data.z >= 0 ? ' ' : '';
  return util.format('%s: %s%s %s%s %s%s ', name, sx, data.x.toFixed(4), sy, data.y.toFixed(4), sz, data.z.toFixed(4));
}

const ex_commands = 'commands'
const routingKey = 'plc1.shutoff_valve1'

(async function () {
  try {
    // connect to ampq server, connection is a ChannelModel object
    // 'amqp://localhost'
    const connection = await amqplib.connect(argv.amqpUrl).catch(err => {
      logger.error('amqplib.connect: %s', err)
      process.exit()
    })
    logger.info('%s connected', argv.amqpUrl)

    // channel is a Channel object
    const channel = await connection.createChannel().catch(err => {
      logger.error('connection.createChannel: %s', err)
      process.exit()
    })
    logger.info('Channel created')
    const ex = await channel.assertExchange(ex_commands, 'topic', {durable: false})
    logger.info('assertExchange: %s', ex) // { exchange: 'reads' }
    const msg = {
      shutoff_valve1: {
        state: 0
      }
    }
    const callb = (err, data) => {
      if (err !== null) {
        console.error("Could not read sensor data: ", err)
        return;
      }
      // console.log("Accelleration is: ", JSON.stringify(data.accel, null, "  "));
      // console.log("Gyroscope is: ", JSON.stringify(data.gyro, null, "  "));
      // console.log("Compass is: ", JSON.stringify(data.compass, null, "  "));
      // console.log("Fusion data is: ", JSON.stringify(data.fusionPose, null, "  "));

      // console.log("Temp is: ", data.temperature);
      // console.log("Pressure is: ", data.pressure);
      // console.log("Humidity is: ", data.humidity);
      if (data.humidity > 40) {
        console.log(util.format('%s %s %s %s', print_vector3('Accel', data.accel), data.temperature.toFixed(4), data.pressure.toFixed(4), data.humidity.toFixed(4)))
        channel.publish(ex_commands, routingKey, new Buffer(msg))
      }
      setTimeout(function() { IMU.getValue(callb) }, 100)
    }
    IMU.getValue(callb)
  } catch (error) {
    logger.error(e)
    process.exit()
  }
})()
