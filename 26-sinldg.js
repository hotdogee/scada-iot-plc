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

function hex(buffer) {
    return buffer.toString('hex').toUpperCase()
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
    var addr = 26
    promises.push(master.readInputRegisters(addr, 30001, 2, parse_uint32).catch(console.error))
    promises.push(master.readInputRegisters(addr, 30003, 2, parse_uint32).catch(console.error))
    result = await Promise.all(promises)
    console.log(result)
    // async_all_read()
}
// async_all_read()
setInterval(async_all_read, 2000);

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
