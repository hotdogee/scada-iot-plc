// node rtu-amqp.js --serial=auto --ampqstr=amqp://localhost
//
// Serial
// - Auto detect
//   - If only one serial port is detected, use it
//   - If multiple serial ports are detected, list serial ports, print help and exit
// - USB serial disconnect/reconnect event handling
//
// Network
// - Network disconnect/reconnect event handling
//
// Register controller id on first connect to server
// Controller status: online/offline
// View creates a new controller settings document with controller id as key
// Get controller settings from server
// - Name - String
// - Location - String
// - RTUs - List
//   - Name
//   - Type
//   - Address
//   - Devices - List (sensor and actuator)
//     - Name
//     - Type
//     - Address
//     - Min
//     - Max
// -
// -
// -
// Collect sensor data into json document every x seconds
// Write to csv file (100MB per file with total max size limit)
// Send to RabbitMQ where workers try to send to server
// (no data loss if internet fail, minimum data loss if power failure)

const config = require('config')
// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'serial': 'auto',
    'ampqstr': 'amqp://localhost',
  }
});

const os = require('os');
const util = require('util')
const _ = require('lodash');
const SerialPort = require('serialport');
const modbus = require("modbus-rtu");
const amqplib = require('amqplib');

// connect to ampq server
var ampq = amqplib.connect(argv.ampqstr);
// var ampq = amqplib.connect('amqp://localhost');

function get_uuid() {
  return new Promise((resolve, reject) => {
    require("machine-uuid")((uuid) => { resolve(uuid); });
  });
}

function get_serial() {
  return new Promise((resolve, reject) => {
    // list available serial ports
    SerialPort.list((err, ports) => {
      if (err) {
        console.error(err);
        reject(err);
      }
      if (ports.length == 0) {
        reject(Error('No serial ports found.'));
      } else if (argv.serial == 'auto') {
        if (ports.length == 1) {
          resolve(ports[0].comName);
        } else {
          reject(Error('Specify one of the follow serial ports with the --serial argument.\nAvailable Serial Ports: ' + ports.map(port => port.comName).join(', ')));
        }
      } else if (ports.map(port => port.comName).indexOf(argv.serial) != -1) {
        resolve(argv.serial);
      } else {
        reject(Error('Serial port "' + argv.serial + '" not found.'));
      }
    });
  });
}

function get_plc_settings() {
  return {
    name: 'Home',
    location: '家裡',
    rtus: [
      {
        name: '螢幕後',
        type: 'nhr5200',
        addr: 1,
        fc03: [
          {
            addr: 0,
            name: '壓力',
            unit: 'bar',
            min: 0,
            max: 16
          },
          {
            addr: 2,
            name: '溫度',
            unit: '°C',
            min: -200,
            max: 650
          }
        ]
      },
      {
        name: '市電',
        type: 'dw8',
        addr: 2,
        fc03: [
          {
            addr: 198,
            name: '功率',
            unit: 'kW',
            min: 0,
            max: 100
          },
          {
            addr: 189,
            name: '功因',
            unit: '',
            min: 0,
            max: 1
          },
          {
            addr: 201,
            name: '用電量',
            unit: 'kWh',
            min: 0,
            max: 'auto'
          },
          {
            addr: 182,
            name: '電壓',
            unit: 'V',
            min: 0,
            max: 600
          },
          {
            addr: 185,
            name: '電流',
            unit: 'A',
            min: 0,
            max: 200
          }
        ]
      },
      {
        name: '市電',
        type: 'nhr3800',
        addr: 64,
        fc03: [
          {
            addr: 256,
            name: '頻率',
            unit: 'Hz',
            min: 0,
            max: 100
          }
        ]
      }
    ]
  }
}

// DW8 Power Meter
function parse_fractions(reg) {
  return buffer => {
    return {
      name: reg.name,
      unit: reg.unit,
      value: buffer.readUInt16BE() + buffer.readUInt16BE(2) / 65536,
      time: (new Date).toJSON()
    }
  }
}

// NHR Series Meter
function s16_float_le_2(buffer) {
  buffer.swap16()
  return [buffer.readFloatLE(), buffer.readFloatLE(4)]
}

function s16_float_le_1(buffer) {
  buffer.swap16()
  return [buffer.readFloatLE()]
}

// nhr3800
function uint32_be_d100(reg) {
  return buffer => {
    return {
      name: reg.name,
      unit: reg.unit,
      value: buffer.readUInt32BE() / 100,
      time: (new Date).toJSON()
    }
  }
}

// nhr2400
function s16_uint32_le_d1000(reg) {
  return buffer => {
    buffer.swap16()
    return {
      name: reg.name,
      unit: reg.unit,
      value: buffer.readUInt32LE() / 1000,
      time: (new Date).toJSON()
    }
  }
}

// sinldg
function s16_float_le(reg) {
  return buffer => {
    buffer.swap16()
    return {
      name: reg.name,
      unit: reg.unit,
      value: buffer.readFloatLE(),
      time: (new Date).toJSON()
    }
  }
}


