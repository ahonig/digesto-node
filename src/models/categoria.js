const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CategoriaSchema = new Schema({
    cate_codigo: { type: String, required: true, unique: true}
   ,cate_descripcion: { type: String, required: true}
   ,cate_codigo_padre: { type: String, default: null }
});

module.exports = mongoose.model('categorias', CategoriaSchema);