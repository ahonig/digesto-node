const express = require('express');
const moment = require('moment');
const url = require('url'); 
const router = express.Router();
const nodemailer = require('nodemailer');


// models
const Usuario = require('../models/usuario');
const Categoria = require('../models/categoria');
const Pagina = require('../models/pagina');
const Publicacion = require('../models/publicacion');
const Ley = require('../models/ley');
const Auditoria = require('../models/auditoria');
const Texto = require('../models/texto');

var location = {};
var sess;

var lpad = function (str, len, padstr=" ") {
    var redExpr={$reduce:{
      input:{$range:[0,{$subtract:[len, {$strLenCP:str}]}]},
      initialValue:"",
      in:{$concat:["$$value",padstr]}}};
    return {$cond:{
      if:{$gte:[{$strLenCP:str},len]},
      then:str,
      else:{$concat:[ redExpr, str]}
    }};
  }

let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "alexdaniels15@gmail.com",
            pass: "MiContrasenaEsGMAIL_148"
        }
});

var countLaws = function ( categ ) {
	let cantidad = null;
//	const cantidad = Ley.aggregate([{$match: {cate_codigo : {'$regex' : new RegExp(categ+"(\.[0-9])*"), '$options' : 'i'}} }, {$skip: 0}]);
	return cantidad||"0";
}


//landPage
router.get('/', async (req, res) =>{
    location.parent = null;
    location.id = "index";
    
    const paginas = await Pagina.aggregate([
        { $sort : { pagi_orden : 1 } },
        {
            "$project": { _id: 0,
                            pagi_descripcion: 1,
                            link : { $concat :["/digesto/pages","/", {"$substr": ["$pagi_codigo",0,-1]}] }
                        } 
        }
    ]);
    
    const categoriaNivel1 = await Categoria.aggregate([
	{ $match: {
		$or: [{cate_codigo_padre: null},{cate_codigo_padre: ''}]
	}},
	{
	  $project: {
		_id: 0,
		cate_codigo: 1,
		cate_descripcion: 1,
		cate_codigo_padre: 1,
		orden: lpad("$cate_codigo",2,"0")
	  }
	},
	{ $sort : { orden : 1 } },
	{ 
		$project: {orden: 0 }
	}/*,
	{ $lookup: {
		from: "leyes",
            	 let: { regex: {$concat:['$cate_codigo','(\.[0-9])*']}},
	    pipeline: [
			{ $match: {$expr: {
				   $regexMatch:{
					   input: "$cate_codigo",
					   regex: "$$regex",
					   options: "i"
				   }
			}}},{ $count: "leyes" }],
	 	 as: "cantidad"
	}}*/
	,
		{ 
			$lookup: {
					from: "leyes",
					 let: { regex: {$concat:['$cate_codigo','(\.[0-9])*']}},
				pipeline: [
							{ $match: {$expr: {
										$reduce: {
										   input: "$cate_codigo",
										   initialValue: "",
										   in : {
												$regexMatch:{
													input: "$$this",
													regex: "$$regex",
													options: "i"
											    }
											}
										}
							}}},{ $count: "leyes" }],
					 as: "cantidad"
			}
		}
	
	

    ]);

    const textoNivel1 = await Texto.aggregate([
        { $match: {
                $or: [{text_codigo_padre: null},{text_codigo_padre: ''}]
        }},
        {
          $project: {
                _id: 0,
                text_codigo: 1,
                text_descripcion: 1,
                text_codigo_padre: 1,
                orden: lpad("$text_codigo",2,"0")
          }
        },
        { $sort : { orden : 1 } },
        {
                $project: {orden: 0 }
        },
        { $lookup: {
                from: "leyes",
                 let: { regex: {$concat:['$text_codigo','(\.[0-9])*']}},
            pipeline: [ { $match: {$expr: { 
          	                         $regexMatch:{
                                           input: "$text_codigo",
                                           regex: "$$regex",
                                           options: "i"
                        }}}},{ $count: "leyes" }],
                 as: "cantidad"
        }}
	
    ]);

    //console.log("Cat LVL 1 ", categoriaNivel1);
   
    
    const categoriaNivel2 = await Categoria.aggregate([
        { 
            $match : { $and: [
                        {cate_codigo_padre: {$ne: null}}
                        , {cate_codigo_padre: {$ne: ''}}
                        , {cate_codigo : {'$regex' : '([0-9]*[.])?[0-9]+', '$options' : 'i'}}
                    ]
            } 
        },
        {
            "$lookup": {
                "from": "categorias",
                "let": { "categoria": "$cate_codigo" },
                "pipeline": [
                  { "$match": {
                    "$expr": { 
                        "$eq": [ "$cate_codigo_padre", "$$categoria" ]
                    }
                  }}
                ],
                "as": "hijos"
            }
        },
        { 
            "$project": {
                _id : 0
               ,cate_codigo : 1
               ,cate_descripcion: 1
               ,cate_codigo_padre: 1
               ,hijos: { "$size": "$hijos" }
               ,link: {
                    $switch: {
                        branches: [
                            {
                                case: { $eq : [ { "$size": "$hijos" }, 0 ] },
                                then: { $concat: [ "/digesto/laws","/","categories","/","$cate_codigo" ] }
                            }
                        ],
                        default: ""
                    }
                }
            } 
        },
        { $sort : { cate_codigo : 1 } }
    ]);

    const textoNivel2 = await Texto.aggregate([
        {
            $match : { $and: [
                          {text_codigo_padre: {$ne: null}}
                        , {text_codigo_padre: {$ne: ''}}
                        , {text_codigo : {'$regex' : '([0-9]*[.])?[0-9]+', '$options' : 'i'}}
                    ]
            }
        },
        {
            "$lookup": {
                "from": "textos",
                "let": { "texto": "$text_codigo" },
                "pipeline": [
                  { "$match": {
                    "$expr": {
                        "$eq": [ "$text_codigo_padre", "$$texto" ]
                    }
                  }}
                ],
                "as": "hijos"
            }
        },
        {
            "$project": {
                _id : 0
               ,text_codigo : 1
               ,text_descripcion: 1
               ,text_codigo_padre: 1
               ,hijos: { "$size": "$hijos" }
               ,link: {
                    $switch: {
                        branches: [
                            {
                                case: { $eq : [ { "$size": "$hijos" }, 0 ] },
                                then: { $concat: [ "/digesto/laws","/","texts","/","$text_codigo" ] }
                            }
                        ],
                        default: ""
                    }
                }
            }
        },
        { $sort : { text_codigo : 1 } }
    ]);



    const categoriaNivel3 = await Categoria.aggregate([
        { $match : { $and: [
                  {cate_codigo_padre: {$ne: null}}
                , {cate_codigo_padre: {$ne: ''}}
                , {cate_codigo : {'$regex' : '(([0-9]*[.])?[0-9]*[.])?[0-9]+', '$options' : 'i'}}
            ]} 
        },
        { 
            "$project": {
                _id : 0,
                cate_codigo : 1,
                cate_descripcion: 1,
                cate_codigo_padre: 1,
                link: { $concat: [ "/digesto/laws","/","categories","/","$cate_codigo" ]}
            } 
        },
        { $sort : { cate_codigo : 1 } }
    ]);

    const textoNivel3 = await Texto.aggregate([
        { $match : { $and: [
                  {text_codigo_padre: {$ne: null}}
                , {text_codigo_padre: {$ne: ''}}
                , {text_codigo : {'$regex' : '(([0-9]*[.])?[0-9]*[.])?[0-9]+', '$options' : 'i'}}
            ]}
        },
        {
            "$project": {
                _id : 0,
                text_codigo : 1,
                text_descripcion: 1,
                text_codigo_padre: 1,
                link: { $concat: [ "/digesto/laws","/","texts","/","$text_codigo" ]}
            }
        },
        { $sort : { cate_codigo : 1 } }
    ]);

    const loMasVisto = await Auditoria.aggregate([
	{ $group : {_id: "$leye_id", count:{$sum:1}}}, 
	{ $sort  : {"count":-1}}, 
	{ $limit : 10 }, 
	{ $lookup: {from: 'leyes', localField: '_id', foreignField: '_id', as: 'leyes'} }
   ]);
    


    res.render('index', {location,categoriaNivel1,categoriaNivel2,categoriaNivel3,paginas,loMasVisto,textoNivel1,textoNivel2,textoNivel3});
});

