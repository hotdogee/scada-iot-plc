const _ = require('lodash')
const util = require('util')
const SerialPort = require('serialport')
const modbus = require("modbus-rtu")
const config = require('config')
require('console-stamp')(console, 'HH:MM:ss.l')

// list available serial ports
SerialPort.list(function (err, ports) {
  if (err) {
    console.error(err)
    return
  }

  ports.forEach(function (port) {
    console.log(port.comName)
  })
})

let port = '/dev/ttyUSB0'
if (/^win/.test(process.platform))
  port = 'COM3'

const addr = 26

//create ModbusMaster instance and pass the serial port object
const master = new modbus.ModbusMaster(new SerialPort(port, {
  baudrate: 9600
}), {
  endPacketTimeout: 19,
  queueTimeout: 50,
  responseTimeout: 50
})


function read() {
  var result = {};
  var addr = 22
  master.readInputRegisters(addr, 30001, 2).then(function (data) {
    console.log(data);
  })
}

function process_error(e) {
  var a = 1
}

//setInterval(read, 1000);


// Addr(DEC)   Addr(HEX)   資料格式        寄存器定義
// 4112        0x1010      Float Inverse   暫態流量浮點表示
// 4114        0x1012      Float Inverse   暫態流速浮點表示
// 4116        0x1014      Float Inverse   流量百分比浮點表示（電池供電錶保留）
// 4118        0x1016      Float Inverse   流體電導比浮點表示
// 4120        0x1018      Long Inverse    正向累積數值整數部分
// 4122        0x101A      Float Inverse   正向累積數值小數部分
// 4124        0x101C      Long Inverse    反向累積數值整數部分
// 4126        0x101E      Float Inverse   反向累積數值小數部分
// 4128        0x1020      Unsigned short  暫態流量單位（表 3）
// 4129        0x1021      Unsigned short  累積總量單位（表4/表5）
// 4130        0x1022      Unsigned short  上限報警
// 4131        0x1023      Unsigned short  下限報警
// 4132        0x1024      Unsigned short  空管報警
// 4133        0x1025      Unsigned short  系統報警

const commands = {
  fc03: master.readHoldingRegisters,
  fc04: master.readInputRegisters
}

const parsers = {
  float_be: {
    length: 2, // number of 16-bit registers
    parse(buffer) {
      return {
        value: buffer.readFloatBE(),
        hex: buffer.toString('hex').toUpperCase()
      }
    }
  },
  uint32_be: {
    length: 2, // number of 16-bit registers
    parse(buffer) {
      return {
        value: buffer.readUInt32BE(),
        hex: buffer.toString('hex').toUpperCase()
      }
    }
  },
  uint16_be: {
    length: 1, // number of 16-bit registers
    parse(buffer) {
      return {
        value: buffer.readUInt16BE(),
        hex: buffer.toString('hex').toUpperCase()
      }
    }
  }
}

// Supmea LMAG
const regs = [
  { addr: 4112, command: 'fc04', format: 'float_be', name: '體積流率', unit: 'm3/h' },
  { addr: 30011, command: 'fc04', format: 'float_be', name: '體積流率', unit: 'm3/h' },
//   { addr: 4114, command: 'fc04', format: 'float_be', name: '流速', unit: 'm/s' },
//   { addr: 4116, command: 'fc04', format: 'float_be', name: '流量百分比', unit: '' },
//   { addr: 4118, command: 'fc04', format: 'float_be', name: '流體電導比', unit: '' },
//   { addr: 4120, command: 'fc04', format: 'uint32_be', name: '正向累積數值整數部分', unit: 'm3' },
//   { addr: 4122, command: 'fc04', format: 'float_be', name: '正向累積數值小數部分', unit: 'm3' },
//   { addr: 4124, command: 'fc04', format: 'uint32_be', name: '反向累積數值整數部分', unit: 'm3' },
//   { addr: 4126, command: 'fc04', format: 'float_be', name: '反向累積數值小數部分', unit: 'm3' },
//   { addr: 4128, command: 'fc04', format: 'uint16_be', name: '暫態流量單位', unit: '' },
//   { addr: 4129, command: 'fc04', format: 'uint16_be', name: '累積總量單位', unit: '' },
//   { addr: 4130, command: 'fc04', format: 'uint16_be', name: '上限報警', unit: 'm3/h' },
//   { addr: 4131, command: 'fc04', format: 'uint16_be', name: '下限報警', unit: 'm3/h' },
//   { addr: 4132, command: 'fc04', format: 'uint16_be', name: '空管報警', unit: '' },
//   { addr: 4133, command: 'fc04', format: 'uint16_be', name: '系統報警', unit: '' },
]

async function async_all_read() {
  var promises = _.map(regs, reg => {
    return master.readHoldingRegisters(addr, reg.addr, 2, float_be).catch(console.error)
    return master.readHoldingRegisters(addr, reg.addr, parsers[reg.format].length, parsers[reg.format].parse).then(({ value, hex }) => {
      return `${addr}-${reg.addr}-${reg.command}-${reg.format}-${hex}-${reg.name}:${value} ${reg.unit}`
    }).catch(console.error)
  })
  results = await Promise.all(promises)
  _.forEach(results, (result) => console.log(result))
  // async_all_read()
}
// async_all_read()
setInterval(async_all_read, 500);


