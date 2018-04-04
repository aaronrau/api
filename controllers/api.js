
/*
The MIT License (MIT)
Copyright (c) 2015 Aaron Rau

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

//AR: This is a express sub app not a route handler bc the API may require more complexity later.


//map path to object
//for example /users will map the users collection.
function pathToObjMetaData(path,obj){
	var ps = path.split('/');

	var r = {
		type:null,
		id:null
	};

	if(ps.length == 2)
	{
		r.type = ps[1].split('?')[0];
	}
	else if(ps.length == 3){
		r.type = ps[1].split('?')[0];
		r.id = ps[2].split('?')[0];
	}

	return r;
}


var express = require("express"),
	bodyParser = require('body-parser'),
	app = express(),
	async = require('async'),
	DB = require('../utils/datacontext.js');

// parse application/json
// AR: Assumes security is handled already by main app
app.use('/',bodyParser.json())
app.get('/', function (req, res) {
  res.render('api',{});
});


app.get("/*",function(req,res,next){

	
	var m = pathToObjMetaData(req.path);
	console.log("GET:"+m.type);
	if(m.type)
	{
		DB.find(m.type,req.query,function(results){

			res.send(results);

		});
	}
	else
	{
		res.send({});
	}

});
app.put("/*",function(req,res,next){

	var m = pathToObjMetaData(req.path);
	console.log("PUT:"+m.type);
	DB.save(m.type,req.body,function(result){
		res.send(result);
	});

});
app.post("/*",function(req,res,next){

	var m = pathToObjMetaData(req.path);
	console.log("POST:"+m.type);
	DB.save(m.type,req.body,function(result){
		res.send(result);
	});

});


//AR: Couple of different ways of handling this in the future we can use sub apps, dynamic handlers ..etc
// app.get('/:endpoint', function (req, res) {
// 	var dynamicController = require('./api/'+name+'/'+req.params.endpoint+'.js');
//     if(dynamicController)
//     {
//     	dynamicController(req,res,next);
//     }
//     else
//     {
//     	console.log('Did not find ./api/'+name+'/'+req.params.endpoint+'.js')
//     	res.send(404);
//     }
// });


module.exports = app;