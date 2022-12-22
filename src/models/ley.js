const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LeySchema = new Schema({
    leye_numero: { type: String, required: true, unique: true}
   ,leye_titulo: { type: String, required: true }
   ,cate_codigo: [{ type: String, required: true, ref: "categorias" }]
   ,text_codigo: { type: String, required: false, ref: "textos" }
   ,leye_fecha_sancion: { type: String, required: true }
   ,leye_fecha_promulgacion: { type: String }
   ,leye_nombre_popular: { type: String }
   ,leye_contenido: { type: String }
   ,leye_asociaciones: [{ type: String }]
   ,leye_derogaciones: [{ type: String }]
   ,leye_modificaciones: [{ type: String }]
   ,leye_doc: { type: String }
   ,leye_pdf: { type: String }
});

module.exports = mongoose.model('leyes', LeySchema);
