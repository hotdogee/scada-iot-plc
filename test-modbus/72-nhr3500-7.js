// sudo node test-modbus/72-nhr3500.js --serial /dev/ttyUSB0
// sudo node test-modbus/72-nhr3500.js --serial /dev/ttyUSB0 --addr 73
// M72-三相電量-電網	M73-三相電量-發電機

const util = require('util')
const SerialPort = require('serialport')
const modbus = require('modbus-rtu')
const config = require('config')
const logger = require('../lib/logger')
// require('console-stamp')(console, '[HH:MM:ss.l]')
// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'serial': 'auto',
    'addr': 72
  }
})

function get_serial() {
  return new Promise((resolve, reject) => {
    // list available serial ports
    SerialPort.list((err, ports) => {
      if (err) {
        console.error(err)
        reject(err)
      }
      if (ports.length == 0) {
        reject(Error('No serial ports found.'))
      } else if (argv.serial == 'auto') {
        if (ports.length == 1) {
          resolve(ports[0].comName)
        } else {
          reject(Error('Specify one of the follow serial ports with the --serial argument.\nAvailable Serial Ports: ' + ports.map(port => port.comName).join(', ')))
        }
      } else if (ports.map(port => port.comName).indexOf(argv.serial) != -1) {
        resolve(argv.serial)
      } else {
        reject(Error('Serial port "' + argv.serial + '" not found.'))
      }
    })
  })
}

