/*
The MIT License (MIT)
Copyright (c) 2015 Aaron Rau

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


//AR: Hard code to mongodb for now

const 	MongoClient = require('mongodb').MongoClient,
		shortid = require('shortid');

var PARAMS = require('../utils/params.js')();

//Application specific configuration
var CONFIG = require('../configs/development.js');
if(PARAMS.IsProduction){
  //console.log("-=[PROD]=-")
    CONFIG = require('../configs/production.js');
}
else
{
  //console.log("-=[DEV]=-")
}

//Direct DB Access 
//=========================================================================
var MONGODB = null;
function DB(callback){

	if(MONGODB)
		return callback(MONGODB);

	// https://mongodb.github.io/node-mongodb-native/driver-articles/mongoclient.html 
	//connection pooling;
	MongoClient.connect(CONFIG.MONGODB.CONNECTION_STRING, function(err, client) {
		console.log("connecting to mongodb");
		if(err){
		  	console.error(err);
		  	//throw new Error('Error accessing DB');

			return callback(null);
		}


		MONGODB = client.db(CONFIG.MONGODB.DEFAULT_DB); //AR: need to move this later

		callback(MONGODB)

	});
}
//Save stuff in mongo
function save(type,obj,callback){
    
    if(!obj._id)
    	obj._id = shortid.generate();

    if(obj.password)
   		delete obj.password; //#security never save the actual password

    console.log("saving object to MongoDB:"+type+" "+obj._id ? obj._id : "")
    var c = MONGODB.collection(type);

    var cObj = {};
    for(var p in obj)
    {
      cObj[p] = obj[p];
    }

    if(cObj["_created_at"]){
      if(cObj["_created_at"]["$date"])
      {
        cObj["_created_at"] = new Date(cObj["_created_at"]["$date"])
      }
      else
      {
        cObj["_created_at"] = new Date()
      }
    }
    else{
      cObj["_created_at"] = new Date();  
    }
    
    cObj["_updated_at"] = new Date();

    var cProp = {};
    var cArrays = {};
    var hasArrays = false;
    for(var p in cObj)
    {
      if(Array.isArray(cObj[p]) && (p == "comments" || p == "activities" )) //aways append arrays
      {
        
        cArrays[p] = { $each: cObj[p] };

        hasArrays = true;
      }
      else
      {
        cProp[p] = cObj[p];
      }
    }

    var sParams = {
      $set:cProp
    }
    if(hasArrays)
      sParams["$addToSet"] = cArrays 

    //console.log(JSON.stringify(sParams));

    c.update({_id:cObj._id},sParams,{ upsert: true },function(err, mResult) {
      console.log("action: saved "+obj._id);
      if(err)
        console.log(err);
      //console.log(mResult);
      if(callback)
        callback(obj);

    });
}
//find stuff in mongo
function find(type,query,callback){
	//AR: need to handle exception
    var defaultLimit = 1000,
        defaultSkip = 0,
        c = null,
        results = [];

    try{
         c = MONGODB.collection(type);
      }
      catch(ex){
        console.log("mongo error "+type);
        console.error(ex);
      }

	if(c)
	{
	 //$orderby is deprecated use sort instead
		if(query["$orderby"])
		{
			//AR sort later
		  var sortParams = [];

		  var ps = query["$orderby"],
		  	sp = ps.split('|');


			if((sp.length > 1 ? sp[1] : "-1") == "-1")
				sortParams.push([sp[0],'descending']);
			else
				sortParams.push([sp[0],'ascending']);
		  


		  	delete query["$orderby"];

	
		    if(query['$limits']){
		    	defaultLimit = parseInt(query['$limits']);
		    	delete query["$limits"];
		    }

		    if(query['$skip']){
		    	defaultSkip = parseInt(query['$skip']);
		    	delete query["$skip"];
		    }

		    
			//c.find(query,{limit:defaultLimit,skip:defaultSkip}).toArray(function(err,results){
		  	c.find(query,{limit:defaultLimit,skip:defaultSkip,sort:sortParams}).toArray(function(err,results){

		    //https://stackoverflow.com/questions/14790770/how-to-index-an-or-query-with-sort
		    //https://stackoverflow.com/questions/22797768/does-mongodbs-in-clause-guarantee-order
		    //AR: Mongo sort is only applied to each set not retrieved value //Need to manually sort here


		    if(err)
		      console.log (err);
		  	var rm = results.map(x => {
		  		x.id = x._id;
		  		return x;
		  	});

		  	
		    callback(rm);
		  });
		}
		else
		{
		  c.find(query).toArray(function(err,results){
		    if(err)
		      console.log (err);

		  	var rm = results.map(x => {
		  		x.id = x._id;
		  		return x;
		  	});

		    callback(rm);
		  });
		}
	}
	else
	{
		callback([]);
	}
}



module.exports =  {
	cursor:function(type,query,options,callback){

		try{
			DB((client) => {

				var cursor = client.collection(type).find(query,options);
				callback(cursor);
			});
		}
		catch(ex){
			console.log(ex)

			callback(null);
		}

	},
	find:function(type,obj,callback){

		try{
			DB(() => find(type,obj,callback));
		}
		catch(ex){
			console.log(ex)

			callback([]);
		}
		
	},
	save:function(type,obj,callback){
		try{
			DB(() => save(type,obj,callback));
		}
		catch(ex){
			console.log(ex);
			callback();
		}
		
	}
}