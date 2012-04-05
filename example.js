/**
 * Module dependencies.
 */

var mongo = require('mongoskin');
var db = global.db = mongo.db('localhost/filestore?auto_reconnect=true&poolSize=1');

var connect = require("connect")
  , multipart = require("./lib/multipart")

db.open(function(err, db){
    var app = connect();
    app.use(connect.logger('dev'))
    app.use(connect.static('public'))
    app.use(connect.json());
    app.use(connect.urlencoded());
    app.use(multipart());
    app.use(function(req, res){
        res.end('hello world\n');
      });
    app.listen(3000);
})
