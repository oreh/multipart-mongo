# Multipart-Mongo

Mutliple-mongo is an extension of the [Multipart](http://www.senchalabs.org/connect/multipart.html) middleware from [Connect](http://www.senchalabs.org/connect/). The goal of multipart-mongo is to make it easy for developers to store uploaded files direclty into mongodb (i.e. GridFS). 

```js
var inspect = require('util').inspect;
var mongo = require('mongoskin');
var db = global.db = mongo.db('localhost/filestore?auto_reconnect=true&poolSize=1');

var connect = require("connect")
  , multipart = require("multipart-mongo")

db.open(function(err, db){
    var app = connect();
    app.use(connect.json());
    app.use(connect.urlencoded());
    app.use(multipart());
    app.use(function(req, res){
        console.log(req.headers);
        if (req.method == 'GET'){
            res.end('Try POST a file\n');
            return;
        }
        if (req.method == 'POST'){
            res.end(inspect(req.files)+'\n');
            return;
        }
        res.end('Not implemented');
    });
    app.listen(3000);
    console.log('Server is running at port 3000. POST to "/" to upload file');
})
