const mqtt = require('mqtt');
const fs = require('fs');
const { saveEnvironmentData } = require('./environment-logger');

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

client.on('message', async (topic, message) => {
  const payload = message.toString();
  console.log(`📥 ${topic}: ${payload}`);
  try {
    const data = JSON.parse(payload);
    console.log('🗄 Guardando datos...');
    await saveEnvironmentData(data);
  } catch (err) {
    console.error('❌ Error procesando el mensaje:', err.message);
  }
});

client.on('error', (err) => {
  console.error('❌ Error de conexión:', err);
});
