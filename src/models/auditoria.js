const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AuditoriaSchema = new Schema({
	leye_id: { type: mongoose.Schema.Types.ObjectId, ref: 'leyes', required: true },
	audi_fecha: { type: Date, required: true },
	audi_agente: { type: String, required: false },
	audi_ip: { type: String, required: false }
});

module.exports = mongoose.model('auditorias', AuditoriaSchema);
