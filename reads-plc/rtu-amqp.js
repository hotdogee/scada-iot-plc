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
//

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    serial: 'auto',
    ampqstr: 'amqp://localhost'
  }
})

// const util = require('util')
// const config = require('config')
const logger = require('../lib/logger')
const getUuid = require('../lib/getUuid')
const getSerial = require('../lib/getSerial')
const os = require('os')
const _ = require('lodash')
const SerialPort = require('serialport')
const modbus = require('modbus-rtu')
const amqplib = require('amqplib')

function getPlcSettings () {
  return {
    name: 'Geo9',
    location: '宜蘭清水九號井',
    rtus: [
      {
        name: '九號井口',
        type: 'nhr5200',
        addr: 1,
        fc03: [
          {
            addr: 0,
            name: '壓力',
            unit: 'bar',
            min: 0,
            max: 50
          },
          {
            addr: 2,
            name: '溫度',
            unit: '℃',
            min: -200,
            max: 650
          }
        ]
      },
      {
        name: '手動閘閥前',
        type: 'nhr5200',
        addr: 2,
        fc03: [
          {
            addr: 0,
            name: '壓力',
            unit: 'bar',
            min: 0,
            max: 16
          },
          {
            addr: 2,
            name: '溫度',
            unit: '℃',
            min: -200,
            max: 650
          }
        ]
      },
      {
        name: '渦輪2前',
        type: 'nhr5200',
        addr: 5,
        fc03: [
          {
            addr: 0,
            name: '壓力',
            unit: 'bar',
            min: 0,
            max: 50
          },
          {
            addr: 2,
            name: '溫度',
            unit: '℃',
            min: -200,
            max: 650
          }
        ]
      },
      {
        name: '渦輪2後',
        type: 'nhr5200',
        addr: 6,
        fc03: [
          {
            addr: 0,
            name: '壓力',
            unit: 'bar',
            min: 0,
            max: 16
          },
          {
            addr: 2,
            name: '溫度',
            unit: '℃',
            min: -200,
            max: 650
          }
        ]
      },
      {
        name: '大穩壓桶1',
        type: 'nhr5200',
        addr: 7,
        fc03: [
          {
            addr: 0,
            name: '壓力',
            unit: 'bar',
            min: 0,
            max: 10
          },
          {
            addr: 2,
            name: '溫度',
            unit: '℃',
            min: -200,
            max: 650
          }
        ]
      },
      // {
      //   name: '上貨櫃前',
      //   type: 'nhr5200',
      //   addr: 10,
      //   fc03: [
      //     {
      //       addr: 0,
      //       name: '壓力',
      //       unit: 'bar',
      //       min: 0,
      //       max: 16
      //     },
      //     {
      //       addr: 2,
      //       name: '溫度',
      //       unit: '℃',
      //       min: -200,
      //       max: 650
      //     }
      //   ]
      // },
      {
        name: '三桶前',
        type: 'nhr5200',
        addr: 11,
        fc03: [
          {
            addr: 0,
            name: '壓力',
            unit: 'bar',
            min: 0,
            max: 16
          },
          {
            addr: 2,
            name: '溫度',
            unit: '℃',
            min: -200,
            max: 650
          }
        ]
      },
      {
        name: '渦輪1前',
        type: 'nhr5200',
        addr: 13,
        fc03: [
          {
            addr: 0,
            name: '壓力',
            unit: 'bar',
            min: 0,
            max: 16
          },
          {
            addr: 2,
            name: '溫度',
            unit: '℃',
            min: -200,
            max: 650
          }
        ]
      },
      {
        name: '渦輪1後',
        type: 'nhr5200',
        addr: 14,
        fc03: [
          {
            addr: 0,
            name: '壓力',
            unit: 'bar',
            min: 0,
            max: 4
          },
          {
            addr: 2,
            name: '溫度',
            unit: '℃',
            min: -200,
            max: 650
          }
        ]
      },
      {
        name: '尾水箱',
        type: 'nhr5200',
        addr: 21,
        fc03: [
          {
            addr: 0,
            name: '壓力',
            unit: 'bar',
            min: 0,
            max: 4
          },
          {
            addr: 2,
            name: '溫度',
            unit: '℃',
            min: -200,
            max: 650
          }
        ]
      },
      {
        name: '發電機1',
        type: 'dw9',
        addr: 63,
        fc03: [
          {
            addr: 183,
            name: '三相功率',
            unit: 'kW',
            min: 0,
            max: 100
          },
          {
            addr: 180,
            name: '三相功因',
            unit: '',
            min: 0,
            max: 1
          },
          {
            addr: 189,
            name: '發電量',
            unit: 'kWh',
            min: 0,
            max: 'auto'
          },
          {
            addr: 194,
            name: 'A相電壓',
            unit: 'V',
            min: 0,
            max: 600
          },
          {
            addr: 197,
            name: 'A相電流',
            unit: 'A',
            min: 0,
            max: 200
          },
          {
            addr: 214,
            name: 'B相電壓',
            unit: 'V',
            min: 0,
            max: 600
          },
          {
            addr: 217,
            name: 'B相電流',
            unit: 'A',
            min: 0,
            max: 200
          },
          {
            addr: 234,
            name: 'C相電壓',
            unit: 'V',
            min: 0,
            max: 600
          },
          {
            addr: 237,
            name: 'C相電流',
            unit: 'A',
            min: 0,
            max: 200
          }
        ]
      },
      {
        name: '發電機1',
        type: 'nhr3800',
        addr: 64,
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
      // {
      //   name: '軸心1',
      //   type: 'nhr2400',
      //   addr: 62,
      //   fc03: [
      //     {
      //       addr: 0,
      //       name: '轉速',
      //       unit: 'Hz',
      //       min: 0,
      //       max: 100
      //     }
      //   ]
      // },
      {
        name: '軸心1',
        type: 'nhr5200',
        addr: 60,
        fc03: [
          {
            addr: 0,
            name: '入水測溫度',
            unit: '℃',
            min: -200,
            max: 650
          }
        ]
      },
      {
        name: '軸心1',
        type: 'nhr5200',
        addr: 61,
        fc03: [
          {
            addr: 0,
            name: '發電機測溫度',
            unit: '℃',
            min: -200,
            max: 650
          }
        ]
      },
      {
        name: '軸心2',
        type: 'nhr5200',
        addr: 50,
        fc03: [
          {
            addr: 0,
            name: '入水測溫度',
            unit: '℃',
            min: -200,
            max: 650
          }
        ]
      },
      {
        name: '軸心2',
        type: 'nhr5200',
        addr: 51,
        fc03: [
          {
            addr: 0,
            name: '發電機測溫度',
            unit: '℃',
            min: -200,
            max: 650
          }
        ]
      },
      {
        name: '變速齒輪箱2',
        type: 'nhr5200',
        addr: 52,
        fc03: [
          {
            addr: 2,
            name: '溫度',
            unit: '℃',
            min: -200,
            max: 650
          }
        ]
      },
      {
        name: '排水管2',
        type: 'sinldg',
        addr: 26,
        fc04: [
          {
            addr: 4112,
            name: '流量',
            unit: 'm3/h',
            min: 0,
            max: 60
          }
        ]
      },
      {
        name: '主排水管',
        type: 'gpe',
        addr: 9,
        fc04: [
          {
            addr: 167,
            name: '質量流率',
            unit: 't/h',
            min: 0,
            max: 140
          },
          {
            addr: 169,
            name: '密度',
            unit: 'g/cm3',
            min: 0.2,
            max: 3
          },
          {
            addr: 171,
            name: '溫度',
            unit: '℃',
            min: 0,
            max: 100
          }
          //     {
          //       addr: 173,
          //       name: '體積流率',
          //       unit: 'm3/h',
          //       min: 0,
          //       max: 140
          //     },
          //     {
          //       addr: 175,
          //       name: '累積質量',
          //       unit: 'kg',
          //       min: 0,
          //       max: 100
          //     },
          //     {
          //       addr: 177,
          //       name: '累積體積',
          //       unit: 'm3',
          //       min: 0,
          //       max: 100
          //     },
        ]
      }
    ]
  }
}

// DW8 Power Meter
function parse_fractions (reg) {
  return buffer => {
    return {
      name: reg.name,
      unit: reg.unit,
      value: buffer.readUInt16BE() + buffer.readUInt16BE(2) / 65536,
      time: new Date().toJSON()
    }
  }
}

// NHR Series Meter
function s16_float_le_2 (buffer) {
  buffer.swap16()
  return [buffer.readFloatLE(), buffer.readFloatLE(4)]
}

function s16_float_le_1 (buffer) {
  buffer.swap16()
  return [buffer.readFloatLE()]
}

// nhr3800
function uint32_be_d100 (reg) {
  return buffer => {
    return {
      name: reg.name,
      unit: reg.unit,
      value: buffer.readUInt32BE() / 100,
      time: new Date().toJSON()
    }
  }
}

// nhr2400
function s16_uint32_le_d1000 (reg) {
  return buffer => {
    buffer.swap16()
    return {
      name: reg.name,
      unit: reg.unit,
      value: buffer.readUInt32LE() / 1000,
      time: new Date().toJSON()
    }
  }
}

// sinldg
function s16_float_le (reg) {
  return buffer => {
    buffer.swap16()
    return {
      name: reg.name,
      unit: reg.unit,
      value: buffer.readFloatLE(),
      time: new Date().toJSON()
    }
  }
}

function float_be (reg) {
  return buffer => {
    return {
      name: reg.name,
      unit: reg.unit,
      value: buffer.readFloatBE(),
      time: new Date().toJSON()
    }
  }
}

function float_be_x (length) {
  return buffer => {
    return _.range(0, 4 * length, 4).map(offset => {
      return buffer.readFloatBE(offset)
    })
  }
}

var RTU = {
  nhr5200: {
    read: (master, rtu) => {
      return new Promise(async (resolve, reject) => {
        let max = 2
        let promise = null
        for (let i = 0; i < max; i++) {
          if (rtu.fc03.length === 2) {
            promise = master.readHoldingRegisters(
              rtu.addr,
              0,
              4,
              s16_float_le_2
            )
          } else {
            promise = master.readHoldingRegisters(
              rtu.addr,
              rtu.fc03[0].addr,
              2,
              s16_float_le_1
            )
          }
          let data = await promise.catch(err => {
            if (i + 1 === max) {
              console.log('RTU.nhr5200.read', rtu.name, rtu.addr, err)
              reject(err)
            }
          })
          if (data) {
            let result = {
              name: rtu.name,
              addr: rtu.addr,
              reads: []
            }
            for (let i in rtu.fc03) {
              result.reads[i] = {
                name: rtu.fc03[i].name,
                unit: rtu.fc03[i].unit,
                value: data[i],
                time: new Date().toJSON()
              }
            }
            resolve(result)
            break
          }
        }
      })
    }
  },
  dw8: {
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
                parse_fractions(reg)
              )
            )
          ).catch(err => {
            if (i + 1 === max) {
              console.log('RTU.dw8.read', rtu.name, rtu.addr, err)
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
  dw9: {
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
                parse_fractions(reg)
              )
            )
          ).catch(err => {
            if (i + 1 == max) {
              console.log('RTU.dw9.read', rtu.name, rtu.addr, err)
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
                uint32_be_d100(reg)
              )
            )
          ).catch(err => {
            if (i + 1 == max) {
              console.log('RTU.nhr3800.read', rtu.name, rtu.addr, err)
              return [
                {
                  name: '頻率',
                  unit: 'Hz',
                  value: -1,
                  time: new Date().toJSON()
                }
              ]
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
  nhr2400: {
    read: (master, rtu) => {
      return new Promise(async (resolve, reject) => {
        let max = 2
        for (let i = 0; i < max; i++) {
          // var data = await Promise.all(rtu.fc03.map(reg =>
          // master.readHoldingRegisters(rtu.addr, reg.addr, 2, s16_uint32_le_d1000(reg)))).catch(err => {
          //   if (i+1 == max) {
          //     console.log('RTU.nhr2400.read', rtu.name, rtu.addr, err)
          //     return [
          //       {
          //         "name": "轉速",
          //         "unit": "Hz",
          //         "value": -1,
          //         "time": (new Date).toJSON()
          //       }
          //     ]
          //   }
          // })
          // if (data) {
          //   let result = {
          //     name: rtu.name,
          //     addr: rtu.addr,
          //     reads: data
          //   }
          //   resolve(result)
          //   break
          // }
          let result = {
            name: rtu.name,
            addr: rtu.addr,
            reads: [
              {
                name: '轉速',
                unit: 'Hz',
                value: -1,
                time: new Date().toJSON()
              }
            ]
          }
          resolve(result)
          break
        }
      })
    }
  },
  sinldg: {
    read: (master, rtu) => {
      return new Promise(async (resolve, reject) => {
        let max = 2
        for (let i = 0; i < max; i++) {
          let data = await Promise.all(
            rtu.fc04.map(reg =>
              master.readInputRegisters(rtu.addr, reg.addr, 2, float_be(reg))
            )
          ).catch(err => {
            if (i + 1 == max) {
              console.log('RTU.sinldg.read', rtu.name, rtu.addr, err)
              return [
                {
                  name: '流量',
                  unit: 'm3/h',
                  value: -1,
                  time: new Date().toJSON()
                }
              ]
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
  gpe: {
    read: (master, rtu) => {
      return new Promise(async (resolve, reject) => {
        let max = 2
        let promise = null
        for (let i = 0; i < max; i++) {
          let length = 3
          promise = master.readInputRegisters(
            rtu.addr,
            167,
            2 * length,
            float_be_x(length)
          )
          let data = await promise.catch(err => {
            if (i + 1 === max) {
              console.log('RTU.gpe.read', rtu.name, rtu.addr, err)
              reject(err)
            }
          })
          if (data) {
            let result = {
              name: rtu.name,
              addr: 25, // rtu.addr,
              reads: []
            }
            for (let i in rtu.fc04) {
              if (rtu.fc04[i].unit === 't/h') {
                data[i] *= 3.6 // convert kg/s to t/h
              }
              result.reads[i] = {
                name: rtu.fc04[i].name,
                unit: rtu.fc04[i].unit,
                value: data[i],
                time: new Date().toJSON()
              }
            }
            resolve(result)
            break
          }
        }
      })
    }
  }
}

async function main () {
  // get machine uuid
  const uuid = (await getUuid()).replace(/-/g, '')
  logger.info('Machine UUID:', uuid)

  const hostname = os.hostname()
  logger.info('Hostname:', hostname)

  // assert ampq reads exchange
  const exReads = 'reads'
  // connect to ampq server
  try {
    const connection = await amqplib.connect(argv.ampqstr)
    var channel = await connection.createChannel()
    const ok = await channel.assertExchange(exReads, 'fanout')
    logger.info('reads exchange:', ok) // { exchange: 'reads' }
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
      baudRate: 9600, // 9600-8-N-1
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

  var ps = getPlcSettings()
  var i = 1
  var t = 0
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
      console.log(JSON.stringify(msg, null, 1))
      channel.publish(exReads, '', Buffer.from(JSON.stringify(msg)), {
        persistent: true
      })
      console.log(t, i++)
    } catch (e) {
      console.error('Error:', e.message)
    } finally {
      console.timeEnd('read')
      setImmediate(read)
    }
  }
  read()
}

main()
