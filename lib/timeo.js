var co      = require('co');
var cronJob = require('cron').CronJob;
var compose = require('koa-compose');
var assert  = require('assert');
var Emitter = require('events').EventEmitter;
var debug   = require('debug')('timeo:application');

var app     = Application.prototype; 
exports     = module.exports = Application; 

function Application() {
  if (!(this instanceof Application)) return new Application;
  this.env        = process.env.NODE_ENV || 'development';
  this.middleware = [];
}

Object.setPrototypeOf(Application.prototype, Emitter.prototype);

app.use = function(fn){
  if (!this.experimental) {
    assert(fn && 'GeneratorFunction' == fn.constructor.name, 'app.use() requires a generator function');
  }
  debug('use %s', fn._name || fn.name || '-');
  this.middleware.push(fn);
  return this;
};

app.cron = function(fn, cronTime, onFinish, start, timeZone){
  onFinish   = onFinish ? onFinish : false; 
  timeZone   = timeZone ? timeZone : 'America/Los_Angeles';
  var cronFn = function *(next){
    var ctx  = this; 
    new cronJob(cronTime, function() {
      co(function *(){
        yield fn; 
      }).catch(ctx.onerror);
    }, onFinish, start, timeZone);
    next;
  };
  this.middleware.push(cronFn);
  return this;
};

app.start = function(){
  var ctx = this;
  var fn  = co.wrap(compose(ctx.middleware));
  return fn.call(ctx).catch(ctx);
};

app.onerror = function(err){
  assert(err instanceof Error, 'non-error thrown: ' + err);
  var msg = err.stack || err.toString();
  console.error('Timeo Error: ');
  console.error(msg.replace(/^/gm, '  '));
  console.error('----------------');
};



