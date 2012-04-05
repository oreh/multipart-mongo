/*!
 * Multipart
 * Copyright(c) 2012 Liu Xiaohui (herolxh@gmail.com)
 * Description: This is modified multipart middleware from Connect. The
 * files uploaded are wrote to mongodb GridFS instead of to the local file system.
 */

/**
 * Module dependencies.
 */

var formidable = require('formidable')
    , utils = require('connect').utils
    , qs = require('qs')
    , mime = require('mime')
    , uuid = require('node-uuid')
    , format = require('util').format
    , CircularBuffer = require('./circular_buffer').CircularBuffer
    , mongoskin = require('mongoskin');

if (global.db){
    var db = global.db
}
else{
    throw "Cannot find mongodb instances"
}

var KB = 1024;
var MB = 1024*KB;

var CHUNK_SIZE_OPTIONS = {
    '1k': KB, '4k':4*KB, '16k':16*KB, '64k': 64*KB, '256k': 256*KB, 
    '1m': MB, '4m':4*MB}

var MEM_BUFFER_SIZE = MB;

var IncomingForm = function(){
    formidable.IncomingForm.apply(this);
}

IncomingForm.prototype = new formidable.IncomingForm;

IncomingForm.prototype.onPart = function(part){
    if (!part.filename && part.filename != ''){
        this.handlePart(part);
        return;
    }
    
    if (part.filename == ''){
        return;
    }

    var self = this;
    this._flushing++;

    var file = {
        path: 'tmp/'+uuid.v4(),
        name: part.filename,
        type: mime.lookup(part.filename),
    };
    var gridstore = null;
    self.cache = new CircularBuffer(MEM_BUFFER_SIZE*2);
    self.cache_to_write = null;
    self.writting = false;

    console.log(format("%s\tTransfering '%s' to mongodb", new Date().toString(), part.filename));

    self.pause();
    console.log(format("%s\tInit GridStore for '%s'", new Date().toString(), file.path));
    
    var chunk_size = CHUNK_SIZE_OPTIONS['256k'];
    if ('chunk-size' in self.headers){
        if (CHUNK_SIZE_OPTIONS[self.headers['chunk-size'].toLowerCase()]){
            chunk_size = CHUNK_SIZE_OPTIONS[self.headers['chunk-size'].toLowerCase()];
        }
    }

    db.gridfs().open(file.path, 'w', {
            root: 'fs',
            content_type: mime.lookup(part.filename),
            chunk_size: chunk_size
        },
        function(err, gs) {
            if (err){
                throw err
            }
            if (!gs){
                throw "Failed to open gridfs"
            }
            console.log(format("%s\tOpenned GridFS for file '%s'", new Date().toString(), file.path));
            gridstore = gs;
            if (self.cache_to_write && !self.writting){
                self.writting = true;
                gridstore.write(self.cache_to_write, function(err, fd){
                    if (err){
                        throw err
                    }
                    self.cache_to_write = null;
                    self.writting = false;
                    self.resume()
                });
            }
            else{
                self.resume();
            }
        }
    );

    part.on('data', function(buffer) {
        if (self.cache.write(buffer)){
            throw 'unexpected bytes drop'
        }
        if (self.cache.datasize() >= MEM_BUFFER_SIZE){
            if (self.cache.start == 0){
                self.cache.start = MEM_BUFFER_SIZE;
                self.cache_to_write = self.cache.slice(0, MEM_BUFFER_SIZE);
            }
            else{
                self.cache.start = 0;
                self.cache_to_write = self.cache.slice(MEM_BUFFER_SIZE, 2*MEM_BUFFER_SIZE);
            }
        }
        if (gridstore && self.cache_to_write && !self.writting){
            self.pause();
            self.writting = true;
            gridstore.write(self.cache_to_write, function(err, fd){
                if (err){
                    throw err
                }
                self.cache_to_write = null;
                self.writting = false;
                self.resume()
            });
        }
    });

    part.on('end', function(){
        if (gridstore && !self.writting && (!self.cache || !self.cache.datasize())){
            gridstore.close(function(err, data) {
                console.log(format("%s\tGridStore instance is closed", new Date().toString()));
                self._flushing--;
                self.emit('file', part.name, file);
                self._maybeEnd();
            });
        }
        else{
            if (!gridstore || self.writting){
                if (!gridstore){
                    console.log(format("%s\twarning\tPart is ended before GridStore instance is ready", new Date().toString()));
                }
                var that = this;
                setTimeout(function(event){
                    that.emit('end');
                }, 50, 'end');
                return;
            }

            var that = this;
            if(self.cache.datasize()){
                self.writting = true;
                self.cache_to_write = self.cache.slice(self.cache.start, self.cache.end);
                gridstore.write(self.cache_to_write, true, function(err, fd){
                    if (err){
                        throw err
                    }
                    console.log(format("%s\tWriten the last block to GridFS", new Date().toString()));
                    self.cache_to_write = null;
                    self.writting = false;
                    self.cache = null;
                    file.file_id = fd.fileId;
                    that.emit('end');
                });
            }
        }
    });
}

/**
 * Multipart:
 * 
 * Parse multipart/form-data request bodies,
 * providing the parsed object as `req.body`
 * and `req.files`.
 *
 * Configuration:
 *
 *  The options passed are merged with [formidable](https://github.com/felixge/node-formidable)'s
 *  `IncomingForm` object, allowing you to configure the upload directory,
 *  size limits, etc. For example if you wish to change the upload dir do the following.
 *
 *     app.use(connect.multipart({ uploadDir: path }));
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */

exports = module.exports = function(options){
  options = options || {};
  return function multipart(req, res, next) {
    if (req._body) return next();
    req.body = req.body || {};
    req.files = req.files || {};

    // ignore GET
    if ('GET' == req.method || 'HEAD' == req.method) return next();

    // check Content-Type
    if ('multipart/form-data' != utils.mime(req)) return next();

    // flag as parsed
    req._body = true;

    // parse
    var form = new IncomingForm
      , data = {}
      , files = {}
      , done;

    Object.keys(options).forEach(function(key){
      form[key] = options[key];
    });

    function ondata(name, val, data){
      if (Array.isArray(data[name])) {
        data[name].push(val);
      } else if (data[name]) {
        data[name] = [data[name], val];
      } else {
        data[name] = val;
      }
    }

    form.on('field', function(name, val){
      ondata(name, val, data);
    });

    form.on('file', function(name, val){
      ondata(name, val, files);
    });

    form.on('error', function(err){
      next(err);
      done = true;
    });

    form.on('end', function(){
      if (done) return;
      try {
        req.body = qs.parse(data);
        req.files = qs.parse(files);
        next();
      } catch (err) {
        next(err);
      }
    });

    form.parse(req);
  }
};
