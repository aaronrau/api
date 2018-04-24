/*
The MIT License (MIT)
Copyright (c) 2015 Aaron Rau

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
var PARAMS = require('../utils/params.js')();


var parseCookies = function(request) {
    var list = {},
        rc = request.headers.cookie;

    rc && rc.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = unescape(parts.join('='));
    });

    return list;
}

var _DB = require('../utils/datacontext.js'),
	_CACHE = require('../utils/cache.js'),
	user = require('./user.js');
	

var _getToken = function(req){
	var token = parseCookies(req).session_token;
	if(!token)
		token = req.header('session_token');
	return token
	},
	_getSecurityGroup = function(req){
		var groupid = parseCookies(req).group_id;
		if(!groupid)
			groupid = req.header('group_id');
		return groupid
	}

var _this = {
	getAccess:function(type,obj,callback){
		//Send hash of users with access
		var access = {}

		var oid = obj.id ? obj.id : obj._id;
		if(oid)
		{
			//lookup the db for validate permissions. 
			DB.find(type,{_id:oid}, results => {
				var orgObj = null;
				if(results ? results.length > 0 : false)
				{
					orgObj = results[0];
					access[orgObj._created_by] = 'write';
					access[orgObj._updated_by] = 'write';
					
					if(orgObj._wperm) //loop through additional write permissions
						orgObj._wperm.forEach(uid => {access[uid] = 'write';});
			
					if(orgObj._rperm) //loop through additional read permissions
						orgObj._rperm.forEach(uid => {if(!access[uid]) access[uid] = 'read';});

					callback(access,orgObj);	
				}
				else
				{
					if(obj._created_by)
						access[_created_by] = 'write';
					if(obj._updated_by)
						access[_updated_by] = 'write';	

					callback(access,obj);
				}
			});

		}
		else
		{
			if(obj._created_by)
				access[_created_by] = 'write';
			if(obj._updated_by)
				access[_updated_by] = 'write';	

			callback(access,obj);
		}


	},
	handler:(req, res, next) => {


		//AR: Add security requirements here ex: redirect to https or check token
		
		if(PARAMS.IsProduction)
			if (req.headers['x-forwarded-proto'] !== 'https') {
		        return res.redirect(['https://', req.get('Host'), req.url].join(''));
		    }
	    
	    //Open CORS 
	    res.header("Access-Control-Allow-Origin", "*");
	    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,'DELETE");
	    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, sender, session, session_token, socket");

	    
	    //AR: Check header tokens here
	    //AR: add "user" & "sessionToken" to the request object
		var token = _getToken(req),
			gid = _getSecurityGroup(req);

		if(token)
		{
			_CACHE.get(token,value => {

				if(!value || value == -1)
				{
					user.getByToken(token,gid, user => {
						if(user){
							//AR: placeholder under better caching system is in place
							
							_CACHE.set(token,user);
							req.user = user;
							req.sessionToken = token;
						}
						else
						{
							_CACHE.set(token, -1);
							delete req.user; // remove invalid token user
							delete req.sessionToken;
						}

						return next();
						

					});
				}
				else
				{	
					req.user = value;
					req.sessionToken = token;
					return next();
				}
			});
		}
		else
		{
			return next();
		}

		
	}
}
module.exports = _this;