// auto detect or try to use specified serial port
(async function () {
  let serial = null
  try {
    serial = await get_serial()
    console.log('Serial port:', serial)

    // NHR3500
    const addr = argv.addr

    //create ModbusMaster instance and pass the serial port object
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

    ;(async function parse() {
      const promises = []
      // larger than 46 results in buffer.length = 0
      promises.push(master.readHoldingRegisters(addr, 0x106, 44, parseMulti(0x106, 44, [
        { addr: 0x106, name: 'AB線電壓', factor: 100, unit: 'V', type: 'readInt32BE' },
        { addr: 0x108, name: 'BC線電壓', factor: 100, unit: 'V', type: 'readInt32BE' },
        { addr: 0x10A, name: 'CA線電壓', factor: 100, unit: 'V', type: 'readInt32BE' },
        { addr: 0x10C, name: 'A相電流', factor: 1000, unit: 'A', type: 'readInt32BE' },
        { addr: 0x10E, name: 'B相電流', factor: 1000, unit: 'A', type: 'readInt32BE' },
        { addr: 0x110, name: 'C相電流', factor: 1000, unit: 'A', type: 'readInt32BE' },
        { addr: 0x118, name: '有功功率', factor: 10, unit: 'kW', type: 'readFloatBE' },
        { addr: 0x120, name: '無功功率', factor: 10, unit: 'kvar', type: 'readFloatBE' },
        { addr: 0x128, name: '視在功率', factor: 10, unit: 'kVA', type: 'readFloatBE' },
        { addr: 0x130, name: '功率因數', factor: 10, unit: '%', type: 'readInt32BE' }
      ])).catch(console.error))
      promises.push(master.readHoldingRegisters(addr, 0x608, 6, parseMulti(0x608, 6, [
        { addr: 0x608, name: '有功電量', factor: 100, unit: 'kWh', type: 'readInt32BE' },
        { addr: 0x60A, name: '無功電量', factor: 100, unit: 'kvarh', type: 'readInt32BE' },
        { addr: 0x60C, name: '視在電量', factor: 100, unit: 'kVAh', type: 'readInt32BE' }
      ])).catch(console.error))
      // larger than 9 results in buffer.length = 0
      promises.push(master.readHoldingRegisters(addr, 0x1000, 9, parseMulti(0x1000, 9, [
        { addr: 0x1000, name: 'A相電流基波比', factor: 100, unit: '%', type: 'readInt16BE' },
        { addr: 0x1001, name: 'B相電流基波比', factor: 100, unit: '%', type: 'readInt16BE' },
        { addr: 0x1002, name: 'C相電流基波比', factor: 100, unit: '%', type: 'readInt16BE' },
        { addr: 0x1003, name: 'AB線電壓基波含有率', factor: 100, unit: '%', type: 'readInt16BE' },
        { addr: 0x1004, name: 'BC線電壓基波含有率', factor: 100, unit: '%', type: 'readInt16BE' },
        { addr: 0x1005, name: 'CA線電壓基波含有率', factor: 100, unit: '%', type: 'readInt16BE' },
        { addr: 0x1006, name: 'A相電壓基波含有率', factor: 100, unit: '%', type: 'readInt16BE' },
        { addr: 0x1007, name: 'B相電壓基波含有率', factor: 100, unit: '%', type: 'readInt16BE' },
        { addr: 0x1008, name: 'C相電壓基波含有率', factor: 100, unit: '%', type: 'readInt16BE' }
      ])).catch(console.error))
      // // larger than 30 results in buffer.length = 0
      // promises.push(master.readHoldingRegisters(addr, 0x1100, 30, parseMulti(0x1100, 30, [
      //   { addr: 0x1100, name: 'A相電流2-31次諧波含有率', factor: 100, unit: '%', type: 'readInt16BE', len: 30 }
      // ])).catch(console.error))
      // A相電流2-31次諧波含有率 整數 readInt16BEArray
      promises.push(master.readHoldingRegisters(addr, 0x1100, 30, readInt16BEArray('A相電流2-31次諧波含有率', 100, 30)).catch(console.error))
      // B相電流2-31次諧波含有率 整數 readInt16BEArray
      promises.push(master.readHoldingRegisters(addr, 0x1120, 30, readInt16BEArray('B相電流2-31次諧波含有率', 100, 30)).catch(console.error))
      // C相電流2-31次諧波含有率 整數 readInt16BEArray
      promises.push(master.readHoldingRegisters(addr, 0x1140, 30, readInt16BEArray('C相電流2-31次諧波含有率', 100, 30)).catch(console.error))
      // // AB線電壓2-31次諧波含有率 整數 readInt16BEArray
      // promises.push(master.readHoldingRegisters(addr, 0x1100, 30, readInt16BEArray('AB線電壓2-31次諧波含有率', 100, 30)).catch(console.error))
      // // BC線電壓2-31次諧波含有率 整數 readInt16BEArray
      // promises.push(master.readHoldingRegisters(addr, 0x1120, 30, readInt16BEArray('BC線電壓2-31次諧波含有率', 100, 30)).catch(console.error))
      // // CA線電壓2-31次諧波含有率 整數 readInt16BEArray
      // promises.push(master.readHoldingRegisters(addr, 0x1140, 30, readInt16BEArray('CA線電壓2-31次諧波含有率', 100, 30)).catch(console.error))
      // A相電壓2-31次諧波含有率 整數 readInt16BEArray
      promises.push(master.readHoldingRegisters(addr, 0x1100, 30, readInt16BEArray('A相電壓2-31次諧波含有率', 100, 30)).catch(console.error))
      // B相電壓2-31次諧波含有率 整數 readInt16BEArray
      promises.push(master.readHoldingRegisters(addr, 0x1120, 30, readInt16BEArray('B相電壓2-31次諧波含有率', 100, 30)).catch(console.error))
      // C相電壓2-31次諧波含有率 整數 readInt16BEArray
      promises.push(master.readHoldingRegisters(addr, 0x1140, 30, readInt16BEArray('C相電壓2-31次諧波含有率', 100, 30)).catch(console.error))
      result = await Promise.all(promises)
      logger.info(result)
      parse()
    })()

  } catch (e) {
    console.error('Error:', e.message)
    // return
    process.exit()
  }
})()

function parse_fractions(buffer) {
  return buffer.readUInt16BE() + buffer.readUInt16BE(2) / 65536
}

function parse_uint16(buffer) {
  return buffer.readUInt16BE()
}