function parse_fractions(buffer) {
  return buffer.readUInt16BE() + buffer.readUInt16BE(2) / 65536
}

function parse_uint16(buffer) {
  return buffer.readUInt16BE()
}

function parse_float2(buffer) {
  buffer.swap16();
  return [buffer.readFloatLE(), buffer.readFloatLE(4)]
}

function s16_float_le(buffer) {
  buffer.swap16();
  return buffer.readFloatLE()
}

function float_be(buffer) {
  return buffer.readFloatBE()
}

function parse_uint32_4(buffer) {
  //buffer.swap16();
  return [buffer.readUInt32BE(), buffer.readUInt32BE(4), buffer.readUInt32BE(8), buffer.readUInt32BE(12)]
}

function parse_uint32(buffer) {
  buffer.swap16();
  return buffer.readUInt32BE()
}

function parse_none(buffer) {
  return buffer
}

// [[16:32:32.993]] [LOG]   4112 [ [ 16536, -2621 ] ]
// [[16:32:33.071]] [LOG]   4113 [ [ -2621, 15917 ] ]
// [[16:32:33.150]] [LOG]   4114 [ [ 15917, 3670 ] ]
// [[16:32:33.229]] [LOG]   4115 [ [ 3670, 16536 ] ]
// [[16:32:33.310]] [LOG]   4116 [ [ 16536, -2621 ] ]
// [[16:32:33.389]] [LOG]   4117 [ [ -2621, 16256 ] ]
// [[16:32:33.470]] [LOG]   4118 [ [ 16256, 0 ] ]
// [[16:32:33.549]] [LOG]   4119 [ [ 0, 0 ] ]
// [[16:32:33.630]] [LOG]   4120 [ [ 0, 11371 ] ]
// [[16:32:33.709]] [LOG]   4121 [ [ 11371, 0 ] ]
// [[16:32:33.790]] [LOG]   4122 [ [ 0, 0 ] ]
// [[16:32:33.869]] [LOG]   4123 [ [ 0, 0 ] ]
// [[16:32:33.950]] [LOG]   4124 [ [ 0, 771 ] ]
// [[16:32:34.029]] [LOG]   4125 [ [ 771, 0 ] ]
// [[16:32:34.109]] [LOG]   4126 [ [ 0, 0 ] ]
// [[16:32:34.189]] [LOG]   4127 [ [ 0, 5 ] ]
// [[16:32:34.269]] [LOG]   4128 [ [ 5, 1 ] ]
// [[16:32:34.349]] [LOG]   4129 [ [ 1, 0 ] ]
// [[16:32:34.429]] [LOG]   4130 [ [ 0, 1 ] ]
// [[16:32:34.508]] [LOG]   4131 [ [ 1, 0 ] ]
// [[16:32:34.589]] [LOG]   4132 [ [ 0, 0 ] ]
// [[16:32:34.668]] [LOG]   4133 [ [ 0, 0 ] ]
// [[16:32:34.749]] [LOG]   4134 [ [ 0, 0 ] ]
// [[16:32:34.828]] [LOG]   4135 [ [ 0, 0 ] ]
// [[16:32:34.909]] [LOG]   4136 [ [ 0, 0 ] ]
// [[16:32:34.988]] [LOG]   4137 [ [ 0, 0 ] ]
// [[16:32:35.067]] [LOG]   4138 [ [ 0, 0 ] ]
// [[16:32:35.148]] [LOG]   4139 [ [ 0, 0 ] ]
// [[16:32:35.227]] [LOG]   4140 [ [ 0, 0 ] ]
// [[16:32:35.318]] [LOG]   4141 [ [ 0, 0 ] ]
// [[16:32:35.404]] [LOG]   4142 [ [ 0, 0 ] ]
// [[16:32:35.483]] [LOG]   4143 [ [ 0, 0 ] ]
// [[16:32:35.562]] [LOG]   4144 [ [ 0, 0 ] ]
// [[16:32:35.643]] [LOG]   4145 [ [ 0, 0 ] ]
// [[16:32:35.722]] [LOG]   4146 [ [ 0, 0 ] ]
// [[16:32:35.804]] [LOG]   4147 [ [ 0, 0 ] ]
// [[16:32:35.882]] [LOG]   4148 [ [ 0, 0 ] ]
// [[16:32:35.965]] [LOG]   4149 [ [ 0, 0 ] ]
// [[16:32:36.042]] [LOG]   4150 [ [ 0, 0 ] ]
// [[16:32:36.123]] [LOG]   4151 [ [ 0, 0 ] ]
// [[16:32:36.202]] [LOG]   4152 [ [ 0, 0 ] ]
// [[16:32:36.282]] [LOG]   4153 [ [ 0, 0 ] ]
// [[16:32:36.362]] [LOG]   4154 [ [ 0, 0 ] ]
// [[16:32:36.442]] [LOG]   4155 [ [ 0, 0 ] ]
// [[16:32:36.522]] [LOG]   4156 [ [ 0, 0 ] ]
// [[16:32:36.602]] [LOG]   4157 [ [ 0, 0 ] ]
// [[16:32:36.681]] [LOG]   4158 [ [ 0, 0 ] ]
// [[16:32:36.762]] [LOG]   4159 [ [ 0, 124 ] ]
