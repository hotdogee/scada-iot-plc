const util = require('util')
const SerialPort = require('serialport')
const modbus = require("modbus-rtu")
const config = require('config')
require('console-stamp')(console, '[HH:MM:ss.l]')

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

var port = '/dev/ttyUSB0'
if (/^win/.test(process.platform))
  port = 'COM3'

//create ModbusMaster instance and pass the serial port object
var master = new modbus.ModbusMaster(new SerialPort(port, {
   baudrate: 9600
}), {
   endPacketTimeout: 19,
   queueTimeout: 50,
   responseTimeout: 500
});

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

function parse_uint32_4(buffer) {
    //buffer.swap16();
    return [buffer.readUInt32BE(), buffer.readUInt32BE(4), buffer.readUInt32BE(8), buffer.readUInt32BE(12)]
}

async function async_all_read() {
    var promises = []
    // DW8
    // NHR-3800
    var addr = 64
    promises.push(master.readHoldingRegisters(addr, 0x100, 8, parse_uint32_4).catch(console.error))
    // promises.push(master.readHoldingRegisters(addr, 0xA50, 8).catch(console.error))
    result = await Promise.all(promises)
    console.log(result)
    async_all_read()
}
async_all_read()
