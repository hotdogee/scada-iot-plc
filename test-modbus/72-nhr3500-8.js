// sudo node test-modbus/72-nhr3500.js --serial /dev/ttyUSB0
// sudo node test-modbus/72-nhr3500.js --serial /dev/ttyUSB0 --addr 73
// M72-三相電量-電網	M73-三相電量-發電機

// const util = require('util')
// const config = require('config')
const SerialPort = require('serialport')
const modbus = require('modbus-rtu')
const { flatten } = require('lodash')
const logger = require('../lib/logger')
const getSerial = require('../lib/getSerial')
// require('console-stamp')(console, '[HH:MM:ss.l]')

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'serial': 'auto',
    'addr': 72
  }
})

// auto detect or try to use specified serial port
;(async function () {
  let serial = null
  try {
    serial = await getSerial(argv)
    console.log('Serial port:', serial)

    // NHR3500
    const addr = argv.addr

    // create ModbusMaster instance and pass the serial port object
    const master = new modbus.ModbusMaster(new SerialPort(serial, {
      baudRate: 19200, // 19200-8-N-1
      dataBits: 8,
      parity: 'none',
      stopBits: 1
    }), {
      endPacketTimeout: 19,
      queueTimeout: 50,
      responseTimeout: 250
    })

    const ps = getPlcSettings()
    ;(async function parse () {
      const result = await Promise.all(
        ps.rtus.map(rtu => RTU[rtu.type].read(master, rtu))
      )
      logger.info(result)
      parse()
      // 2019-04-27T14:25:27.746Z [+496ms] info: [ { name: '併接點',
      //   addr: 72,
      //   reads:
      //   [ [ { name: 'AB線電壓', unit: 'V', value: 396.47, time: '2019-04-27T14:25:27.362Z' },
      //       { name: 'BC線電壓', unit: 'V', value: 394.54, time: '2019-04-27T14:25:27.363Z' },
      //       { name: 'CA線電壓', unit: 'V', value: 393.59, time: '2019-04-27T14:25:27.363Z' },
      //       { name: 'A相電流', unit: 'A', value: 13.02, time: '2019-04-27T14:25:27.363Z' },
      //       { name: 'B相電流', unit: 'A', value: 13.44, time: '2019-04-27T14:25:27.363Z' },
      //       { name: 'C相電流', unit: 'A', value: 15, time: '2019-04-27T14:25:27.363Z' },
      //       { name: '有功功率', unit: 'kW', value: 9444, time: '2019-04-27T14:25:27.363Z' },
      //       { name: '無功功率', unit: 'kvar', value: 0, time: '2019-04-27T14:25:27.363Z' },
      //       { name: '視在功率', unit: 'kVA', value: 9444, time: '2019-04-27T14:25:27.363Z' },
      //       { name: '功率因數', unit: '%', value: 100, time: '2019-04-27T14:25:27.363Z' } ],
      //     [ { name: '有功電量', unit: 'kWh', value: 1683.32, time: '2019-04-27T14:25:27.442Z' },
      //       { name: '無功電量', unit: 'kvarh', value: 290.31, time: '2019-04-27T14:25:27.442Z' },
      //       { name: '視在電量', unit: 'kVAh', value: 1816.72, time: '2019-04-27T14:25:27.442Z' } ],
      //     [ { name: 'A相電流諧波比', unit: '%', value: [ 0.68, 0.57, 0.23, 0.46, 0, 0.12, 0.12, 0.12, 0, 0.35, 0, 0.23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], time: '2019-04-27T14:25:27.537Z' } ],
      //     [ { name: 'B相電流諧波比', unit: '%', value: [ 0.92, 0.92, 0.46, 0.24, 0.24, 0.24, 0.12, 0, 0, 0.35, 0, 0.12, 0, 0, 0, 0.12, 0, 0, 0, 0, 0, 0.12, 0, 0, 0, 0, 0, 0, 0, 0 ], time: '2019-04-27T14:25:27.640Z' } ],
      //     [ { name: 'C相電流諧波比', unit: '%', value: [ 0.44, 2.13, 0.12, 0, 0, 0.23, 0, 0.23, 0.12, 0.23, 0, 0.12, 0, 0, 0, 0.12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], time: '2019-04-27T14:25:27.745Z' } ] ] } ]
    })()
  } catch (e) {
    console.error('Error:', e.message)
    // return
    process.exit()
  }
})()

const fcNames = {
  3: 'readHoldingRegisters',
  4: 'readInputRegisters'
}

const RTU = {
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
              return []
            }
          })
          if (data) {
            let result = {
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

function getPlcSettings () {
  return {
    name: 'Geo9',
    location: '宜蘭清水九號井',
    rtus: [
      {
        name: '併接點',
        type: 'nhr3500',
        addr: 72,
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
                unit: 'kW',
                type: 'readFloatBE'
              },
              {
                addr: 0x120,
                name: '無功功率',
                factor: 10,
                unit: 'kvar',
                type: 'readFloatBE'
              },
              {
                addr: 0x128,
                name: '視在功率',
                factor: 10,
                unit: 'kVA',
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
            start: 0x608,
            len: 6,
            regs: [
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
          }
        ]
      }
    ]
  }
}
