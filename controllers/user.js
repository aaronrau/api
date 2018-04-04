/*
The MIT License (MIT)
Copyright (c) 2015 Aaron Rau

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var Buffer = require('buffer').Buffer
    ,rack = require('hat').rack()
    ,shortid = require('shortid')

var _DB = require('../utils/datacontext.js');

var _this = {
	setRole:function(){

	},
	createRole:function(){

	},
	oauth:function(oauthparams,callback){

    var noauth = {
        _id:oauthparams.source+'-'+oauthparams.sourceUserId,
        source:oauthparams.source,
        sourceUserId:oauthparams.sourceUserId,
        OAuthData:oauthparams.OAuthData
      }

		//check for exiting users if not create new users with new session token
    _DB.find("OAuth",{_id:noauth._id},function(existingAuths){

      if(existingAuths ? existingAuths.length > 0 : false){
         var existingAuth = existingAuths[0];
        noauth.userId = existingAuth.userId;

        _DB.save("OAuth",noauth,function(savedOAuth){

          savedOAuth.sessionToken = "r:"+rack();
          
          callback(savedOAuth);

        });
      }
      else
      {
        if(noauth.OAuthData.user)
        {
            var u = noauth.OAuthData.user;
            var newUser = {
              fullname:u.sourceFullname,
              nonUniqueUsername:u.sourceUserName,
              profileURL:u.sourceUserProfilePic,
              suggestedEmail:u.sourceUserEmail
            }

            if(u.sourceUserEmail)
            {
              var ems = u.sourceUserEmail.split('@');
              newUser.suggestedEmailDomain = ems[1];
            }

            _this.update(newUser,function(savedUser){

              noauth.userId = savedUser._id;
              _DB.save("OAuth",noauth,function(savedOAuth){

                savedOAuth.sessionToken = "r:"+rack();
                
                callback(savedOAuth);

              });
                
            });
        }
        else
        {
            _this.update({},function(savedUser){

              noauth.userId = savedUser._id;
              _DB.save("OAuth",noauth,function(savedOAuth){

                savedOAuth.sessionToken = "r:"+rack();
                
                callback(savedOAuth);

              });
            });
        }
      }
      
    });

		
	},
	auth:function(user,callback){

    var expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    var session = {
        "_id":shortid.generate(),
        "_session_token" : "r:"+rack(), // AR: place holder for now,
        "_p_user" : "_User$"+user._id,
        "createdWith" : {
            "action" : "signup",
            "authProvider" : "password"
        },
        "restricted" : false,
        "installationId" : rack(),
        "expiresAt" : expiresAt,
        "_updated_at" : new Date(),
        "_created_at" : new Date()
    }

    _DB.save("_Session",session,function(savedSession){

      callback(savedSession);

    });

	},
	logout:function(user,callback){

	},
	update:function(params,callback){
    //assume security was already checked

    if(params.suggestedEmail)
    {
      _DB.find("_User",{suggestedEmail:params.suggestedEmail},function(existingUsers){

        var nuser = params;
        if(existingUsers ? existingUsers.length > 0 : false)
        {
          nuser = existingUsers[0];
        } 

        _DB.save("_User",
          nuser,
          function(savedUser){
            callback(savedUser);
          });

      });
    }
    else
    {
      _DB.save("_User",
        {
          username:rack(),
          _hashed_password:rack()
        },
        function(savedUser){
          callback(savedUser);
        });
    }

	},
	get:function(id,callback){


	},
	getByToken:function(token,callback){


	},
	handleOAuthResponse:function(req,res,oauthdata){
		res.render('access',{auth:oauthdata});
	},
	handleOAauthError:function(req,res,error)
    {
      res.render('access_error',{error:error});
    }
}
module.exports = _this;