// ADMIN
router.get('/admin/',(req, res) =>{
    res.set('Cache-Control', 'no-store')
    location.parent = null;
    location.id = "inicio";
    sess = req.session;
    if (sess.usuario){
        res.render('admin', {location});
    }
    else {
        var error = false;
        res.render('login', {error});
    }
});

router.get('/admin/login',(req, res) =>{
    location.parent = null;
    location.id = "inicio";
    sess = req.session;
    if (sess.usuario){ 
        res.render('admin', {location});
    } else {
        var error = false;
        res.render('login', {error});
    }
});

router.get('/admin/login/error',(req, res) =>{
    location.parent = null;
    location.id = "inicio";
    var error = true;
    res.render('login', {error});
});


router.post('/admin/login', async (req, res) =>{
    
    var params = req.body;
    const usuario = await Usuario.find( { usua_codigo: params.usuario, usua_contrasena: params.password } , function(
	    err,
	    result
    ) {
    	if (err) {
            res.redirect('/digesto/admin/login/error');
        } else {
            if ( result[0] && result[0].usua_estado && result[0].usua_estado == 'ACTI' ) {
                sess = req.session;
                sess.usuario = params.usuario;
                sess.tipo = result[0].usua_tipo;
                res.redirect('/digesto/admin/');
            } else {
                res.redirect('/digesto/admin/login/error');
            }
        }
    });
});

router.get('/admin/logout',(req, res) =>{
  
    req.session.destroy((err) => {
        if(err) {
            return console.log(err);
        }
        sess.usuario = "";
        sess.tipo = "";
        res.redirect('/digesto/')
    });
});

router.get('/admin/forgotpassword',(req, res) =>{
    res.render('forgotpassword');
});

/*************************************  
 * Users
 * ***********************************/
router.get('/admin/users',(req, res) =>{
    res.redirect('/digesto/admin/users/list');
});

router.post('/admin/users/list.json', function (req, res) {
    res.set('Cache-Control', 'no-store');
    sess = req.session;
    if (sess.usuario){  
    var datatablesQuery = require('datatables-query'),
        params = req.body,
        query = datatablesQuery(Usuario);
    query.run(params).then(function (data) {
        res.json(data);
    }, function (err) {
        res.status(500).json(err);
    });
    
    } else {

	res.redirect('/digesto/');

    }
});

router.get('/admin/users/list', async (req, res) =>{
  res.set('Cache-Control', 'no-store');
  sess = req.session;
  if (sess.usuario){
    location.parent = "seguridad";
    location.id = "usuarios";
    res.render('listUsers', {location});
  } else {
  	res.redirect('/digesto/');
  }
});

router.get('/admin/users/add',(req, res) =>{
  res.set('Cache-Control', 'no-store');
  sess = req.session;
  if (sess.usuario){
    location.parent = "seguridad";
    location.id = "usuarios";
    res.render('addUser', {location});
  } else {
  	res.redirect('/digesto/');
  }
});
router.post('/admin/users/add', async (req, res) =>{
  res.set('Cache-Control', 'no-store');
  sess = req.session;
  if (sess.usuario){
    const usuario = new Usuario(req.body);
    await usuario.save();
    res.redirect('/digesto/admin/users/list');
  } else {
        res.redirect('/digesto/');
  }
});

