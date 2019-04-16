# scada-iot-plc
SCADA/IoT PLC System handles communication with RTUs through MODBUS, and with the Supervisor through WebSockets

# pm2
NODE_ENV=production sudo pm2 start reads-plc/amqp-csv.js --name amqp-csv
NODE_ENV=production sudo pm2 start reads-plc/amqp-feathers.js --name amqp-feathers
NODE_ENV=production sudo pm2 start reads-plc/rtu-amqp.js --name rtu-amqp -- --serial=/dev/ttyUSB0