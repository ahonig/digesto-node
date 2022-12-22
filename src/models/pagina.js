const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PaginaSchema = new Schema({
    pagi_codigo: { type: Number, required: true}
   ,pagi_descripcion: { type: String, required: true}
   ,pagi_orden: { type: Number, required: true }
});

module.exports = mongoose.model('paginas', PaginaSchema);