function parse_float2(buffer) {
  buffer.swap16()
  return [buffer.readFloatLE(), buffer.readFloatLE(4)]
}

function parse_uint32_4(buffer) {
  //buffer.swap16()
  return [buffer.readUInt32BE(), buffer.readUInt32BE(4), buffer.readUInt32BE(8), buffer.readUInt32BE(12)]
}

function sniff16(buffer) {
  // return [buffer.toString('hex').toUpperCase(), buffer.readInt16LE(), buffer.readInt16BE()]
  return {
    hex: buffer.toString('hex').toUpperCase(),
    readInt16LE: buffer.readInt16LE(),
    readInt16BE: buffer.readInt16BE()
  }
}

function sniff32(buffer) {
  const hex_str = buffer.toString('hex').toUpperCase()
  const intbe = buffer.readInt32BE()
  const floatbe = buffer.readFloatBE()
  buffer.swap16()
  // return [hex_str, buffer.readInt32LE(), buffer.readFloatLE(), intbe, floatbe]
  return {
    hex: hex_str,
    readInt32LE: buffer.readInt32LE(),
    readFloatLE: buffer.readFloatLE(),
    readInt32BE: intbe,
    readFloatBE: floatbe
  }
}

function sniff16factor (factor = 1) {
  return (buffer) => {
    return {
      hex: buffer.toString('hex').toUpperCase(),
      readInt16LE: buffer.readInt16LE() / factor,
      readInt16BE: buffer.readInt16BE() / factor
    }
  }
}

function sniff32factor (factor = 1) {
  return (buffer) => {
    const hex_str = buffer.toString('hex').toUpperCase()
    const intbe = buffer.readInt32BE()
    const floatbe = buffer.readFloatBE()
    buffer.swap16()
    // return [hex_str, buffer.readInt32LE(), buffer.readFloatLE(), intbe, floatbe]
    return {
      hex: hex_str,
      readInt32LE: buffer.readInt32LE() / factor,
      readFloatLE: buffer.readFloatLE() / factor,
      readInt32BE: intbe / factor,
      readFloatBE: floatbe / factor
    }
  }
}

function readInt32BE (name, factor = 1) {
  return (buffer) => {
    return {
      [name]: buffer.readInt32BE() / factor
    }
  }
}

function readFloatBE (name, factor = 1) {
  return (buffer) => {
    return {
      [name]: buffer.readFloatBE() / factor
    }
  }
}

function readInt16BE (name, factor = 1) {
  return (buffer) => {
    return {
      [name]: buffer.readInt16BE() / factor
    }
  }
}

function readInt16BEArray (name, factor = 1, len = 1) {
  return (buffer) => {
    return {
      [name]: [...Array(len).keys()].map(i => {
        return buffer.readInt16BE(i * 2) / factor
      })
    }
  }
}

// promises.push(master.readHoldingRegisters(addr, 0x106, 44, parseMulti(0x106, 44, [
//   { addr: 0x106, name: 'AB線電壓', factor: 100, unit: 'V', type: 'readInt32BE' },
//   { addr: 0x108, name: 'BC線電壓', factor: 100, unit: 'V', type: 'readInt32BE' },
//   { addr: 0x10A, name: 'CA線電壓', factor: 100, unit: 'V', type: 'readInt32BE' },
//   { addr: 0x10C, name: 'A相電流', factor: 1000, unit: 'A', type: 'readInt32BE' },
//   { addr: 0x10E, name: 'B相電流', factor: 1000, unit: 'A', type: 'readInt32BE' },
//   { addr: 0x110, name: 'C相電流', factor: 1000, unit: 'A', type: 'readInt32BE' },
//   { addr: 0x118, name: '有功功率', factor: 10, unit: 'kW', type: 'readFloatBE' },
//   { addr: 0x120, name: '無功功率', factor: 10, unit: 'kvar', type: 'readFloatBE' },
//   { addr: 0x128, name: '視在功率', factor: 10, unit: 'kVA', type: 'readFloatBE' },
//   { addr: 0x130, name: '功率因數', factor: 10, unit: '%', type: 'readInt32BE' },
// ])).catch(console.error))

