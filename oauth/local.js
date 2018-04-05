/*
The MIT License (MIT)
Copyright (c) 2015 Aaron Rau

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var _this = function(config,callbackHandler,callbackErrorHandler){
		
	var PARAMS = require('../utils/params.js')();
	var port = PARAMS.PORT;
	var URL = PARAMS.URL;
	//http://dannysu.com/2014/01/16/google-api-service-account/
	//http://www.bentedder.com/server-to-server-authorization-for-google-analytics-api-with-node-js/

	var cbHandle = callbackHandler,
		cbError = callbackErrorHandler,
		SOURCE_TYPE = "local";

	
	//-----------Auth 
	var user = require("../controllers/user.js");
	
	var CLIENT_ID = config.CLIENT_ID,
		CLIENT_SECRET = config.CLIENT_SECRET,
		REDIRECT_URL = config.AppCallBackURL; 
	

	var _authorizeBasic = function(tokens,req,res)
	{

		if(!err)
		{
			//console.log(result);
		  	var data = result.data;

			var defaultEmail = null;
			var username = null;
			if(data.emails)
				for(var i = 0; i < data.emails.length; i++)
				{
					var em = data.emails[i];
					defaultEmail = em.value;
					break;
				}

			if(defaultEmail)
			{
				var un = defaultEmail.split('@');
				username = un[0];
			}

			if(!username)
			{
				if(data.displayName)
					username = data.displayName.toLowerCase().replace(' ','.');
				else
					username = data.id;
			}
				

			var authData = {
				tokens:tokens,
				user:{
					sourceFullname:data.displayName,
					sourceUserName:username,
			  		sourceUserProfilePic:data.image.url,
			  		sourceUserEmail:defaultEmail
				},
				raw:data

			}
			
			var params = {
			  source: SOURCE_TYPE,
			  sourceUserId:data.id,
			  OAuthData:authData

			};

			if(req.query.state)
				params.state = req.query.state;
			
			cbHandle(req,res,params);

		}
		else
		{
			res.send(err);
		}

	}
	

	return {
		refreshToken:function(refresh_token,callback){

		
		},
		getAuthClient:function(token){


			return null;
		},
		auth:function(req, res, parseKeys)
		{
			console.log("auth");

			var params = {
			}
			if(req.query.state){
				params.state = req.query.state;
			}
	

			res.redirect(URL+'/login?callback='+REDIRECT_URL);
		},
		authCallback:function(req, res, parseKeys)
		{
			console.log("authcallback");
			
			user.getTokenByRequestCode(req.query.code, function(err, tokens) {

				if(!err) {
					
					return _authorizeBasic(tokens,req,res);

				}
				else
				{
					res.send(err);
				}
			});
		}
	}
}


module.exports = _this;