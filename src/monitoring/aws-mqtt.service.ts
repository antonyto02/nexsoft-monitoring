private connect() {
  console.log('⌛ Conectando a AWS IoT Core...');

  const key = Buffer.from(process.env.DEVICE_KEY, 'utf-8');
  const cert = Buffer.from(process.env.DEVICE_CERT, 'utf-8');
  const ca = Buffer.from(process.env.CA_CERT, 'utf-8');

  this.client = mqtt.connect({
    host: 'a32p2sd11gkckn-ats.iot.us-east-2.amazonaws.com',
    port: 8883,
    protocol: 'mqtts',
    key,
    cert,
    ca,
    clientId: 'nexsoft-monitoring',
    rejectUnauthorized: true,
  });

  this.client.on('connect', () => {
    console.log('✅ Conectado a AWS IoT Core');
    this.client.subscribe(
      [
        'nexsoft/monitoring/enviroment',
        'nexsoft/monitoring/notifications',
        'nexsoft/monitoring/status',
      ],
      (err) => {
        if (err) console.error('❌ Error al suscribirse:', err);
        else console.log('📡 Suscrito a topics');
      },
    );
  });

  this.client.on('message', async (topic, message) => {
    const payload = message.toString();
    console.log(`📥 ${topic}: ${payload}`);
    try {
      const data = JSON.parse(payload);
      if (topic === 'nexsoft/monitoring/enviroment') {
        await this.saveData(data);
      } else if (topic === 'nexsoft/monitoring/notifications') {
        await this.saveNotification(data);
      } else if (topic === 'nexsoft/monitoring/status') {
        await this.saveStatus(data);
      }
    } catch (err) {
      console.error('❌ Error procesando el mensaje:', err.message);
    }
  });

  this.client.on('error', (err) => {
    console.error('❌ Error de conexión:', err);
  });
}
