const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UsuarioSchema = new Schema({
    usua_codigo: { type: String, required: true}
    ,usua_nombre: { type: String, required: true}
    ,usua_tipo: { type: String, required: true}
    ,usua_estado: { type: String, required: true}
    ,usua_contrasena: { type: String, required: true}
});

module.exports = mongoose.model('usuarios', UsuarioSchema);