var RTU = {
  nhr5200: {
    read: (master, rtu) => {
      return new Promise(async (resolve, reject) => {
        let max = 2
        let promise = null
        for (let i=0; i<max; i++) {
          if (rtu.fc03.length == 2) {
            promise = master.readHoldingRegisters(rtu.addr, 0, 4, s16_float_le_2)
          } else {
            promise = master.readHoldingRegisters(rtu.addr, rtu.fc03[0].addr, 2, s16_float_le_1)
          }
          let data = await promise.catch(err => {
            if (i+1 == max) {
              console.log('RTU.nhr5200.read', rtu.name, rtu.addr, err)
              reject(err)
            }
          })
          if (data) {
            let result = {
              name: rtu.name,
              addr: rtu.addr,
              reads: []
            }
            for (let i in rtu.fc03) {
              result.reads[i] = {
                name: rtu.fc03[i].name,
                unit: rtu.fc03[i].unit,
                value: data[i],
                time: (new Date).toJSON()
              }
            }
            resolve(result)
            break
          }
        }
      })
    }
  },
  dw8: {
    read: (master, rtu) => {
      return new Promise(async (resolve, reject) => {
        let max = 2
        for (let i=0; i<max; i++) {
          let data = await Promise.all(rtu.fc03.map(reg =>
            master.readHoldingRegisters(rtu.addr, reg.addr, 2, parse_fractions(reg)))).catch(err => {
            if (i+1 == max) {
              console.log('RTU.dw8.read', rtu.name, rtu.addr, err)
              reject(err)
            }
          })
          if (data) {
            let result = {
              name: rtu.name,
              addr: rtu.addr,
              reads: data
            }
            resolve(result)
            break
          }
        }
      })
    }
  },
  dw9: {
    read: (master, rtu) => {
      return new Promise(async (resolve, reject) => {
        let max = 2
        for (let i=0; i<max; i++) {
          let data = await Promise.all(rtu.fc03.map(reg =>
            master.readHoldingRegisters(rtu.addr, reg.addr, 2, parse_fractions(reg)))).catch(err => {
            if (i+1 == max) {
              console.log('RTU.dw9.read', rtu.name, rtu.addr, err)
              reject(err)
            }
          })
          if (data) {
            let result = {
              name: rtu.name,
              addr: rtu.addr,
              reads: data
            }
            resolve(result)
            break
          }
        }
      })
    }
  },
  nhr3800: {
    read: (master, rtu) => {
      return new Promise(async (resolve, reject) => {
        let max = 2
        for (let i=0; i<max; i++) {
          let data = await Promise.all(rtu.fc03.map(reg =>
          master.readHoldingRegisters(rtu.addr, reg.addr, 2, uint32_be_d100(reg)))).catch(err => {
            if (i+1 == max) {
              console.log('RTU.nhr3800.read', rtu.name, rtu.addr, err)
              reject(err)
            }
          })
          if (data) {
            let result = {
              name: rtu.name,
              addr: rtu.addr,
              reads: data
            }
            resolve(result)
            break
          }
        }
      })
    }
  },
  nhr2400: {
    read: (master, rtu) => {
      return new Promise(async (resolve, reject) => {
        let max = 2
        for (let i=0; i<max; i++) {
          let data = await Promise.all(rtu.fc03.map(reg =>
          master.readHoldingRegisters(rtu.addr, reg.addr, 2, s16_uint32_le_d1000(reg)))).catch(err => {
            if (i+1 == max) {
              console.log('RTU.nhr2400.read', rtu.name, rtu.addr, err)
              reject(err)
            }
          })
          if (data) {
            let result = {
              name: rtu.name,
              addr: rtu.addr,
              reads: data
            }
            resolve(result)
            break
          }
        }
      })
    }
  },
  sinldg: {
    read: (master, rtu) => {
      return new Promise(async (resolve, reject) => {
        let max = 2
        for (let i=0; i<max; i++) {
          let data = await Promise.all(rtu.fc04.map(reg =>
          master.readInputRegisters(rtu.addr, reg.addr, 2, s16_float_le(reg)))).catch(err => {
            if (i+1 == max) {
              console.log('RTU.sinldg.read', rtu.name, rtu.addr, err)
              reject(err)
            }
          })
          if (data) {
            let result = {
              name: rtu.name,
              addr: rtu.addr,
              reads: data
            }
            resolve(result)
            break
          }
        }
      })
    }
  }
}

async function main() {
  // get machine uuid
  var uuid = (await get_uuid()).replace(/-/g, '');
  console.log('Machine UUID:', uuid);

  var hostname = os.hostname();
  console.log('Hostname:', hostname);

  // auto detect or try to use specified serial port
  try {
    var serial = await get_serial();
    console.log('Serial port:', serial);
  } catch (e) {
    console.error('Error:', e.message);
    return;
  }
  // create ModbusMaster instance and pass the serial port object
  var master = new modbus.ModbusMaster(new SerialPort(serial, {
    baudrate: 9600
  }), {
    endPacketTimeout: 19,//19,
    queueTimeout: 50,
    responseTimeout: 250,
    //debug: true
  });

  // assert ampq reads exchange
  var ex_reads = 'reads';
  var channel = await ampq.then(function (conn) {
    // conn is a ChannelModel object
    return conn.createChannel();
  }).then(async function (ch) {
    // ch is a Channel object
    var ok = await ch.assertExchange(ex_reads, 'fanout');
    console.log('reads exchange:', ok); // { exchange: 'reads' }
    return ch;
  }).catch(console.warn);

  var ps = get_plc_settings();
  var i = 1;
  var t = 0;
  async function read() {
    console.time('read');
    t++;
    try {
      let result = await Promise.all(ps.rtus.map(rtu => RTU[rtu.type].read(master, rtu)));
      let msg = {
        name: ps.name,
        logTime: (new Date).toJSON(),
        reads: result
      }
      console.log(JSON.stringify(msg, null, 1));
      channel.publish(ex_reads, '', new Buffer(JSON.stringify(msg)), { persistent: true });
      console.log(t, i++);
    } catch (e) {
      console.error('Error:', e.message);
    } finally {
      console.timeEnd('read');
      setImmediate(read);
    }
  }
  read();
}

main();