router.get('/admin/users/edit/:id', async (req, res) =>{
  res.set('Cache-Control', 'no-store');
  sess = req.session;
  if (sess.usuario){
    location.parent = "seguridad";
    location.id = "usuarios";
    const { id } = req.params;
    const usuario = await Usuario.findById(id);
    res.render('editUser', {usuario, location});
  } else {
        res.redirect('/digesto/');
  }
});

router.post('/admin/users/edit/:id', async (req, res) =>{
  res.set('Cache-Control', 'no-store');
  sess = req.session;
  if (sess.usuario){
    const { id } = req.params;
    await Usuario.update({_id: id}, req.body);
    res.redirect('/digesto/admin/users/list');
  } else {
    res.redirect('/digesto/');
  }
});

router.get('/admin/users/delete/:id', async (req, res) =>{
  res.set('Cache-Control', 'no-store');
  sess = req.session;
  if (sess.usuario){
    location.parent = "seguridad";
    location.id = "usuarios";
    const { id } = req.params;
    const usuario = await Usuario.findById(id);
    res.render('deleteUser', {usuario, location});
  } else {
    res.redirect('/digesto/');
  }
});

router.post('/admin/users/delete/:id',async (req, res) =>{
  res.set('Cache-Control', 'no-store');
  sess = req.session;
  if (sess.usuario){
    const { id } = req.params;
    await Usuario.deleteOne({_id: id });
    res.redirect('/digesto/admin/users/list');
  } else {
    res.redirect('/digesto/');
  }

});

/*************************************  
 * Categories
 * ***********************************/
router.get('/admin/categories',(req, res) =>{
    res.redirect('/digesto/admin/categories/list');
});

router.post('/admin/categories/list.json', function (req, res) {
  res.set('Cache-Control', 'no-store');
  sess = req.session;
  if (sess.usuario){
    var datatablesQuery = require('datatables-query'),
        params = req.body,
        query = datatablesQuery(Categoria);
    query.run(params).then(function (data) {
        res.json(data);
    }, function (err) {
        res.status(500).json(err);
    });
  } else {
  	res.redirect('/digesto/');
  }
});

router.get('/admin/categories/list', async (req, res) =>{
  res.set('Cache-Control', 'no-store');
  sess = req.session;
  if (sess.usuario){
    location.parent = "configuracion";
    location.id = "categorias";
    res.render('listCategories', {location});
  } else {
  	res.redirect('/digesto/');
  }
});

router.get('/admin/categories/add', async (req, res) =>{
  res.set('Cache-Control', 'no-store');
  sess = req.session;
  if (sess.usuario){
    location.parent = "configuracion";
    location.id = "categorias";
    const categorias = await Categoria.find();
    res.render('addCategory', {categorias, location});
  } else {
  	res.redirect('/digesto/');
  }
});

router.post('/admin/categories/add', async (req, res) =>{
  res.set('Cache-Control', 'no-store');
  sess = req.session;
  if (sess.usuario){
    const categoria = new Categoria(req.body);
    try {
    	await categoria.save();
    	res.redirect('/digesto/admin/categories/list');
    } catch (err) {
        const categorias = await Categoria.find();
	res.render('addCategory', {categoria, categorias, err, location})
    }
  } else {
  	res.redirect('/digesto/');
  }
});

router.get('/admin/categories/edit/:id', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "categorias";
    const { id } = req.params;
    const categoria = await Categoria.findById(id);
    const categorias = await Categoria.find();
    res.render('editCategory', {categorias, categoria, location});
});
router.post('/admin/categories/edit/:id', async (req, res) =>{
    const { id } = req.params;
    await Categoria.update({_id: id}, req.body);
    res.redirect('/digesto/admin/categories/list');
});

router.get('/admin/categories/delete/:id', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "categorias";
    const { id } = req.params;
    const categoria = await Categoria.findById(id);
    const categorias = await Categoria.find();
    res.render('deleteCategory', {categorias, categoria, location});
});

router.post('/admin/categories/delete/:id',async (req, res) =>{
    const { id } = req.params;
    await Categoria.deleteOne({_id: id });
    res.redirect('/digesto/admin/categories/list');
});

/*************************************  
 * Paginas
 * ***********************************/
router.get('/admin/pages',(req, res) =>{
    res.redirect('/digesto/admin/pages/list');
});

router.post('/admin/pages/list.json', function (req, res) {
    var datatablesQuery = require('datatables-query'),
        params = req.body,
        query = datatablesQuery(Pagina);
    query.run(params).then(function (data) {
        res.json(data);
    }, function (err) {
        res.status(500).json(err);
    });
});

router.get('/admin/pages/list', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "paginas";
    res.render('listPages', {location});
});

router.get('/admin/pages/add', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "paginas";
    const pagina = await Pagina.find();
    res.render('addPage', {pagina, location});
});

router.post('/admin/pages/add', async (req, res) =>{
    const pagina = new Pagina(req.body);
    await pagina.save();
    res.redirect('/digesto/admin/pages/list');
});

router.get('/admin/pages/edit/:id', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "paginas";
    const { id } = req.params;
    const pagina = await Pagina.findById(id);
    res.render('editPage', {pagina, location});
});
router.post('/admin/pages/edit/:id', async (req, res) =>{
    const { id } = req.params;
    await Pagina.updateOne({_id: id}, req.body);
    res.redirect('/digesto/admin/pages/list');
});

router.get('/admin/pages/delete/:id', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "paginas";
    const { id } = req.params;
    const pagina = await Pagina.findById(id);
    res.render('deletePage', {pagina, location});
});

router.post('/admin/pages/delete/:id',async (req, res) =>{
    const { id } = req.params;
    await Pagina.deleteOne({_id: id });
    res.redirect('/digesto/admin/pages/list');
});

/*************************************  
 * Publicaciones
 * ***********************************/
router.get('/admin/publications',(req, res) =>{
    res.redirect('/digesto/admin/publications/list');
});

