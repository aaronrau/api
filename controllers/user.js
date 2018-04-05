/*
The MIT License (MIT)
Copyright (c) 2015 Aaron Rau

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var PARAMS = require('../utils/params.js')();
var Buffer = require('buffer').Buffer
    ,rack = require('hat').rack()
    ,shortid = require('shortid')
    ,titleCase = require('title-case')
    ,cryto = require('crypto-js')
    ,qs = require('querystring');

var _DB = require('../utils/datacontext.js');

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

function generateToken(){
  return cryto.HmacSHA256(rack(), CONFIG.USER.PASSWORD_HASH_SECRET).toString();
}

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

            _this.auth(savedUser,function(session){
              savedOAuth.sessionToken = session.token;
              callback(savedOAuth);
            });

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

                _this.auth(savedUser,function(session){
                  savedOAuth.sessionToken = session.token;
                  callback(savedOAuth);
                });

              });
                
            });
        }
        else
        {
            _this.update({},function(savedUser){

              noauth.userId = savedUser._id;
              _DB.save("OAuth",noauth,function(savedOAuth){

                _this.auth(savedUser,function(session){
                  savedOAuth.sessionToken = session.token;
                  callback(savedOAuth);
                });

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
        "token" : generateToken(), 
        "userId" : user._id, 
        "expiresAt" : expiresAt,
        "_updated_at" : new Date(),
        "_created_at" : new Date()
    }

    _DB.save("_Session",session,function(savedSession){

      callback(savedSession);

    });

	},
  reset:function(params,callback){
    console.log("reset password");

    _DB.find("_UserPasswordReset",{code:params.code},function(existingRecovery){
      if(existingRecovery ? existingRecovery.length > 0 : false)
      {
        var recovery = existingRecovery[0],
            now = new Date();

        if(recovery.expiresAt > now)
        {
          _DB.find("_User",{_id:recovery.userId},function(users){
            if(users ? users.length > 0 : false)
            {
              var user = users[0];
              user.hashpassword = cryto.HmacSHA256(params.password, CONFIG.USER.PASSWORD_HASH_SECRET).toString();

              _DB.save("_User",user,function(){
                callback(null,true);
              });
            }
            else
            {
               callback("code invalid",false);
            }
          })
        }
        else
        {
          callback("code invalid",false);
        }
      }
      else
      {
        callback("code invalid",false);
      }
    })

    
  },
  login:function(params,callback) //login or signup email
  {
    var query = {};
    if(params.email)
      query = {suggestedEmail:params.email}
    else if(params.mobile)
      query = {mobile:params.mobile}

    if(params.password){
      //AR: #security generate password hash
      params.hashpassword  = cryto.HmacSHA256(params.password, CONFIG.USER.PASSWORD_HASH_SECRET).toString();

      //AR: #security never store the password
      delete params.password;
    }

    _DB.find("_User",query,function(existingUsers){

        if(existingUsers ? existingUsers.length > 0 : false)
        {
          var auser = existingUsers[0];
          if(auser.hashpassword == params.hashpassword)
          {
            _this.auth(auser,function(authdata){
              callback(null,authdata);
            });
          }
          else
          {
            callback("invalid password",null);
          }
        }
        else
        { 
          //callback("user not found",null);

          //AR: create new user if not found. This can be commented out if not needed
          _this.update(params,function(newuser){
            _this.auth(newuser,function(authdata){
              callback(null,authdata);
            });
          });
        }
    });

    
  },
  forgot:function(params,callback){ 
    
    var query = null;
    if(params.email){
      query = {suggestedEmail:params.email}
    }
    else if(params.mobile){
      query = {mobile:params.mobile}
    }

    console.log("forgot password");
    //console.log(params);

    _DB.find("_User",query,function(existingUsers){
      if(existingUsers ? existingUsers.length > 0 : false)
      {
        var user = existingUsers[0];

       var expiresAt = new Date();
          expiresAt.setTime(expiresAt.getTime() + ((.5*60)*60*1000)); // AR: #security expires in 30 minutes

        _DB.save("_UserPasswordReset",
        {
          "expiresAt":expiresAt,
          "code":cryto.HmacSHA256(rack(), CONFIG.USER.PASSWORD_HASH_SECRET).toString(),
          "userId" : user._id,
        },
        function(recovery){
          //console.log("Here is the recovery code:"+recovery.code);
          //AR: You can add email here or sms here
          callback(null,true);
        });
      }
      else
      {
        callback("Invalid email or phone",false);
      }
    
    });

  },
	logout:function(user,callback){
    callback(null,false);
	},
	update:function(params,callback){
    //assume security was already checked

    var query = null;
    if(params.email){
      query = {suggestedEmail:params.email}

      //AR: #security do not store email since, we may want the user to be able to change this later
      params.suggestedEmail = params.email;
      delete params.email;
    }
    else if(params.mobile){
      query = {mobile:params.mobile}
    }


    if(query)
    {
      _DB.find("_User",query,function(existingUsers){

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
          username:(params.username ? params.username : generateToken()),
          _hashed_password:(params.hashpassword ? params.hashpassword : generateToken())
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
  getTokenByRequestCode:function(code,callback)
  {

  },
//Request / Route handlers here
  handleLogin:function(req,res,next)
  {
    var ps = req.path.split('/');
    
    //render ui, map login paths to handlebars parameters ie /login/forgot > {isForgot:true}
    if(req.method == 'GET') 
    {
      if(ps[1].length > 1)
      {
        var params = {};
        params["isMode"+titleCase(ps[1])] = true;
        res.render('login',params);
      }
      else
      {
        res.render('login',{isModeLogin:true});
      }
    }
    else if(req.method == 'POST' || req.method == 'PUT') //post / put
    {
      //https://stackoverflow.com/questions/4295782/how-do-you-extract-post-data-in-node-js
      var queryData = ""
      req.on('data', function(data) {
          queryData += data;
          if(queryData.length > 1e6) { // AR: #security prevent flooding attack
              queryData = "";
              res.render('login',{});
              req.connection.destroy();
          }
      });

      req.on('end', function() {
          var data = qs.parse(queryData);
              query = req.query;
          
          //pass query parameters down
          for(var p in query)
          {
            data[p] = query[p]
          }

          if(ps[1].length > 1)
          {
            var params = {};
            params["isMode"+titleCase(ps[1])] = true;
            

            //#security restrict calls to specific functions 
            switch(ps[1].toLowerCase()) {
                case "reset":
                case "forgot":
                    _this[ps[1]](data,function(error,result){
                      if(error){
                        params.error = error;
                      }
                      else
                      {
                        params["isComplete"] = true; //AR: #security flag everything as "complete" to prevent probing attack.? However user will get confused
                      }

                      res.render('login',params);
                    });

                    break;
                default:
                    res.render('login',params);
            }
          }
          else
          {

            _this.login(data,function(error,authData){

              if(!authData)
              {
                res.render('login',{isModeLogin:true,error:(error ? error : "unable to login")});
              }
              else
              {
                if(query.callback){ //oauth //api
                  res.redirect(query.callback+'?code='+authData.code + (query.state ? "&state="+query.state :"")); //send to local auth handler
                }
                else{
                  res.render('login',{isModeLogin:true,isComplete:true,auth:authData});
                }
              }
            })
          }
          
      });
    }
    else
    {
      res.send({});
    }

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