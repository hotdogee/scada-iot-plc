const util = require('util')
const SerialPort = require('serialport')
const modbus = require("modbus-rtu")
const config = require('config')
var port = '/dev/ttyUSB0'
var master = new modbus.ModbusMaster(new SerialPort(port, {
   baudrate: 9600
}), {
   endPacketTimeout: 19,
   queueTimeout: 50,
   responseTimeout: 500
})
function hex(buffer) {
    console.log(buffer.toString('hex').toUpperCase())
    return buffer.toString('hex').toUpperCase()
}
function s16_float_le(buffer) {
    buffer.swap16();
    console.log(buffer.readFloatLE())
    return buffer.readFloatLE()
}
var p = master.readHoldingRegisters(1, 0, 2, s16_float_le)
var p = master.readHoldingRegisters(1, 2, 2, s16_float_le)
var p = master.readHoldingRegisters(25, 0, 2, s16_float_le)
var p = master.readInputRegisters(26, 30001, 2, hex)

// https://github.com/epsilonrt/mbpoll
// nhr-5200
// mbpoll -a 1 -b 9600 -P none -t 4:float -r 1 -c 2 /dev/ttyUSB0
// 27-asmik
// mbpoll -a 26 -b 9600 -P none -t 3:float -r 4113 -c 2 -B /dev/ttyUSB0 -v