router.post('/admin/publications/list.json', async (req, res) =>{
    const paginas = await Pagina.find();

    var datatablesQuery = require('datatables-query'),
        params = req.body,
        query = datatablesQuery(Publicacion);
    
    /*params.columns[1].searchable = 'true';*/
    params.columns[1].search.value = params.pagina;

    query.run(params).then(function (jsonData) {
        let data = JSON.parse(JSON.stringify(jsonData), (key, val) => (
            typeof val !== 'object' && val !== null ? String(val) : val
        ));
        
        for (i in data.data) {
            try {
                for ( k in paginas ){
                    if ( paginas[k].pagi_codigo == data.data[i].pagi_codigo) {
                        data.data[i].pagi_codigo = data.data[i].pagi_codigo +" - "+ paginas[k].pagi_descripcion;
                    } 
                }
            } catch(e){
                console.log(e);
            }
            data.data[i].publ_contenido = "";
        }
        //console.log(data);  
        res.json(data);
    }, function (err) {
        res.status(500).json(err);
    });
});

router.get('/admin/publications/list', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "publicaciones";
    res.render('listPublications', {location});
});

router.get('/admin/publications/list/page/:id', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "publicaciones";
    const { id } = req.params;
    const paginas = await Pagina.find({"pagi_codigo": id});
    res.render('listPublications', {paginas, location});
});

router.get('/admin/publications/add', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "publicaciones";
    const paginas = await Pagina.find();
    const maximos = await Publicacion.aggregate(
  	 [{
             $group:
        	 {
           	 _id: "$pagi_codigo",
           	 maximo: { $max: "$publ_orden" }
      	   	}
     	 }]
	);
    res.render('addPublication', {paginas, maximos, location});
});

router.post('/admin/publications/add', async (req, res) =>{
    const publicacion = new Publicacion(req.body);
    await publicacion.save();
    res.redirect('/digesto/admin/publications/list');
});

router.get('/admin/publications/edit/:id', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "publicaciones";
    const { id } = req.params;
    const publicacion = await Publicacion.findById(id);
    const paginas = await Pagina.find();
    res.render('editPublication', {paginas, publicacion, location});
});

router.post('/admin/publications/edit/:id', async (req, res) =>{
    const { id } = req.params;
    await Publicacion.updateOne({_id: id}, req.body);
    res.redirect('/digesto/admin/publications/list');
});

router.get('/admin/publications/delete/:id', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "publicaciones";
    const { id } = req.params;
    const publicacion = await Publicacion.findById(id);
    const paginas = await Pagina.find();
    res.render('deletePublication', {paginas, publicacion, location});
});

router.post('/admin/publications/delete/:id',async (req, res) =>{
    const { id } = req.params;
    await Publicacion.deleteOne({_id: id });
    res.redirect('/digesto/admin/publications/list');
});

router.post('/admin/publications/upload',async (req, res) =>{

	try{

		if(req.files) {

			let file = req.files.file;
			let filename = file.name.replace(/ /g,"_");
			file.mv(__dirname + '/../views/static/uploads/' + filename, function(err){
	        	        if (err) {
        	        	    console.log("Err: ",err);
	                            res.json({"status":false});
        		        } else {
                		    console.log("Uploaded successfully!");
        	        	    res.json({"status":true, "filename": filename});
	        	        }
			});
		}

	} catch (err) {
        	console.log("Err: ",err);
	        res.status(500).send(err);
    	}

});

/*************************************  
 * Leyes
 * ***********************************/
router.get('/admin/laws',(req, res) =>{
    res.redirect('/digesto/admin/laws/list');
});

router.get('/admin/laws/list', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "leyes";
    const leyes = await Ley.find();
    res.render('listLaws', {leyes, location});
});

router.post('/admin/laws/list.json', async (req, res)=> {
    const categorias = await Categoria.find();
    var datatablesQuery = require('datatables-query'),
        params = req.body,
        query = datatablesQuery(Ley);
	query.run(params).then(function (data) {
        
        for (i in data.data) {
            try {
                for ( k in categorias ){
                    if ( categorias[k].cate_codigo == data.data[i].cate_codigo) {
                        data.data[i].cate_codigo = data.data[i].cate_codigo +" - "+ categorias[k].cate_descripcion;
                    } 
                }
            } catch(e){
                console.log(e);
            }
            data.data[i].publ_contenido = "";
        }

        res.json(data);
    }, function (err) {
        res.status(500).json(err);
    });
});

router.get('/admin/laws/list/incompleted', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "leyes";
    const leyes = await Ley.find();
    res.render('listIncompletedLaws', {leyes, location});
});

router.post('/admin/laws/listIncompleted.json', async (req, res)=> {
    const categorias = await Categoria.find();
    var datatablesQuery = require('datatables-query'),
        params = req.body,
        query = datatablesQuery(Ley);

	params.columns[9].searchable=false;
	params.columns[9].search.value='^((doc).)*$';
	params.columns[10].searchable=true;
        params.columns[10].search.value='^((pdf).)*$';
	console.log("params: ",params.columns[10].search);
        query.run(params).then(function (data) {
        for (i in data.data) {
            try {
                for ( k in categorias ){
                    if ( categorias[k].cate_codigo == data.data[i].cate_codigo) {
                        data.data[i].cate_codigo = data.data[i].cate_codigo +" - "+ categorias[k].cate_descripcion;
                    }
                }
            } catch(e){
                console.log(e);
            }
            data.data[i].publ_contenido = "";
        }

        res.json(data);
    }, function (err) {
        res.status(500).json(err);
    });
});


router.get('/admin/laws/add', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "leyes";
    const categorias = await Categoria.find();
    const leyes = await Ley.find();
    const textos = await Texto.find();
    res.render('addLaw', {leyes, categorias, location, textos});
});

