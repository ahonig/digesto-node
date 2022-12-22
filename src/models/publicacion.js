const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PublicacionSchema = new Schema({
    publ_titulo: { type: String, required: true}
   ,pagi_codigo: { type: Number, required: true}
   ,publ_orden: { type: Number, required: true }
   ,publ_contenido: { type: String, required: true }
});

module.exports = mongoose.model('publicaciones', PublicacionSchema);
