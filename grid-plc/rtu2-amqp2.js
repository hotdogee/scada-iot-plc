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
//
// node rtu-amqp.js --serial=/dev/ttyUSB0
// sudo node grid-plc/rtu2-amqp2.js --serial /dev/ttyUSB0 --amqpUrl
// sudo node grid-plc/rtu2-amqp2.js --serial /dev/ttyUSB0
//
const config = require('config')

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'serial': 'auto',
    'amqpUrl': 'amqp://localhost',
  }
});

const logger = require('../lib/logger')
const os = require('os');
const util = require('util')
const _ = require('lodash');
const SerialPort = require('serialport');
const modbus = require("modbus-rtu");
const amqplib = require('amqplib');

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
    name: 'Geo9',
    location: '宜蘭清水九號井',
    rtus: [
      // {
      //   name: '併接點',
      //   type: 'nhr3800',
      //   addr: 70,
      //   fc03: [
      //     {
      //       addr: 256,
      //       name: '頻率',
      //       unit: 'Hz',
      //       min: 0,
      //       max: 100
      //     }
      //   ]
      // },
      {
        name: '發電機300kVA',
        type: 'nhr3800',
        addr: 71,
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
      // {
      //   name: '併接點',
      //   type: 'nhr3500',
      //   addr: 72,
      //   fc03: [
      //     {
      //       addr: 256,
      //       name: '頻率',
      //       unit: 'Hz',
      //       min: 0,
      //       max: 100
      //     }
      //   ]
      // },
      // {
      //   name: '發電機300kVA',
      //   type: 'nhr3500',
      //   addr: 73,
      //   fc03: [
      //     {
      //       addr: 256,
      //       name: '頻率',
      //       unit: 'Hz',
      //       min: 0,
      //       max: 100
      //     }
      //   ]
      // }
    ]
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

var RTU = {
  nhr3800: {
    read: (master, rtu) => {
      return new Promise(async (resolve, reject) => {
        let max = 2
        for (let i=0; i<max; i++) {
          let data = await Promise.all(rtu.fc03.map(reg =>
          master.readHoldingRegisters(rtu.addr, reg.addr, 2, uint32_be_d100(reg)))).catch(err => {
            if (i+1 == max) {
              console.log('RTU.nhr3800.read', rtu.name, rtu.addr, err)
              return [
                {
                  "name": "頻率",
                  "unit": "Hz",
                  "value": -1,
                  "time": (new Date).toJSON()
                }
              ]
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

const exchangeName = 'reads'
const routingKey = 'geo9-pi3p2.grid.plc'

async function main() {
  // get machine uuid
  const uuid = (await get_uuid()).replace(/-/g, '');
  console.log('Machine UUID:', uuid);

  const hostname = os.hostname();
  console.log('Hostname:', hostname);

  let channel = null
  // connect to ampq server
  try {
    // connect to ampq server, connection is a ChannelModel object
    // 'amqp://localhost'
    const connection = await amqplib.connect(argv.amqpUrl).catch(err => {
      logger.error('amqplib.connect: %s', err)
      process.exit()
    })
    logger.info('%s connected', argv.amqpUrl)

    // channel is a Channel object
    channel = await connection.createChannel().catch(err => {
      logger.error('connection.createChannel: %s', err)
      process.exit()
    })
    logger.info('Channel created')

    // assert exchange
    const ex = await channel.assertExchange(exchangeName, 'topic', {durable: false})
    logger.info('assertExchange: %s', ex) // { exchange: 'reads' }
    // const ok = await channel.assertExchange(ex_reads, 'fanout');
    // console.log('reads exchange:', ok); // { exchange: 'reads' }
  } catch (e) {
    console.error('Error:', e.message);
    // return;
    process.exit()
  }

  // auto detect or try to use specified serial port
  try {
    var serial = await get_serial();
    console.log('Serial port:', serial);
  } catch (e) {
    console.error('Error:', e.message);
    // return;
    process.exit()
  }
  // create ModbusMaster instance and pass the serial port object
  const master = new modbus.ModbusMaster(new SerialPort(serial, {
    baudRate: 19200, // 19200-8-N-1
    dataBits: 8,
    parity: 'none',
    stopBits: 1
  }), {
    endPacketTimeout: 19,
    queueTimeout: 50,
    responseTimeout: 250,
    //debug: true
  });

  const ps = get_plc_settings();
  let i = 1;
  let t = 0;
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
      channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(msg)));
      // channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(msg)), { persistent: true });
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