router.post('/admin/laws/add', async (req, res) =>{
    var body = req.body;
    //console.log("Files: ", req.files);
    try {
        

        body.leye_asociaciones = body.leye_asociaciones.split(",");
        body.leye_derogaciones = body.leye_derogaciones.split(",");
        body.leye_doc = body.leye_doc.replace("C:\\fakepath\\","").replace(" ","_");
        body.leye_pdf = body.leye_pdf.replace("C:\\fakepath\\","").replace(" ","_");

        if(req.files && req.files.leye_doc_file) { 
            req.files.leye_doc_file.mv(__dirname + '/../views/static/files/' + req.files.leye_doc_file.name, function(err){
                if (err) {
                    console.log("Error: ",err);
                } else {
                    console.log("leye_doc_file saved ok");
                }
            });
        }

        if(req.files && req.files.leye_pdf_file) { 
            req.files.leye_pdf_file.mv(__dirname + '/../views/static/files/' + req.files.leye_pdf_file.name, function(err){
                if (err) {
                    console.log("Error: ",err);
                } else {
                    console.log("leye_pdf_file saved ok");
                }
            });
        }


        const ley = new Ley(body);
        await ley.save();


        res.json({"status":"ok"});
    } catch (err) {
        console.log("Err: ",err);
        res.json({"status":"error", "message": err.errmsg});
    }
});

router.get('/admin/laws/edit/:id', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "leyes";
    const { id } = req.params;
    const ley = await Ley.findById(id);
    const categorias = await Categoria.find();
    const leyes = await Ley.find({ _id: {$ne: id}});
    const textos = await Texto.find();
    res.render('editLaw', {categorias, textos, leyes, ley, location, moment});
});

router.post('/admin/laws/edit/:id', async (req, res) =>{
    /*req.body.leye_fecha_sancion = moment(req.body.leye_fecha_sancion, 'DD/MM/YYYY').format('MM-DD-YYYY');
    try {
        req.body.leye_fecha_promulgacion = moment(req.body.leye_fecha_promulgacion, 'DD/MM/YYYY').format('MM-DD-YYYY');
    } catch (err) {
        console.log("No se pudo actualizar la fecha de promulgacion: ",err);
    }
    */
    const { id } = req.params;

    try {
        await Ley.updateOne({_id: id}, req.body);
        res.json({"status":"ok"});
    } catch(err){
        res.json({"status":"error", "message": err.errmsg});
    }
});

router.get('/admin/laws/delete/:id', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "leyes";
    const { id } = req.params;
    const ley = await Ley.findById(id);
    const categorias = await Categoria.find();
    res.render('deleteLaw', {categorias, ley, location, moment});
});

router.post('/admin/laws/delete/:id',async (req, res) =>{
    const { id } = req.params;
    const ley = await Ley.findById(id);
    const leyNro = ley.leye_numero;
    
    Ley.find({"leye_asociaciones": leyNro}).countDocuments(function (err, resp) {
        if (err){
            console.log(err);
        }

        if (resp > 0) {
            res.status(500).json("Existen asociaciones a esta ley. No puede ser eliminada. ");
        }
    });

    
    Ley.find({"leye_derogaciones": leyNro}).countDocuments(function (err, resp) {
        if (err)
           console.log(err);
           res
        if (resp > 0) {
            res.status(500).json("Existen asociaciones a esta ley. No puede ser eliminada. ");
        }
    });

    await Ley.deleteOne({_id: id });
    res.redirect(url.format({
        pathname:"/digesto/admin/laws/list",
        query: { "status": "ok" }
    }));

});

router.get('/admin/laws/uploadWord/:id', async (req, res) =>{
    res.set('Cache-Control', 'no-store');
    sess = req.session;
    if (sess.usuario){
        location.parent = "configuracion";
        location.id = "leyes";
        const { id } = req.params;
        const ley = await Ley.findById(id);
        res.render('uploadWord', {sess, ley, location});
    } else {
        res.redirect('/');
    }
});

router.post('/admin/laws/uploadWord/:id', async (req, res) =>{
    const { id } = req.params;
    try {
        if(req.files) {
            console.log("Word: ",req.files);
            let arquivo = req.files.arquivo;
            const ley = await Ley.findById(id);
            ley.leye_doc = arquivo.name;
            await ley.save();
                arquivo.mv(__dirname + '/../views/static/files/' + arquivo.name, function(err){
                if (err) {
                    console.log("Err: ",err);
                    res.status(500).send(err);
                    res.end();
                } else {
                    console.log("Uploaded successfully!");
                    res.writeHead(200, {"Content-Type": "text/plain"});
                    res.status(200);
                    res.end();
                }
            });


            }
    } catch (err) {
         console.log("Err: ",err);
         res.status(500).send(err);
    }
});


router.get('/admin/laws/uploadPDF/:id', async (req, res) =>{
    res.set('Cache-Control', 'no-store');
    sess = req.session;
    if (sess.usuario){
        location.parent = "configuracion";
        location.id = "leyes";
        const { id } = req.params;
        const ley = await Ley.findById(id);
        res.render('uploadPDF', {sess, ley, location});
    } else {
        res.redirect('/');
    }
});


router.post('/admin/laws/uploadPDF/:id', async (req, res) =>{
    const { id } = req.params;
    try {
        if(req.files) {
            console.log("PDF: ",req.files);
            let arquivo = req.files.arquivo;
            const ley = await Ley.findById(id);
            ley.leye_pdf = arquivo.name;
            await ley.save();
                arquivo.mv(__dirname + '/../views/static/files/' + arquivo.name, function(err){
                if (err) {
                    console.log("Err: ",err);
                    res.status(500).send(err);
                    res.end();
                } else {
                    console.log("Uploaded successfully!");
                    res.writeHead(200, {"Content-Type": "text/plain"});
                    res.status(200);
                    res.end();
                }
            });


            }
    } catch (err) {
         console.log("Err: ",err);
         res.status(500).send(err);
    }
});

/*************************************
 *  * Textos
 *   * ***********************************/
