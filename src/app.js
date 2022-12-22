const path = require('path');
const express = require('express');
const session = require('express-session');
const morgan = require('morgan');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');

const app = express();
const oneHour  = 3600000;
const SizeLimit = 52428800;

// connect to db
mongoose.connect('mongodb://localhost/digesto', { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false})
    .then(db =>console.log('Db Connected'))
    .catch(err => console.log(err)
);

//importando rutas
const indexRoutes = require('./routes/index');

// settings
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname,'views'));
app.set('view engine','ejs');


//middlewares
app.use(session({secret: 'dig3sto_S3cre3t',saveUninitialized: true, resave: true}));
app.use(morgan('dev'));
app.use(express.urlencoded({limit: '50mb', extended: true}));
app.use(express.static(__dirname + '/views/static', {maxAge: oneHour }));
app.use(fileUpload({createParentPath: true}));
app.use(express.json({limit: '50mb'}));


//routes
app.use('/',indexRoutes);

//starting the server
app.listen(app.get('port'), () =>{
    console.log(`Server on port ${app.get('port')}`);
});
