// sudo node test-modbus/72-nhr3500.js --serial /dev/ttyUSB0
// sudo node test-modbus/72-nhr3500.js --serial /dev/ttyUSB0 --addr 73
// M72-三相電量-電網	M73-三相電量-發電機

const util = require('util')
const SerialPort = require('serialport')
const modbus = require('modbus-rtu')
const config = require('config')
require('console-stamp')(console, '[HH:MM:ss.l]')
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
      // AB線電壓 長整數 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x106, 2, readInt32BE('AB線電壓', 100)).catch(console.error))
      // BC線電壓 長整數 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x108, 2, readInt32BE('BC線電壓', 100)).catch(console.error))
      // CA線電壓 長整數 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x10A, 2, readInt32BE('CA線電壓', 100)).catch(console.error))
      // 有功功率 浮點數 readFloatBE
      promises.push(master.readHoldingRegisters(addr, 0x118, 2, readFloatBE('有功功率', 10)).catch(console.error))
      // 無功功率 浮點數 readFloatBE
      promises.push(master.readHoldingRegisters(addr, 0x120, 2, readFloatBE('無功功率', 10)).catch(console.error))
      // 視在功率 浮點數 readFloatBE
      promises.push(master.readHoldingRegisters(addr, 0x128, 2, readFloatBE('視在功率', 10)).catch(console.error))
      // 功率因數 長整數 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x130, 2, readInt32BE('功率因數', 1000)).catch(console.error))
      // 有功電量 長整數 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x608, 2, readInt32BE('有功電量', 100)).catch(console.error))
      // 無功電量 長整數 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x60A, 2, readInt32BE('無功電量', 100)).catch(console.error))
      // 視在電量 長整數 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x60C, 2, readInt32BE('視在電量', 100)).catch(console.error))
      // A相電流基波比 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1000, 1, readInt16BE('A相電流基波比', 100)).catch(console.error))
      // B相電流基波比 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1001, 1, readInt16BE('B相電流基波比', 100)).catch(console.error))
      // C相電流基波比 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1002, 1, readInt16BE('C相電流基波比', 100)).catch(console.error))
      // AB線電壓基波含有率 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1003, 1, readInt16BE('AB線電壓基波含有率', 100)).catch(console.error))
      // BC線電壓基波含有率 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1004, 1, readInt16BE('BC線電壓基波含有率', 100)).catch(console.error))
      // CA線電壓基波含有率 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1005, 1, readInt16BE('CA線電壓基波含有率', 100)).catch(console.error))
      // A相電壓基波含有率 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1006, 1, readInt16BE('A相電壓基波含有率', 100)).catch(console.error))
      // B相電壓基波含有率 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1007, 1, readInt16BE('B相電壓基波含有率', 100)).catch(console.error))
      // C相電壓基波含有率 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1008, 1, readInt16BE('C相電壓基波含有率', 100)).catch(console.error))
      result = await Promise.all(promises)
      console.log(result)

      parse()
    })()

    ;(async function sniff() {
      const promises = []
      // A-B線電壓 長整數 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x106, 2, sniff32factor(100)).catch(console.error))
      // B-C線電壓 長整數 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x108, 2, sniff32factor(100)).catch(console.error))
      // C-A線電壓 長整數 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x10A, 2, sniff32factor(100)).catch(console.error))
      // 三相有功功率 浮點數 readFloatBE
      promises.push(master.readHoldingRegisters(addr, 0x118, 2, sniff32factor(10)).catch(console.error))
      // 總相無功功率 浮點數 readFloatBE
      promises.push(master.readHoldingRegisters(addr, 0x120, 2, sniff32factor(10)).catch(console.error))
      // 總相視在功率 浮點數 readFloatBE
      promises.push(master.readHoldingRegisters(addr, 0x128, 2, sniff32factor(10)).catch(console.error))
      // 總相功率因數 長整數 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x130, 2, sniff32factor(1000)).catch(console.error))
      // 總有功電量 長整數 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x608, 2, sniff32factor(100)).catch(console.error))
      // 總無功電量 長整數 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x60A, 2, sniff32factor(100)).catch(console.error))
      // 視在電量 長整數 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x60C, 2, sniff32factor(100)).catch(console.error))
      // A相電流基波比 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1000, 1, sniff16factor(100)).catch(console.error))
      // B相電流基波比 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1001, 1, sniff16factor(100)).catch(console.error))
      // C相電流基波比 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1002, 1, sniff16factor(100)).catch(console.error))
      // A-B線電壓基波含有率 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1003, 1, sniff16factor(100)).catch(console.error))
      // B-C線電壓基波含有率 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1004, 1, sniff16factor(100)).catch(console.error))
      // C-A線電壓基波含有率 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1005, 1, sniff16factor(100)).catch(console.error))
      // A相電壓基波含有率 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1006, 1, sniff16factor(100)).catch(console.error))
      // B相電壓基波含有率 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1007, 1, sniff16factor(100)).catch(console.error))
      // C相電壓基波含有率 整數 readInt16BE
      promises.push(master.readHoldingRegisters(addr, 0x1008, 1, sniff16factor(100)).catch(console.error))
      // promises.push(master.readHoldingRegisters(addr, 194, 2, parse_fractions).catch(console.error)) // AV
      // promises.push(master.readHoldingRegisters(addr, 197, 2, parse_fractions).catch(console.error)) // AI
      // promises.push(master.readHoldingRegisters(addr, 214, 2, parse_fractions).catch(console.error)) // BV
      // promises.push(master.readHoldingRegisters(addr, 217, 2, parse_fractions).catch(console.error)) // BI
      // promises.push(master.readHoldingRegisters(addr, 234, 2, parse_fractions).catch(console.error)) // CV
      // promises.push(master.readHoldingRegisters(addr, 237, 2, parse_fractions).catch(console.error)) // CI
      result = await Promise.all(promises)
      console.log(result)
      [{ hex: '00009AD3',
        readInt32LE: -16974479.36,
        readFloatLE: -8.726755462434441e-25,
        readInt32BE: 396.35,
        readFloatBE: 5.554046463351413e-43 },
      { hex: '00009A22',
        readInt32LE: -17090478.08,
        readFloatLE: -3.3500814808397623e-25,
        readInt32BE: 394.58,
        readFloatBE: 5.529243480532863e-43 },
      { hex: '000099F8',
        readInt32LE: -17118003.2,
        readFloatLE: -2.564259898914386e-25,
        readInt32BE: 394.16,
        readFloatBE: 5.523358026982699e-43 },
      { hex: '473E1400',
        readInt32LE: 33556255.8,
        readFloatLE: 6.476398579700822e-28,
        readInt32BE: 119525068.8,
        readFloatBE: 4866 },
      { hex: 'C5F96000',
        readInt32LE: 161066341.7,
        readFloatLE: 3711638554264836600,
        readInt32BE: -97351270.4,
        readFloatBE: -798 },
      { hex: '4743F000',
        readInt32LE: -26841721.3,
        readFloatLE: -1.5880092555551663e+28,
        readInt32BE: 119563468.8,
        readFloatBE: 5016 },
      { hex: '000003A4', // 總相功率因數 長整數 readInt32BE
        readInt32LE: 61079.552,
        readFloatLE: 9.639053676742758e-40,
        readInt32BE: 0.932,
        readFloatBE: 1.3060101687507296e-45 },
      { hex: '00025F26', // 總有功電量 長整數 readInt32BE
        readInt32LE: 15963258.9,
        readFloatLE: 119615628093192930,
        readInt32BE: 1554.3,
        readFloatBE: 2.178038203100063e-42 },
      { hex: '00006D3B', // 總無功電量 長整數 readInt32BE
        readInt32LE: 18325831.68,
        readFloatLE: 3.6171060522869707e+25,
        readInt32BE: 279.63,
        readFloatBE: 3.918450895791486e-43 },
      { hex: '0002922F', // 視在電量 長整數 readInt32BE
        readInt32LE: -18424135.66,
        readFloatLE: -5.522027299512055e-30,
        readInt32BE: 1684.95,
        readFloatBE: 2.3611178474641006e-42 },
      { hex: '03E8', readInt16LE: -61.41, readInt16BE: 10 },
      { hex: '03E8', readInt16LE: -61.41, readInt16BE: 10 },
      { hex: '03E8', readInt16LE: -61.41, readInt16BE: 10 },
      { hex: '0000', readInt16LE: 0, readInt16BE: 0 },
      { hex: '0000', readInt16LE: 0, readInt16BE: 0 },
      { hex: '0000', readInt16LE: 0, readInt16BE: 0 },
      { hex: '03E8', readInt16LE: -61.41, readInt16BE: 10 },
      { hex: '03E8', readInt16LE: -61.41, readInt16BE: 10 },
      { hex: '03E8', readInt16LE: -61.41, readInt16BE: 10 } ]

      sniff()
    })
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