router.get('/admin/texts',(req, res) =>{
    res.redirect('/digesto/admin/texts/list');
});

router.post('/admin/texts/list.json', function (req, res) {
  res.set('Cache-Control', 'no-store');
  sess = req.session;
  if (sess.usuario){
    var datatablesQuery = require('datatables-query'),
        params = req.body,
        query = datatablesQuery(Texto);
    query.run(params).then(function (data) {
        res.json(data);
    }, function (err) {
        res.status(500).json(err);
    });
  } else {
        res.redirect('/digesto/');
  }
});

router.get('/admin/texts/list', async (req, res) =>{
  res.set('Cache-Control', 'no-store');
  sess = req.session;
  if (sess.usuario){
    location.parent = "configuracion";
    location.id = "textos";
    res.render('listTexts', {location});
  } else {
        res.redirect('/digesto/');
  }
});

router.get('/admin/texts/add', async (req, res) =>{
  res.set('Cache-Control', 'no-store');
  sess = req.session;
  if (sess.usuario){
    location.parent = "configuracion";
    location.id = "textos";
    const textos = await Texto.find();
    res.render('addText', {textos, location});
  } else {
        res.redirect('/digesto/');
  }
});

router.post('/admin/texts/add', async (req, res) =>{
  res.set('Cache-Control', 'no-store');
  sess = req.session;
  if (sess.usuario){
    const text = new Texto(req.body);
    try {
        await text.save();
        res.redirect('/digesto/admin/texts/list');
    } catch (err) {
        const textos = await Texto.find();
        res.render('addText', {text, textos, err, location})
    }
  } else {
        res.redirect('/digesto/');
  }
});

router.get('/admin/texts/edit/:id', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "textos";
    const { id } = req.params;
    const texto = await Texto.findById(id);
    const textos = await Texto.find();
    res.render('editText', {textos, texto, location});
});
router.post('/admin/texts/edit/:id', async (req, res) =>{
    const { id } = req.params;
    await Texto.update({_id: id}, req.body);
    res.redirect('/digesto/admin/texts/list');
});

router.get('/admin/texts/delete/:id', async (req, res) =>{
    location.parent = "configuracion";
    location.id = "textos";
    const { id } = req.params;
    const texto = await Texto.findById(id);
    const textos = await Texto.find();
    res.render('deleteText', {textos, texto, location});
});

router.post('/admin/texts/delete/:id',async (req, res) =>{
    const { id } = req.params;
    await Texto.deleteOne({_id: id });
    res.redirect('/digesto/admin/texts/list');
});

/*************************************
 ** Search by
 ** ***********************************/
router.get('/laws/categories/:id', async (req, res) => {
    var id = req.params.id;
    res.redirect('/digesto/laws/categories/'+id+'/10');
});

router.get('/laws/categories/:id/:limit', async (req, res) =>{
    var id  = req.params.id;
    var limit  = Number( req.params.limit );
    
    const catego = await Categoria.find({"cate_codigo": id});
    var titulo = catego[0].cate_codigo + " . " + catego[0].cate_descripcion;

    const categorias = await Categoria.find({ $or: [ {cate_codigo: id}, {cate_codigo_padre: {$regex: new RegExp('^'+id+'\\.[^\\.]*') }} ] }, {_id:0, cate_codigo:1});
    var categoriasList = [];
	
    categorias.forEach(function (categoria) {
    		categoriasList.push( categoria.cate_codigo );
	});
	
    const leyes = await Ley.aggregate([
		//{ "$match": {"$expr": { "$in": ["$cate_codigo", categoriasList] }}},
		{ "$match": {"$expr": { $reduce: { input: "$cate_codigo", initialValue: "", in: { "$in": ["$$this", categoriasList] } }}}},
		{ "$sort" : { "leye_numero" : -1 } },
		{ '$facet'    : {
        			metadata: [ { $count: "total" }, { $addFields: { page: 1 } } ],
        			data: [ { $skip: 0 }, { $limit: limit } ] 
    			} 
		}
	]);
    
    const paginas = await Pagina.aggregate([
        { $sort : { pagi_orden : 1 } },
        {
            "$project": { _id: 0,
                            pagi_descripcion: 1,
                            link : { $concat :["/digesto/pages","/", {"$substr": ["$pagi_codigo",0,-1]}] }
                        } 
        }
    ]);

    const categoriasNivel1 = await Categoria.aggregate([
        { $match: {
            $or: [ {cate_codigo_padre: null},{cate_codigo_padre: ''} ]
        }},
        {
          $project: {
            _id: 0,
            cate_codigo: 1,
            cate_descripcion: 1,
            cate_codigo_padre: 1,
            orden: lpad("$cate_codigo",2,"0")	
          }
        },
        { $sort : { orden : 1 } },
        { $project: {orden: 0 } }
    ]);

    const textos = null;
    const cursos = null;
    var sgteLimite = limit + 10; 
    if ( leyes[0].metadata.length > 0 ) {
    	if ( leyes[0].metadata[0].total <= limit ) {
		limit = leyes[0].metadata[0].total;
		sgteLimite = 0;
    	} 
    } else {
	    limit = 0;
	    sgteLimite = 0;
    }
    var categoriaId = id;

    res.render('listLawsByCategories', {paginas, leyes, categoriasNivel1, textos, cursos, titulo, limit, sgteLimite, categoriaId});

});


