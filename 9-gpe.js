const util = require('util')
const SerialPort = require('serialport')
const modbus = require("modbus-rtu")
const config = require('config')
const _ = require('lodash')
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
  port = 'COM4'

//create ModbusMaster instance and pass the serial port object
var master = new modbus.ModbusMaster(new SerialPort(port, {
   baudrate: 9600, // 9600-8-N-1
   dataBits: 8,
   parity: 'none',
   stopBits: 1
}), {
   endPacketTimeout: 19,
   queueTimeout: 50,
   responseTimeout: 250
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

function float_be(buffer) {
    return buffer.readFloatBE()
}

function float_all(buffer) {
    return [buffer.toString('hex').toUpperCase(), buffer.readFloatBE(), buffer.readFloatLE()]
}

function float_be_x(length) {
  return (buffer) => {
    var hex_str = buffer.toString('hex').toUpperCase()
    return [hex_str, _.range(0, 4*length, 4).map((offset) => buffer.readFloatBE(offset))]
  }
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
    // GPE F1001 Coriolis Mass Flow Meter
    var addr = 9
    // The Mass flow rate (kg/s) and Volumetric flow rate (L/s) unit ignores the display unit setting
    promises.push(master.readInputRegisters(addr, 167, 2, float_all).catch(console.error)) // 167 Mass flow rate (kg/s)
    promises.push(master.readInputRegisters(addr, 169, 2, float_all).catch(console.error)) // 169 Density (g/cm3)
    promises.push(master.readInputRegisters(addr, 171, 2, float_all).catch(console.error)) // 171 Temperature (°С)
    promises.push(master.readInputRegisters(addr, 173, 2, float_all).catch(console.error)) // 173 Volumetric flow rate (L/s)
    promises.push(master.readInputRegisters(addr, 175, 2, float_all).catch(console.error)) // 175 Mass total (kg)
    promises.push(master.readInputRegisters(addr, 177, 2, float_all).catch(console.error)) // 177 Volume total (l)
    promises.push(master.readInputRegisters(addr, 16, 1, parse_uint16).catch(console.error)) // 16 Flow direction
    promises.push(master.readInputRegisters(addr, 17, 1, parse_uint16).catch(console.error)) // 17 Mass flow rate unit
    promises.push(master.readInputRegisters(addr, 18, 1, parse_uint16).catch(console.error)) // 18 Density unit
    promises.push(master.readInputRegisters(addr, 19, 1, parse_uint16).catch(console.error)) // 19 Temperature unit
    promises.push(master.readInputRegisters(addr, 20, 1, parse_uint16).catch(console.error)) // 20 Volumetric flow rate unit
    promises.push(master.readInputRegisters(addr, 21, 1, parse_uint16).catch(console.error)) // 21 Mass total unit
    promises.push(master.readInputRegisters(addr, 22, 1, parse_uint16).catch(console.error)) // 22 Volume total unit
    promises.push(master.readInputRegisters(addr, 520, 1, parse_uint16).catch(console.error)) // 520 Bytes sequence
    let length = 6
    promises.push(master.readInputRegisters(addr, 167, 2*length, float_be_x(length)).catch(console.error)) // 177 Volume total (m3)
    result = await Promise.all(promises)
    console.log(result)
    // async_all_read()
}
// async_all_read()
setInterval(async_all_read, 1000);
// [ [ '4070A1B5', 3.7598698139190674, -0.0000012028103810735047 ],
// [ '3F77D80A', 0.9681402444839478, 2.0844898794441587e-32 ],
// [ '42BB86D6', 93.76335144042969, -74069412151296 ],
// 0,
// [ '4071435F3F77D87A42BB86D6407933744A47D4004E2FC0AE',
//   [ 3.7697370052337646,
//     0.9681469202041626,
//     93.76335144042969,
//     3.893765449523926,
//     3273984,
//     737160064 ] ] ]

[[18:44:56.486]] [LOG]   [
[ '405119B3', 3.267193555831909, -3.5696984923561104e-8 ],
[ '3F77F8FA', 0.9686428308486938, -6.450541095168551e+35 ],
[ '42BA0EC0', 93.02880859375, -2.2301182746887207 ],
[ '40586789', 3.381319284439087, -2.7847108522674744e-33 ],
[ '4A647165', 3742809.25, 7.124627056505714e+22 ],
[ '4E2FDE3B', 737644224, 0.006780541501939297 ],
3,
5,
0,
0,
5,
2,
2,
undefined,
undefined,
undefined,
undefined,
[ '4A647175', 3742813.25, 3.0600040203888786e+32 ],
[ '4E2FDE3C', 737644288, 0.027122166007757187 ],
[ '40566C303F77F7AA42BA0EC0405D5E584A6471784E2FDE3C',
  [ 3.350353240966797,
    0.9686228036880493,
    93.02880859375,
    3.458883285522461,
    3742814,
    737644288 ] ] ]
