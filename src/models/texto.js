const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TextoSchema = new Schema({
    text_codigo: { type: String, required: true, unique: true}
   ,text_descripcion: { type: String, required: true}
   ,text_codigo_padre: { type: String, default: null }
});

module.exports = mongoose.model('textos', TextoSchema);