function parseMulti (start, total, regs) {
  return (buffer) => {
    if (buffer.length < (total * 2)) {
      logger.debug(`buffer.length = ${buffer.length}`)
    }
    return regs.reduce((res, reg) => {
      if (reg.len) {
        res[reg.name] = [...Array(reg.len).keys()].map(i => {
          return [buffer[reg.type]((reg.addr - start + i) * 2) / reg.factor, reg.unit]
        })
      } else {
        res[reg.name] = [buffer[reg.type]((reg.addr - start) * 2) / reg.factor, reg.unit]
      }
      return res
    }, {})
  }
}

function get_plc_settings() {
  return {
    name: 'Geo9',
    location: '宜蘭清水九號井',
    rtus: [
      {
        name: '發電機300kVA',
        type: 'nhr3500',
        addr: 72,
        fc03: [
          {
            addr: 0x118,
            type: 'float32',
            mult: 10,
            name: '三相有功功率',
            unit: 'kW',
            min: 0,
            max: 200
          },
          {
            addr: 0x120,
            type: 'float32',
            mult: 10,
            name: '三相無功功率',
            unit: 'kvar',
            min: 0,
            max: 200
          },
          {
            addr: 0x128,
            type: 'float32',
            mult: 10,
            name: '三相視在功率',
            unit: 'kVA',
            min: 0,
            max: 200
          },
          {
            addr: 0x130,
            type: 'uint32',
            mult: 1000,
            name: '三相功因',
            unit: '',
            min: 0,
            max: 1
          },
          {
            addr: 0x132,
            type: 'uint32',
            mult: 1000,
            name: '頻率',
            unit: 'Hz',
            min: 0,
            max: 100
          },
          {
            addr: 0x608,
            type: 'uint32',
            mult: 100,
            name: '有功發電量',
            unit: 'kWh',
            min: 0,
            max: 'auto'
          },
          {
            addr: 0x60A,
            type: 'uint32',
            mult: 100,
            name: '無功發電量',
            unit: 'kvarh',
            min: 0,
            max: 'auto'
          },
          {
            addr: 0x60C,
            type: 'uint32',
            mult: 100,
            name: '視在發電量',
            unit: 'kVAh',
            min: 0,
            max: 'auto'
          },
          {
            addr: 0x106,
            type: 'uint32',
            mult: 100,
            name: 'AB線電壓',
            unit: 'V',
            min: 0,
            max: 600
          },
          {
            addr: 0x10C,
            type: 'uint32',
            mult: 1000,
            name: 'A相電流',
            unit: 'A',
            min: 0,
            max: 200
          },
          {
            addr: 0x108,
            type: 'uint32',
            mult: 100,
            name: 'BC線電壓',
            unit: 'V',
            min: 0,
            max: 600
          },
          {
            addr: 0x10E,
            type: 'uint32',
            mult: 1000,
            name: 'B相電流',
            unit: 'A',
            min: 0,
            max: 200
          },
          {
            addr: 0x10A,
            type: 'uint32',
            mult: 100,
            name: 'CA線電壓',
            unit: 'V',
            min: 0,
            max: 600
          },
          {
            addr: 0x110,
            type: 'uint32',
            mult: 1000,
            name: 'C相電流',
            unit: 'A',
            min: 0,
            max: 200
          },
          {
            addr: 0x1000,
            type: 'uint16',
            mult: 100,
            name: 'A相電流基波比',
            unit: 'A',
            min: 0,
            max: 200
          },
          {
            addr: 0x1001,
            type: 'uint16',
            mult: 100,
            name: 'B相電流基波比',
            unit: 'A',
            min: 0,
            max: 200
          },
          {
            addr: 0x1002,
            type: 'uint16',
            mult: 100,
            name: 'C相電流基波比',
            unit: 'A',
            min: 0,
            max: 200
          }
        ]
      }
    ]
  }
}

