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

    ;(async function async_all_read() {
      const promises = []
      // A-B线电压 长整形 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x106, 2, sniff32factor(100)).catch(console.error))
      // B-C线电压 长整形 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x108, 2, sniff32factor(100)).catch(console.error))
      // C-A线电压 长整形 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x10A, 2, sniff32factor(100)).catch(console.error))
      // 三相有功功率 浮点形 readFloatBE
      promises.push(master.readHoldingRegisters(addr, 0x118, 2, sniff32factor(10)).catch(console.error))
      // 总相无功功率 浮点形 readFloatBE
      promises.push(master.readHoldingRegisters(addr, 0x120, 2, sniff32factor(10)).catch(console.error))
      // 总相视在功率 浮点形 readFloatBE
      promises.push(master.readHoldingRegisters(addr, 0x128, 2, sniff32factor(10)).catch(console.error))
      // 总相功率因数 长整形 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x130, 2, sniff32factor(1000)).catch(console.error))
      // 总有功电能 长整形 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x608, 2, sniff32factor(100)).catch(console.error))
      // 总无功电能 长整形 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x60A, 2, sniff32factor(100)).catch(console.error))
      // 视在电能 长整形 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x60C, 2, sniff32factor(100)).catch(console.error))
      // A相電流基波比 整形 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x1000, 1, sniff16factor(100)).catch(console.error))
      // B相電流基波比 整形 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x1001, 1, sniff16factor(100)).catch(console.error))
      // C相電流基波比 整形 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x1002, 1, sniff16factor(100)).catch(console.error))
      // A-B线电压基波含有率 整形 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x1003, 1, sniff16factor(100)).catch(console.error))
      // B-C线电压基波含有率 整形 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x1004, 1, sniff16factor(100)).catch(console.error))
      // C-A线电压基波含有率 整形 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x1005, 1, sniff16factor(100)).catch(console.error))
      // A相电压基波含有率 整形 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x1006, 1, sniff16factor(100)).catch(console.error))
      // B相电压基波含有率 整形 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x1007, 1, sniff16factor(100)).catch(console.error))
      // C相电压基波含有率 整形 readInt32BE
      promises.push(master.readHoldingRegisters(addr, 0x1008, 1, sniff16factor(100)).catch(console.error))
      // promises.push(master.readHoldingRegisters(addr, 194, 2, parse_fractions).catch(console.error)) // AV
      // promises.push(master.readHoldingRegisters(addr, 197, 2, parse_fractions).catch(console.error)) // AI
      // promises.push(master.readHoldingRegisters(addr, 214, 2, parse_fractions).catch(console.error)) // BV
      // promises.push(master.readHoldingRegisters(addr, 217, 2, parse_fractions).catch(console.error)) // BI
      // promises.push(master.readHoldingRegisters(addr, 234, 2, parse_fractions).catch(console.error)) // CV
      // promises.push(master.readHoldingRegisters(addr, 237, 2, parse_fractions).catch(console.error)) // CI
      result = await Promise.all(promises)
      console.log(result)
      // [[01:35:05.231]] [LOG]    [
      //   { hex: '00009AA9',
      //     readInt32LE: -17002004.48,
      //     readFloatLE: -6.989676176073084e-25,
      //     readInt32BE: 395.93,
      //     readFloatBE: 5.548161009801248e-43 },
      //   { hex: '00009A03',
      //     readInt32LE: -17110794.24,
      //     readFloatLE: -2.7090165061111657e-25,
      //     readInt32BE: 394.27,
      //     readFloatBE: 5.524899455293456e-43 },
      //   { hex: '0000999B',
      //     readInt32LE: -17178951.68,
      //     readFloatLE: -1.6026624368214912e-25,
      //     readInt32BE: 393.23,
      //     readFloatBE: 5.5103259512644784e-43 },
      //   { hex: '47248800',
      //     readInt32LE: -201324770.8,
      //     readFloatLE: -3.8602224290546184e-35,
      //     readInt32BE: 119357644.8,
      //     readFloatBE: 4212 },
      //   { hex: '46852000',
      //     readInt32LE: 53688896.5,
      //     readFloatLE: 1.0865354680477575e-20,
      //     readInt32BE: 118312960,
      //     readFloatBE: 1704 },
      //   { hex: '47280C00',
      //     readInt32LE: 20134480.8,
      //     readFloatLE: 9.882174120357227e-33,
      //     readInt32BE: 119380684.8,
      //     readFloatBE: 4302 },
      //   { hex: '03E8', readInt16LE: -6141, readInt16BE: 1000 } ]

      async_all_read()
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
