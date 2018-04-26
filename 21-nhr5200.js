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

function read() {
    var result = {};
    master.readHoldingRegisters(2, 182, 2, parse_fractions).then(function(data){
        console.log(data);
    })
    master.readHoldingRegisters(2, 185, 2, parse_fractions).then(function(data){
        console.log(data);
    })
    master.readHoldingRegisters(2, 188, 2, parse_fractions).then(function(data){
        console.log(data);
    })
    master.readHoldingRegisters(2, 198, 2, parse_fractions).then(function(data){
        console.log(data);
    })
    master.readHoldingRegisters(1, 0, 4, parse_float2).then(function(data){
        console.log(data);
    })
}
// read the values of 10 registers starting at address 0
// on device number 1. and log the values to the console.
//setInterval(read, 100);


async function async_read() {
    var result = []
    var data = await master.readHoldingRegisters(2, 182, 2, parse_fractions).catch(console.error)
    //console.log(data)
    result.push(data)
    var data = await master.readHoldingRegisters(2, 185, 2, parse_fractions).catch(console.error)
    //console.log(data)
    result.push(data)
    var data = await master.readHoldingRegisters(2, 188, 2, parse_fractions).catch(console.error)
    //console.log(data)
    result.push(data)
    var data = await master.readHoldingRegisters(2, 198, 2, parse_fractions).catch(console.error)
    //console.log(data)
    result.push(data)
    var data = await master.readHoldingRegisters(1, 0, 4, parse_float2).catch(console.error)
    //console.log(data)
    result.push(data)
    console.log(result)
    async_read()
}
//async_read()


async function async_all_read() {
    var promises = []
    // NHR-5200
    var addr = 21 
    promises.push(master.readHoldingRegisters(addr, 0, 4, parse_float2).catch(console.error))

    result = await Promise.all(promises)
    console.log(result)
    async_all_read()
}
async_all_read()
