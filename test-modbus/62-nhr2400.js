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

function s16_float_le(buffer) {
    buffer.swap16();
    return buffer.readFloatLE()
}

function s16_uint32_le(buffer) {
    buffer.swap16();
    return buffer.readUInt32LE()
}

function parse_uint32_4(buffer) {
    //buffer.swap16();
    return [buffer.readUInt32BE(), buffer.readUInt32BE(4), buffer.readUInt32BE(8), buffer.readUInt32BE(12)]
}

function parse_uint32(buffer) {
    //buffer.swap16();
    return buffer.readUInt32BE()
}

function parse_none(buffer) {
    return buffer
}

function read() {
    var result = {};
    var addr = 22
    master.readInputRegisters(addr, 30001, 2).then(function(data){
        console.log(data);
    })
}

function process_error(e) {
    var a = 1
}

//setInterval(read, 1000);

async function async_all_read() {
    var promises = []
    // LMAG
    var addr = 62
    promises.push(master.readHoldingRegisters(addr, 0, 2, s16_uint32_le).catch(console.error)) // nhr2400
    var addr = 64
    promises.push(master.readHoldingRegisters(addr, 0x100, 2, parse_uint32).catch(console.error)) // nhr3800
    result = await Promise.all(promises)
    console.log(result[0] / 1000, result[1] / 100)
    async_all_read()
}
async_all_read()
// setInterval(async_all_read, 500);