router.get('/pages/:id', async (req, res) =>{
    location.id = "paginas";
    const id = req.params.id;
    const pagina = await Pagina.find( {pagi_codigo : id} );
    const paginas = await Pagina.aggregate([
        { $sort : { pagi_orden : 1 } },
        {
            "$project": { _id: 0,
                            pagi_descripcion: 1,
                            link : { $concat :["/digesto/pages","/", {"$substr": ["$pagi_codigo",0,-1]}] }
                        }
        }
    ]);


    const categoriasNivel1 = await Categoria.aggregate([
        { $match: {
            $or: [ {cate_codigo_padre: null},{cate_codigo_padre: ''} ]
        }},
        {
          $project: {
            _id: 0,
            cate_codigo: 1,
            cate_descripcion: 1,
            cate_codigo_padre: 1,
            orden: lpad("$cate_codigo",2,"0")
          }
        },
        { $sort : { orden : 1 } },
        { $project: {orden: 0 } }
    ]);

    const publicaciones  = await Publicacion.find({pagi_codigo: id});
    res.render('pages', {id, location, pagina, paginas, categoriasNivel1, publicaciones});
});




router.get('/pages/details/:id', async (req, res) =>{
    location.id = "publicaciones";
    const { id } = req.params;
    const publicacion = await Publicacion.findById( id );
    const paginas = await Pagina.aggregate([
        { $sort : { pagi_orden : 1 } },
        {
            "$project": { _id: 0,
                            pagi_descripcion: 1,
                            link : { $concat :["/digesto/pages","/", {"$substr": ["$pagi_codigo",0,-1]}] }
                        }
        }
    ]);


    const categoriasNivel1 = await Categoria.aggregate([
        { $match: {
            $or: [ {cate_codigo_padre: null},{cate_codigo_padre: ''} ]
        }},
        {
          $project: {
            _id: 0,
            cate_codigo: 1,
            cate_descripcion: 1,
            cate_codigo_padre: 1,
            orden: lpad("$cate_codigo",2,"0")
          }
        },
        { $sort : { orden : 1 } },
        { $project: {orden: 0 } }
    ]);
    res.render('pagesDetails', {id, location, publicacion, paginas, categoriasNivel1 });
});

router.get('/results/:tipo/:valor', async (req, res) => {
    const id = req.params.tipo;
    const valor = req.params.valor;
    res.redirect('/digesto/results/'+id+'/'+valor+'/'+10);
});

router.get('/results/:tipo/:valor/:limit', async (req, res) =>{
    location.id = "resultado";
    
    const tipo = req.params.tipo;
    const valor = req.params.valor;
	var limit  = Number( req.params.limit );

    let match = {};
    match = { $or: []};
	
    if ( tipo == 'todo' || tipo == 'titulo') {
        match.$or.push( {"leye_titulo": {$regex: new RegExp(valor) } });
    }

    if ( tipo == 'todo' || tipo == 'numero' || tipo == 'resolucion' ) {
        match.$or.push( {leye_numero: {$regex: new RegExp(valor) } });
    }

    if ( tipo == 'todo' || tipo == 'nombre') {
        match.$or.push( {leye_nombre_popular: {$regex: new RegExp(valor) } });
    }

    if ( tipo == 'todo' || tipo == 'anho') {
        match.$or.push( {leye_fecha_promulgacion: {$regex: new RegExp(valor) } });
    }

    const leyes = await Ley.aggregate([
		{ "$match": match },
		{ "$sort" : { "leye_numero" : -1 } },
		{ '$facet'    : {
        			metadata: [ { $count: "total" }, { $addFields: { page: 1 } } ],
        			data: [ { $skip: 0 }, { $limit: limit } ] 
    			} 
		}
	]);
    var publicaciones;
    if ( tipo == 'resolucion') {
	publicaciones = await Publicacion.aggregate([
                { "$match": { "publ_contenido": {$regex: new RegExp(valor) } } },
                { "$sort" : { "publ_titulo" : -1 } },
                { '$facet'    : {
                                metadata: [ { $count: "total" }, { $addFields: { page: 1 } } ],
                                data: [ { $skip: 0 }, { $limit: limit } ]
                        }
                }
        ]);
    }
	
    const paginas = await Pagina.aggregate([
        { $sort : { pagi_orden : 1 } },
        {
            "$project": { _id: 0,
                            pagi_descripcion: 1,
                            link : { $concat :["/digesto/pages","/", {"$substr": ["$pagi_codigo",0,-1]}] }
                        }
        }
    ]);

    console.log("3");

    const categoriasNivel1 = await Categoria.aggregate([
        { $match: {
            $or: [ {cate_codigo_padre: null},{cate_codigo_padre: ''} ]
        }},
        {
          $project: {
			_id: 0,
			cate_codigo: 1,
			cate_descripcion: 1,
			cate_codigo_padre: 1,
			orden: lpad("$cate_codigo",2,"0")
          }
        },
        { $sort : { orden : 1 } },
        { $project: {orden: 0 } }
    ]);

    var titulo = "Resultado de Busqueda";
    var sgteLimite = limit + 10; 

    if ( leyes[0].metadata.length > 0 ) {
    	if ( leyes[0].metadata[0].total <= limit ) {
            limit = leyes[0].metadata[0].total;
            sgteLimite = 0;
    	} 
    } else {
	    limit = 0;
	    sgteLimite = 0;
    }
	
    res.render('listLawsBySearch', {location, leyes, paginas, categoriasNivel1, titulo, limit, sgteLimite, tipo, valor, publicaciones});
});






router.get('/ley5282', async (req, res) =>{
    location.id = "Ley 5282";
    const id = req.params.id;
    const paginas = await Pagina.aggregate([
        { $sort : { pagi_orden : 1 } },
        {
            "$project": { _id: 0,
                            pagi_descripcion: 1,
                            link : { $concat :["/digesto/pages","/", {"$substr": ["$pagi_codigo",0,-1]}] }
                        }
        }
    ]);


    const categoriasNivel1 = await Categoria.aggregate([
        { $match: {
            $or: [ {cate_codigo_padre: null},{cate_codigo_padre: ''} ]
        }},
        {
          $project: {
            _id: 0,
            cate_codigo: 1,
            cate_descripcion: 1,
            cate_codigo_padre: 1,
            orden: lpad("$cate_codigo",2,"0")
          }
        },
        { $sort : { orden : 1 } },
        { $project: {orden: 0 } }
    ]);

    res.render('ley5282', {id, location, paginas, categoriasNivel1});
});

