// node rtu-amqp.js --serial=auto --ampqstr=amqp://localhost
//
// Serial
// - Auto detect
//   - If only one serial port is detected, use it
//   - If multiple serial ports are detected, list serial ports, print help and exit
// - USB serial disconnect/reconnect event handling
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
// Write to csv file (100MB per file with total max size limit)
// Send to RabbitMQ where workers try to send to server
// (no data loss if internet fail, minimum data loss if power failure)
//
// node rtu-amqp.js --serial=/dev/ttyUSB0
// sudo node grid-plc/rtu2-amqp2.js --serial /dev/ttyUSB0 --amqpUrl
// sudo node grid-plc/rtu2-amqp2.js --serial /dev/ttyUSB0

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    serial: 'auto',
    amqpUrl: 'amqp://localhost'
  }
})

const logger = require('../lib/logger')
const getUuid = require('../lib/getUuid')
const getSerial = require('../lib/getSerial')
const os = require('os')
// const config = require('config')
// const util = require('util')
// const _ = require('lodash')
const { flatten } = require('lodash')
const SerialPort = require('serialport')
const modbus = require('modbus-rtu')
const amqplib = require('amqplib')

function getPlcSettings () {
  return {
    name: 'Geo9',
    location: '宜蘭清水九號井',
    rtus: [
      // {
      //   name: '併接點',
      //   type: 'nhr3800',
      //   addr: 70,
      //   fc03: [
      //     {
      //       addr: 256,
      //       name: '頻率',
      //       unit: 'Hz',
      //       min: 0,
      //       max: 100
      //     }
      //   ]
      // },
      {
        name: '發電機300kVA',
        type: 'nhr3800',
        addr: 71,
        fc03: [
          {
            addr: 256,
            name: '頻率',
            unit: 'Hz',
            min: 0,
            max: 100
          }
        ]
      },
      {
        name: '併接點',
        type: 'nhr3500',
        addr: 72,
        cmds: [
          {
            code: 3,
            start: 0x106,
            len: 46,
            regs: [
              {
                addr: 0x106,
                name: 'AB線電壓',
                factor: 100,
                unit: 'V',
                type: 'readInt32BE'
              },
              {
                addr: 0x108,
                name: 'BC線電壓',
                factor: 100,
                unit: 'V',
                type: 'readInt32BE'
              },
              {
                addr: 0x10A,
                name: 'CA線電壓',
                factor: 100,
                unit: 'V',
                type: 'readInt32BE'
              },
              {
                addr: 0x10C,
                name: 'A相電流',
                factor: 1000,
                unit: 'A',
                type: 'readInt32BE'
              },
              {
                addr: 0x10E,
                name: 'B相電流',
                factor: 1000,
                unit: 'A',
                type: 'readInt32BE'
              },
              {
                addr: 0x110,
                name: 'C相電流',
                factor: 1000,
                unit: 'A',
                type: 'readInt32BE'
              },
              {
                addr: 0x118,
                name: '有功功率',
                factor: 10,
                unit: 'W',
                type: 'readFloatBE'
              },
              {
                addr: 0x120,
                name: '無功功率',
                factor: 10,
                unit: 'var',
                type: 'readFloatBE'
              },
              {
                addr: 0x128,
                name: '視在功率',
                factor: 10,
                unit: 'VA',
                type: 'readFloatBE'
              },
              {
                addr: 0x130,
                name: '功率因數',
                factor: 10,
                unit: '%',
                type: 'readInt32BE'
              },
              {
                addr: 0x132,
                name: '頻率',
                factor: 1000,
                unit: 'Hz',
                type: 'readInt32BE'
              }
            ]
          },
          {
            code: 3,
            start: 0x600,
            len: 14,
            regs: [
              {
                addr: 0x600,
                name: '正有功電量',
                factor: 100,
                unit: 'kWh',
                type: 'readInt32BE'
              },
              {
                addr: 0x602,
                name: '負有功電量',
                factor: 100,
                unit: 'kWh',
                type: 'readInt32BE'
              },
              {
                addr: 0x604,
                name: '正無功電量',
                factor: 100,
                unit: 'kvarh',
                type: 'readInt32BE'
              },
              {
                addr: 0x606,
                name: '負無功電量',
                factor: 100,
                unit: 'kvarh',
                type: 'readInt32BE'
              },
              {
                addr: 0x608,
                name: '有功電量',
                factor: 100,
                unit: 'kWh',
                type: 'readInt32BE'
              },
              {
                addr: 0x60A,
                name: '無功電量',
                factor: 100,
                unit: 'kvarh',
                type: 'readInt32BE'
              },
              {
                addr: 0x60C,
                name: '視在電量',
                factor: 100,
                unit: 'kVAh',
                type: 'readInt32BE'
              }
            ]
          },
          {
            code: 3,
            start: 0x1100,
            len: 30,
            regs: [
              {
                addr: 0x1100,
                name: 'A相電流諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x1120,
            len: 30,
            regs: [
              {
                addr: 0x1120,
                name: 'B相電流諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x1140,
            len: 30,
            regs: [
              {
                addr: 0x1140,
                name: 'C相電流諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x11C0,
            len: 30,
            regs: [
              {
                addr: 0x11C0,
                name: 'A相電壓諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x11E0,
            len: 30,
            regs: [
              {
                addr: 0x11E0,
                name: 'B相電壓諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x1200,
            len: 30,
            regs: [
              {
                addr: 0x1200,
                name: 'C相電壓諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          }
        ]
      },
      {
        name: '發電機300kVA',
        type: 'nhr3500',
        addr: 73,
        cmds: [
          {
            code: 3,
            start: 0x106,
            len: 44,
            regs: [
              {
                addr: 0x106,
                name: 'AB線電壓',
                factor: 100,
                unit: 'V',
                type: 'readInt32BE'
              },
              {
                addr: 0x108,
                name: 'BC線電壓',
                factor: 100,
                unit: 'V',
                type: 'readInt32BE'
              },
              {
                addr: 0x10A,
                name: 'CA線電壓',
                factor: 100,
                unit: 'V',
                type: 'readInt32BE'
              },
              {
                addr: 0x10C,
                name: 'A相電流',
                factor: 1000,
                unit: 'A',
                type: 'readInt32BE'
              },
              {
                addr: 0x10E,
                name: 'B相電流',
                factor: 1000,
                unit: 'A',
                type: 'readInt32BE'
              },
              {
                addr: 0x110,
                name: 'C相電流',
                factor: 1000,
                unit: 'A',
                type: 'readInt32BE'
              },
              {
                addr: 0x118,
                name: '有功功率',
                factor: 10,
                unit: 'W',
                type: 'readFloatBE'
              },
              {
                addr: 0x120,
                name: '無功功率',
                factor: 10,
                unit: 'var',
                type: 'readFloatBE'
              },
              {
                addr: 0x128,
                name: '視在功率',
                factor: 10,
                unit: 'VA',
                type: 'readFloatBE'
              },
              {
                addr: 0x130,
                name: '功率因數',
                factor: 10,
                unit: '%',
                type: 'readInt32BE'
              }
            ]
          },
          {
            code: 3,
            start: 0x600,
            len: 14,
            regs: [
              {
                addr: 0x600,
                name: '正有功電量',
                factor: 100,
                unit: 'kWh',
                type: 'readInt32BE'
              },
              {
                addr: 0x602,
                name: '負有功電量',
                factor: 100,
                unit: 'kWh',
                type: 'readInt32BE'
              },
              {
                addr: 0x604,
                name: '正無功電量',
                factor: 100,
                unit: 'kvarh',
                type: 'readInt32BE'
              },
              {
                addr: 0x606,
                name: '負無功電量',
                factor: 100,
                unit: 'kvarh',
                type: 'readInt32BE'
              },
              {
                addr: 0x608,
                name: '有功電量',
                factor: 100,
                unit: 'kWh',
                type: 'readInt32BE'
              },
              {
                addr: 0x60A,
                name: '無功電量',
                factor: 100,
                unit: 'kvarh',
                type: 'readInt32BE'
              },
              {
                addr: 0x60C,
                name: '視在電量',
                factor: 100,
                unit: 'kVAh',
                type: 'readInt32BE'
              }
            ]
          },
          {
            code: 3,
            start: 0x1100,
            len: 30,
            regs: [
              {
                addr: 0x1100,
                name: 'A相電流諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x1120,
            len: 30,
            regs: [
              {
                addr: 0x1120,
                name: 'B相電流諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x1140,
            len: 30,
            regs: [
              {
                addr: 0x1140,
                name: 'C相電流諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x11C0,
            len: 30,
            regs: [
              {
                addr: 0x11C0,
                name: 'A相電壓諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x11E0,
            len: 30,
            regs: [
              {
                addr: 0x11E0,
                name: 'B相電壓諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x1200,
            len: 30,
            regs: [
              {
                addr: 0x1200,
                name: 'C相電壓諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          }
        ]
      }
    ]
  }
}

// NHR Series Meter
// function s16_float_le_2 (buffer) {
//   buffer.swap16()
//   return [buffer.readFloatLE(), buffer.readFloatLE(4)]
// }

// function s16_float_le_1 (buffer) {
//   buffer.swap16()
//   return [buffer.readFloatLE()]
// }

// nhr3800
function uint32BeD100 (reg) {
  return buffer => {
    return {
      name: reg.name,
      unit: reg.unit,
      value: buffer.readUInt32BE() / 100,
      time: new Date().toJSON()
    }
  }
}

const fcNames = {
  3: 'readHoldingRegisters',
  4: 'readInputRegisters'
}

const RTU = {
  nhr3800: {
    read: (master, rtu) => {
      return new Promise(async (resolve, reject) => {
        let max = 2
        for (let i = 0; i < max; i++) {
          let data = await Promise.all(
            rtu.fc03.map(reg =>
              master.readHoldingRegisters(
                rtu.addr,
                reg.addr,
                2,
                uint32BeD100(reg)
              )
            )
          ).catch(err => {
            if (i + 1 === max) {
              logger.error('RTU.nhr3800.read', rtu.name, rtu.addr, err)
              reject(err)
            }
          })
          if (data) {
            let result = {
              name: rtu.name,
              addr: rtu.addr,
              reads: data
            }
            resolve(result)
            break
          }
        }
      })
    }
  },
  nhr3500: {
    read: (master, rtu) => {
      return new Promise(async (resolve, reject) => {
        const maxTries = 2
        for (let tries = 0; tries < maxTries; tries++) {
          const data = await Promise.all(
            rtu.cmds.map(cmd => {
              return master[fcNames[cmd.code]](rtu.addr, cmd.start, cmd.len, (buffer) => {
                if (buffer.length < (cmd.len * 2)) {
                  logger.debug(`buffer.length = ${buffer.length}`)
                }
                return cmd.regs.map(reg => {
                  let res = null
                  if (reg.len) {
                    res = [...Array(reg.len).keys()].map(i => {
                      return buffer[reg.type]((reg.addr - cmd.start + i) * 2) / reg.factor
                    })
                  } else {
                    res = buffer[reg.type]((reg.addr - cmd.start) * 2) / reg.factor
                  }
                  return {
                    name: reg.name,
                    unit: reg.unit,
                    value: res,
                    time: new Date().toJSON()
                  }
                })
              })
            })
          ).catch(err => {
            if (tries + 1 === maxTries) {
              logger.error('RTU.nhr3500.read', rtu.name, rtu.addr, err)
              reject(err)
            }
          })
          if (data) {
            const result = {
              name: rtu.name,
              addr: rtu.addr,
              reads: flatten(data)
            }
            resolve(result)
            break
          }
        }
      })
    }
  }
}

const exchangeName = 'reads'
const routingKey = 'geo9-pi3p2.grid.plc'

async function main () {
  // get machine uuid
  const uuid = (await getUuid()).replace(/-/g, '')
  logger.info('Machine UUID:', uuid)

  const hostname = os.hostname()
  logger.info('Hostname:', hostname)

  let channel = null
  // connect to ampq server
  try {
    // connect to ampq server, connection is a ChannelModel object
    // 'amqp://localhost'
    const connection = await amqplib.connect(argv.amqpUrl).catch(err => {
      logger.error(err, { label: 'connect' })
      process.exit()
    })
    logger.info(`${argv.amqpUrl} connected`, { label: 'connect' })

    // channel is a Channel object
    channel = await connection.createChannel().catch(err => {
      logger.error(err, { label: 'createChannel' })
      process.exit()
    })
    logger.info('Channel created', { label: 'createChannel' })

    // To ensure that messages do survive server restarts, the message needs to:
    // Be declared as persistent message,
    // Be published into a durable exchange,
    // Be queued into a durable queue
    // assert exchange
    const ex = await channel.assertExchange(exchangeName, 'topic', {
      durable: true
    })
    logger.info(ex, { label: 'assertExchange' }) // { exchange: 'reads' }
    // const ok = await channel.assertExchange(ex_reads, 'fanout');
    // logger.info('reads exchange:', ok); // { exchange: 'reads' }
  } catch (e) {
    logger.error('Error:', e.message)
    // return;
    process.exit()
  }

  // auto detect or try to use specified serial port
  try {
    var serial = await getSerial(argv)
    logger.info('Serial port:', serial)
  } catch (e) {
    logger.error('Error:', e.message)
    // return;
    process.exit()
  }
  // create ModbusMaster instance and pass the serial port object
  const master = new modbus.ModbusMaster(
    new SerialPort(serial, {
      baudRate: 19200, // 19200-8-N-1
      dataBits: 8,
      parity: 'none',
      stopBits: 1
    }),
    {
      endPacketTimeout: 19,
      queueTimeout: 50,
      responseTimeout: 250
      // debug: true
    }
  )

  const ps = getPlcSettings()
  let i = 1
  let t = 0
  async function read () {
    console.time('read')
    t++
    try {
      let result = await Promise.all(
        ps.rtus.map(rtu => RTU[rtu.type].read(master, rtu))
      )
      let msg = {
        name: ps.name,
        logTime: new Date().toJSON(),
        reads: result
      }
      logger.info(msg, { label: 'message' })
      channel.publish(
        exchangeName,
        routingKey,
        Buffer.from(JSON.stringify(msg)),
        { persistent: true }
      )
      // channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(msg)), { persistent: true });
      logger.info({
        tries: t,
        success: i++
      }, { label: 'count' })
    } catch (e) {
      logger.error({
        error: e
      }, { label: 'read' })
      // error 'Response timeout of 250ms exceed!'
      if (e.name !== 'ModbusResponseTimeout') {
        process.exit()
      }
    } finally {
      console.timeEnd('read')
      setImmediate(read)
    }
  }
  read()
}

main()
