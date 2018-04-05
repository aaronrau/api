//create default database
use default

//create user
db.createUser(
   {
     user: "user",
     pwd: "password",
     roles: [ "readWrite", "dbAdmin" ]
   }
)