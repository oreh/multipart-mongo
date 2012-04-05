var should = require('should');
var CircularBuffer = require('../lib/circular_buffer').CircularBuffer

describe('Circular Buffer', function(){
    describe('#datasize', function(){
        it('should return the size of the buffered data', function(){
            var buff = new CircularBuffer(5);
            buff.end = 3;
            buff.datasize().should.equal(3);
            
            buff.start = 3;
            buff.end = 1;
            buff.datasize().should.equal(3);

            buff.start = 2;
            buff.end = 2;
            buff.datasize().should.equal(0);
        })
    })
    describe('#write buffer', function(){
        it('should append to the buffer if there are enough space', function(){
            var buff = new CircularBuffer(5);
            buff.write(Buffer('012')).should.equal(0);
            buff.buffer.slice(buff.start, buff.end).toString().should.equal('012');
        })
        it('should set END to 0 if the data ends at the last slot', function(){
            var buff = new CircularBuffer(4);
            buff.start = 2;
            buff.end = 3;
            buff.write(Buffer('0')).should.equal(0)
            buff.end.should.equal(0);
        })
        it('should return the number of remaining bytes', function(){
            var buff = new CircularBuffer(4);
            buff.start = 2;
            buff.end = 3;
            buff.write(Buffer('012')).should.equal(1);
        })
        it('should rewind to the beginning of the buffer when the last slot of the buffer is reached', function(){
            var buff = new CircularBuffer(5);
            buff.write(Buffer('abcd'));
            buff.start = 3;
            buff.end = 4;

            buff.write(Buffer('456'));
            buff.buffer.slice(buff.start, buff.length).toString().should.equal('d4');
            buff.buffer.slice(0, buff.end).toString().should.equal('56');
        })
    })
})
