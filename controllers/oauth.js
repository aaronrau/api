/*
The MIT License (MIT)
Copyright (c) 2018 Aaron Rau

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var Google = require('../oauth/google.js'); //AR: hard code this for now

var PARAMS = require('../utils/params.js')(),
	port = PARAMS.PORT,
	URL = PARAMS.URL;

//Application specific configuration
var CONFIG = require('../configs/dev.js');
if(PARAMS.IsProduction){
  //console.log("-=[PROD]=-")
    CONFIG = require('../configs/prod.js');
}
else
{
  //console.log("-=[DEV]=-")
}

var _DB = require('../utils/datacontext.js'),
	UserController = require('./user.js');


var OAuthCallBackHandler = function(req, res, authedData){

		UserController.oauth(authedData,function(authedDataWithSessionToken){
	    	UserController.handleOAuthResponse(req, res,authedDataWithSessionToken);
	    });

	}
	OAuthErrorHandler = function(req, res, params){

	};

//Various OAUTH sources
var SOURCES = {
  google: new Google({
    PEM:CONFIG.OAUTH.google.PEM,
    ClientId:CONFIG.OAUTH.google.ClientId,
    CLIENT_SECRET:CONFIG.OAUTH.google.CLIENT_SECRET,
    AppCallBackURL:URL+"/auth/google/callback",
    },OAuthCallBackHandler,OAuthErrorHandler)
}


var _this = {
	//route to the correct oauth
	handler:function(req, res, next){

	  var p = req.path.split('/');
	  var parts =[];
	  for(var i = 0; i < p.length; i++)
	  {
	    if(p[i].length > 0)
	    {
	      parts.push(p[i]);
	    }
	  }

	  try{

	    var sourceType = parts[0];

	    if(parts.length == 1)
	    {
	      if(SOURCES[sourceType])
	        SOURCES[sourceType].auth(req,res);
	      else
	        res.render('access_error',{error:"Unable to Perform Auth:"});
	    }//handles callback
	    else if(parts.length == 2)
	    {
	      if(SOURCES[sourceType])
	        SOURCES[sourceType].authCallback(req,res);
	      else
	       res.render('access_error',{error:"Unable to Perform Callback Auth:"});
	    }

	  }catch(ex){console.log(ex)}

	}
}
module.exports = _this;