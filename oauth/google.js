/*
The MIT License (MIT)
Copyright (c) 2015 Aaron Rau

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var GoogleSource = function(config,callbackHandler,callbackErrorHandler){
	

	//http://dannysu.com/2014/01/16/google-api-service-account/
	//http://www.bentedder.com/server-to-server-authorization-for-google-analytics-api-with-node-js/

	var cbHandle = callbackHandler;
	var cbError = callbackErrorHandler;
	var SOURCE_TYPE = "google";

	var {google} = require('googleapis');
	var OAuth2 = google.auth.OAuth2;

	//-----------Auth google

	var GOOGLE_JSONPEM = config.PEM


	var GOOGLE_CLIENT_ID = config.CLIENT_ID; 
	var GOOGLE_CLIENT_SECRET = config.CLIENT_SECRET; 
	var GOOGLE_REDIRECT_URL = config.AppCallBackURL; 

	
	
	var googOauth2Client = new OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL);
	


	var _authorizeBasic = function(tokens,req,res)
	{
		var authClient = new OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL);
		authClient.setCredentials(tokens);

		var plus = google.plus('v1');
		plus.people.get({ userId: 'me', auth: authClient }, function(err, result) {

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


		});


	}
	

	return {
		refreshToken:function(refresh_token,callback){

			var authClient = new OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL);
			authClient.setCredentials(refresh_token);

			authClient.refreshAccessToken(function(err, token) {
				console.log(err);
				callback(token);

			});
		},
		getAuthClient:function(token){
			var authClient = new OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL);
			authClient.setCredentials(token);
			return authClient;
		},
		auth:function(req, res, parseKeys)
		{
			console.log("auth");

			var params = {
				//prompt:"login", //https://stackoverflow.com/questions/33598011/google-oauth-how-to-check-that-user-has-already-allowed-access-to-my-application
				prompt:"consent", //AR: need to request another token that can refresh //https://stackoverflow.com/questions/33598011/google-oauth-how-to-check-that-user-has-already-allowed-access-to-my-application
			  	access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token) 
			  	//prompt=consent
			  	//scope: ['https://www.googleapis.com/auth/analytics.readonly'] // If you only need one scope you can pass it as string 
				scope: ['https://www.googleapis.com/auth/userinfo.profile'] // If you only need one scope you can pass it as string 
				//scope: ['https://www.googleapis.com/auth/userinfo.email','https://www.googleapis.com/auth/userinfo.profile','https://www.googleapis.com/auth/calendar'] // If you only need one scope you can pass it as string 
			}
			if(req.query.state){
				params.state = req.query.state;
			}

		
			var googOauthUrlRedirect = googOauth2Client.generateAuthUrl(params);

			res.redirect(googOauthUrlRedirect);
		},
		authCallback:function(req, res, parseKeys)
		{
			console.log("authcallback");
			
			googOauth2Client.getToken(req.query.code, function(err, tokens) {

				//	//https://stackoverflow.com/questions/33598011/google-oauth-how-to-check-that-user-has-already-allowed-access-to-my-applicati


				if(!err) {
					
					return _authorizeBasic(tokens,req,res);

					//return _authorizeCalendar(parseKeys,tokens,req,res);

					//return _authorizeAnalytics(parseKeys,tokens,req,res);

				}
				else
				{
					res.send(err);
				}
			});
		}
	}
}


module.exports = GoogleSource;