router.get('/contacts', async (req, res) =>{
    location.id = "Contactenos";
    const id = req.params.id;
    const paginas = await Pagina.aggregate([
        { $sort : { pagi_orden : 1 } },
        {
            "$project": { _id: 0,
                            pagi_descripcion: 1,
                            link : { $concat :["/digesto/pages","/", {"$substr": ["$pagi_codigo",0,-1]}] }
                        }
        }
    ]);

    res.render('contacts', {id, location, paginas});
});

router.post('/contacts', async (req, res) =>{
	var body = req.body;
	console.log("Contacts request: ",req);
	let message = {
	    	   from: "alexdaniels15@email.com",
       		     to: "adhonig@gmail.com",
	        subject: "Nuevo contacto desde Digesto",
	           html: "<h1>Asunto:</h1><p>"+body.subject+"</p><br>"+
		         "<h1>De:</h1><p>"+body.name+" - "+body.email+"</p><br>"+
			 "<h1>Telefono:</h1><p>"+body.phone+"</p><br>"+
			 "<h1>Mensaje:</h1><p>"+body.text+"</p><br>"
        }

	/*transporter.sendMail(message, function(err, info) {
		if (err) {
			console.log(err);
		} else {
			console.log(info);
  		}
	});*/	

	res.redirect('/digesto/')

});

router.get('/laws/:id', async (req, res) =>{
    location.id = "Ley";

    const { id } = req.params;
    const ley = await Ley.findById(id);
    let leyCategoria;
    let leyCategoriaPadre;
    if ( ley.cate_codigo && ley.cate_codigo[0].length ) {

	leyCategoria = await Categoria.find({cate_codigo : ley.cate_codigo});
	if ( typeof leyCategoria != 'undefined' && leyCategoria.length ) {
		leyCategoriaPadre = await Categoria.find({cate_codigo : leyCategoria[0].cate_codigo_padre });
		console.log("leyCategoriaPadre: ",leyCategoriaPadre);
	}

    }
	

    const paginas = await Pagina.aggregate([
        { $sort : { pagi_orden : 1 } },
        {
            "$project": { _id: 0,
                            pagi_descripcion: 1,
                            link : { $concat :["/digesto/pages","/", {"$substr": ["$pagi_codigo",0,-1]}] }
                        }
        }
    ]);


    const categoriasNivel1 = await Categoria.aggregate([
        { $match: {
            $or: [ {cate_codigo_padre: null},{cate_codigo_padre: ''} ]
        }},
        {
          $project: {
            _id: 0,
            cate_codigo: 1,
            cate_descripcion: 1,
            cate_codigo_padre: 1,
            orden: lpad("$cate_codigo",2,"0")
          }
        },
        { $sort : { orden : 1 } },
        { $project: {orden: 0 } }
    ]);


    try {
	var auditObj = {}
	auditObj.leye_id = id;
	auditObj.audi_fecha = Date.now();
	auditObj.audi_agente = req.headers['user-agent'];
	auditObj.audi_ip = req.headers['x-forwarded-for'];
	const auditoria = new Auditoria(auditObj);
	await auditoria.save();
    } catch (err) {
	console.log("Error al guardar la auditoria: ",err);
    }
    res.render('laws', {id, location, paginas, categoriasNivel1, ley, leyCategoria, leyCategoriaPadre});
});


router.get('/laws/texts/:id', async (req, res) => {
    var id = req.params.id;
    res.redirect('/digesto/laws/texts/'+id+'/10');
});

router.get('/laws/texts/:id/:limit', async (req, res) =>{
    var id  = req.params.id;
    var limit  = Number( req.params.limit );

    const text = await Texto.find({"text_codigo": id});
    var titulo = text[0].text_codigo + " . " + text[0].text_descripcion;

    const textos = await Texto.find({ $or: [ {text_codigo: id}, {text_codigo_padre: {$regex: new RegExp('^'+id+'\\.[^\\.]*') }} ] }, {_id:0, text_codigo:1});
    var textosList = [];

    textos.forEach(function (texto) {
		textosList.push( texto.text_codigo );
	});

    const leyes = await Ley.aggregate([
		{ "$match": {"$expr": {"$in": ["$text_codigo", textosList]}}},
		{ "$sort" : { "leye_numero" : -1 } },
		{ '$facet': {
				metadata: [ { $count: "total" }, { $addFields: { page: 1 } } ],
				data: [ { $skip: 0 }, { $limit: limit } ]
			}
		}
	]);

    const paginas = await Pagina.aggregate([
        { $sort : { pagi_orden : 1 } },
        {
            "$project": { _id: 0,
                            pagi_descripcion: 1,
                            link : { $concat :["/digesto/pages","/", {"$substr": ["$pagi_codigo",0,-1]}] }
                        }
        }
    ]);

    const categoriasNivel1 = await Categoria.aggregate([
        { $match: {
            $or: [ {cate_codigo_padre: null},{cate_codigo_padre: ''} ]
        }},
        {
          $project: {
            _id: 0,
            cate_codigo: 1,
            cate_descripcion: 1,
            cate_codigo_padre: 1,
            orden: lpad("$cate_codigo",2,"0")
          }
        },
        { $sort : { orden : 1 } },
        { $project: {orden: 0 } }
    ]);

    const textosNivel1 = null;
    const cursos = null;
    var sgteLimite = limit + 10;
    if ( leyes[0].metadata.length > 0 ) {
		if ( leyes[0].metadata[0].total <= limit ) {
				limit = leyes[0].metadata[0].total;
				sgteLimite = 0;
		}
	} else {
			limit = 0;
			sgteLimite = 0;
	}
	var textoId = id;

	res.render('listLawsByTexts', {paginas, leyes, categoriasNivel1, textosNivel1, cursos, titulo, limit, sgteLimite, textoId});

});


module.exports = router;
