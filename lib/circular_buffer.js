/*
 * Ucloud - circular buffer
 * Copyright(c) 2012 HP Labs Singapore
 * Description: A Circular Buffer that is implemented with node.js Buffer
 */

var CircularBuffer = exports.CircularBuffer = function(size){
    if (!size || isNaN(size)){
        throw size + " is not a number";
    }
    this.buffer = new Buffer(size);
    this.data_size = 0;
    this.length = size;
    this.start = 0;
    this.end = 0;
}

CircularBuffer.prototype.write = function(data){
    if(Buffer.isBuffer(data)) {
        return writeBuffer(this, data);
    }
    // not implemented yet
}

CircularBuffer.prototype.slice = function(start, end){
    return this.buffer.slice(start, end);
}

CircularBuffer.prototype.datasize = function(){
    if (this.end >= this.start){
        return Buffer();
    }
    else{
        return this.length - this.start + this.end;
    }
}

CircularBuffer.prototype.datasize = function(){
    if (this.end >= this.start){
        return this.end - this.start;
    }
    else{
        return this.length - this.start + this.end;
    }
}

var _fillBuffer = function(self, data){
    var offset = data.copy(self.buffer, self.end);
    if (offset < data.length){
        self.end = data.copy(self.buffer, 0, offset, data.length);
    }
    else{
        self.end += offset;
        if (self.end == self.length){
            self.end = 0;
        }
    }
}

var writeBuffer = function(self, buffer){
    var dsize = self.datasize();
    if (dsize + buffer.length < self.length){
        _fillBuffer(self, buffer);
        return 0;
    }
    else{
        var acceptable_length = self.length - dsize - 1;
        _fillBuffer(self, buffer.slice(0, acceptable_length));
        return buffer.length-acceptable_length
    }
}
