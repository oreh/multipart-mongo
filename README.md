# Multipart-Mongo

Mutliple-mongo is an extension of the [Multipart](http://www.senchalabs.org/connect/multipart.html) middleware from [Connect](http://www.senchalabs.org/connect/). The goal of multipart-mongo is to make it easy for developers to store uploaded files direclty into mongodb (i.e. GridFS). 

Ensure that mongodb is installed and running locally. Then start a server as follows

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

From the console, one can upload a file using curl.

```
curl -X POST -F "targets=@test.txt" "http://localhost:3000/"

By default, uploaded files will be stored in collection fs.files with a chunksize of 256k. One can customize the chunksize by passing chunk-size option in the request header.

```
curl -X POST -F "targets=@test.txt" "http://localhost:3000/" -H "chunk-size:64k"

Valid chunk-size options are ['1k', '4k', '16k', '64k', '256k', '1m', '4m']

