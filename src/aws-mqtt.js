const mqtt = require('mqtt');
const fs = require('fs');

console.log('⌛ Conectando a AWS IoT Core...');

const client = mqtt.connect({
  host: 'a32p2sd11gkckn-ats.iot.us-east-2.amazonaws.com',
  port: 8883,
  protocol: 'mqtts',
  key: fs.readFileSync('./certs/device-key.pem.key'),
  cert: fs.readFileSync('./certs/device-cert.pem.crt'),
  ca: fs.readFileSync('./certs/AmazonRootCA1.pem'),
  clientId: 'nexsoft-monitoring'
});

client.on('connect', () => {
  console.log('✅ Conectado a AWS IoT Core');
  client.subscribe('nexsoft/monitoring/enviroment', (err) => {
    if (err) console.error('❌ Error al suscribirse:', err);
    else console.log('📡 Suscrito al topic');
  });
});

client.on('message', (topic, message) => {
  console.log(`📥 ${topic}: ${message.toString()}`);
});

client.on('error', (err) => {
  console.error('❌ Error de conexión:', err);
});
