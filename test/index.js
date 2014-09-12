/**
 * Created by dob on 14.04.14.
 */
var assert = require('assert'),
  wishlist = require('../'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter,
  should = require('should'),
  express = require('express'),
  request = require('request'),
  cookieParser = require('cookie-parser'),
  session = require('express-session'),
  mlcl_database = require('mlcl_database'),
  mlcl_elastic = require('mlcl_elastic'),
  mlcl_url = require('mlcl_url'),
  mlcl_elements = require('mlcl_elements');

describe('wishlist', function(){
  //var mytestobject;
  var mlcl;
  var molecuel;
  var mongo;
  var elastic;
  var searchcon;
  var dbcon;
  //var testmodel;
  var elements;
  var wl;
  var app;
  var testpage1;
  var murl;

  before(function (done) {

    mlcl = function() {
      return this;
    };
    util.inherits(mlcl, EventEmitter);
    molecuel = new mlcl();

    molecuel.config = { };
    molecuel.config.search = {
      hosts: ['http://localhost:9200'],
      prefix: 'mlcl-wishlist-unit'
    };

    molecuel.config.url = {};
    molecuel.config.url.pattern = {};

    molecuel.config.database = {
      type: 'mongodb',
      uri: 'mongodb://localhost/mlcl-wishlist-unit'
    };
    molecuel.config.wishlist = {
      types: [
        'page'
      ]
    };
    molecuel.config.elements = {
      schemaDir: __dirname + '/definitions'
    };
    mongo = mlcl_database(molecuel);
    elastic = mlcl_elastic(molecuel);
    murl = mlcl_url(molecuel);
    done();
  });

  describe('wishlist', function () {
    it('should be a function', function () {
      assert('function' === typeof wishlist);
    });
  });

  describe('molecuel wishlist', function() {

    before(function(done){
      wl = new wishlist(molecuel);
      done();
    });

    it('should initialize db connection', function(done) {
      molecuel.once('mlcl::database::connection:success', function(database) {
        dbcon = database;
        database.should.be.a.object;
        done();
      });
      molecuel.emit('mlcl::core::init:post', molecuel);
    });

    it('should initialize search connection', function(done) {
      molecuel.once('mlcl::search::connection:success', function(search) {
        searchcon = search;
        search.should.be.a.object;
        done();
      });
      molecuel.emit('mlcl::core::init:post', molecuel);
    });

    it('should construct elements module', function(done) {
      molecuel.once('mlcl::elements::init:pre', function(module) {
        module.should.be.a.object;
        done();
      });
      elements = new mlcl_elements(molecuel);
    });

    it('should finalize elements registrations', function(done) {
      molecuel.once('mlcl::elements::init:post', function(module) {
        module.should.be.a.object;
        done();
      });
      molecuel.emit('mlcl::database::connection:success', dbcon);
      molecuel.emit('mlcl::search::connection:success', searchcon);
    });

    it('should have registered wishlist model', function(done) {
      assert('function' === typeof elements.modelRegistry['wishlist']);
      done();
    });

    it('should create a testpage', function(done) {
      var pagemodel = elements.modelRegistry['page'];
      testpage1 = new pagemodel();
      testpage1.title = 'test';
      testpage1.save(function(err) {
        should.not.exists(err);
        done();
      });
    });
  });

  describe('molecuel wishlist api', function() {
    var jar;
    before(function(done){
      jar = request.jar();
      app = express();
      app.use(cookieParser());
      app.use(session({secret: '1234567890QWERTY', resave: true, saveUninitialized: true}));
      done();
    });

    it('should initialize the middleware', function(done) {
      app.get('/api/wishlist/mylist', wl.getMyList);
      app.get('/api/wishlist/addtolist', wl.addToWishList);
      done();
    });

    it('should listen in a port', function(done) {
      app.listen(8000);
      done();
    });

    it('should return data', function(done) {
      request({url: 'http://localhost:8000/api/wishlist/mylist', jar: jar}, function (error, response, body) {
        should.exists(body);
        done();
      });
    });

    it('should add a wishlist element', function(done) {
      var url = 'http://localhost:8000/api/wishlist/addtolist?id='+ testpage1._id + '&type=page';
      request({url: url, jar: jar}, function (error, response, body) {
        assert(response.statusCode === 200);
        should.exists(body);
        done();
      });
    });

    it('should return data', function(done) {
      request({url: 'http://localhost:8000/api/wishlist/mylist', jar: jar}, function (error, response, body) {
        assert(response.statusCode === 200);
        should.exists(body);
        done();
      });
    });

  });

  after(function(done) {
    elements.database.database.connection.db.dropDatabase(function() {
      searchcon.deleteIndex('*', function() {
        done();
      });
    });
  });
});
