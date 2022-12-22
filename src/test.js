var express = require('express');
var app = express();
va server = require('http').createServer(app);

server.listen(80,'domain');

app.get('/:id(\\d+)', function (req, res) {
	var id = req.params.id;
	res.end("refdas: "+id);
	console.log('id='+id);
});
