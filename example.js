/**
 * Module dependencies.
 */
var inspect = require('util').inspect;
var mongo = require('mongoskin');
var db = global.db = mongo.db('localhost/filestore?auto_reconnect=true&poolSize=1');

var connect = require("connect")
  , multipart = require("./lib/multipart")

db.open(function(err, db){
    var app = connect();
    app.use(multipart());
    app.use(function(req, res){
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
