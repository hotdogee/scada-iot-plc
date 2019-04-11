const config = require('config')
// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    'logdir': 'log',
    'totalmax': '8GB',
    'filemax': '10MB',
    'ampqstr': 'amqp://localhost',
  }
});

const os = require('os');
const fs = require('fs');
const path = require('path');
const util = require('util');
const _ = require('lodash');
const json2csv = require('json2csv');
const amqplib = require('amqplib');
const filesizeParser = require('filesize-parser');
const winston = require('winston')
const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
        // setup console logging with timestamps
        level: 'debug',
        timestamp: function() {
          return (new Date()).toISOString();
        },
        formatter: function(options) {
          return options.timestamp() + ' ' + options.level[0].toUpperCase() + ' ' + (options.message ? options.message : '') +
            (options.meta && Object.keys(options.meta).length ? JSON.stringify(options.meta, null, 2) : '' );
        }
      })
    ]
});


async function amqpCsv() {
  let [file, file_new] = [1, 2]
  console.log('a', file, file_new)
  const afunc = async function (msg) { // { consumerTag: 'amq.ctag-f-KUGP6js31pjKFX90lCvg' }
    console.log('b', file, file_new)
  }
  afunc()
}
amqpCsv()
