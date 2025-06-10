const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb+srv://antonyto02:T6DfHvPfMLXLCu4k@nextsoft-cluster.k7wjxb9.mongodb.net/?retryWrites=true&w=majority&appName=nextsoft-cluster';

const EnvironmentLogSchema = new mongoose.Schema({
  sensorId: { type: String, required: true },
  temperature: { type: Number, required: true },
  humidity: { type: Number, required: true },
  timestamp: { type: Date, default: () => new Date() },
}, { collection: 'environment_logs' });

const EnvironmentLog = mongoose.model('EnvironmentLog', EnvironmentLogSchema);

async function connect() {
  if (mongoose.connection.readyState === 0) {
    console.log('🔌 Conectando a MongoDB...');
    try {
      await mongoose.connect(uri);
      console.log('✅ Conexión a MongoDB establecida');
    } catch (err) {
      console.error('❌ Error al conectar a MongoDB:', err);
      throw err;
    }
  }
}

async function saveEnvironmentData(data) {
  const { sensorId, temperature, humidity } = data || {};
  if (typeof sensorId !== 'string' || typeof temperature !== 'number' || typeof humidity !== 'number') {
    throw new Error('Invalid data payload');
  }
  await connect();
  const log = new EnvironmentLog({ sensorId, temperature, humidity });
  await log.save();
  console.log('💾 Datos guardados:', log.toObject());
}

module.exports = { saveEnvironmentData };
