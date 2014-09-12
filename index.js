var _ = require('underscore');
//var async = require('async');

var molecuel;
var elements;

/**
 * This module serves wishlist database element
 * @constructor
 */


var wishlist = function() {
  var self = this;

  molecuel.once('mlcl::elements::registrations:pre', function(module) {
    elements = module;

    self.wishlistSchema =  {
      name: { type: String, list: true, trim: true},
      creation: { type: Date, 'default': Date.now, form: {readonly: true}},
      entries: {

      },
      listelements: [{type: elements.ObjectId}]
    };

    _.each(molecuel.config.wishlist.types, function(type) {
      self.wishlistSchema.entries[type] = [{type: elements.ObjectId, ref: type}];
    });

    // module == elements module
    var schemaDefinition = {
      schemaName: 'wishlist',
      schema: self.wishlistSchema,
      options: {indexable: true, avoidTranslate: true}
    };

    molecuel.config.url.pattern.wishlist = '/wishlist/{{t _id}}';

    elements.registerSchemaDefinition(schemaDefinition);
  });

  return this;
};

/*************************************************************************
 SINGLETON CLASS DEFINITION
 *************************************************************************/
var instance = null;

/**
 * Singleton getInstance definition
 * @return singleton class
 */
var getInstance = function () {
  if (instance === null) {
    instance = new wishlist();
  }
  return instance;
};

wishlist.prototype.getMyList = function getMyList(req, res) {
  var wishlistModel = elements.getModel('wishlist');

  if(req.cookies && req.cookies.wishlist) {
    // get the wishlist from the database
    wishlistModel.findById(req.cookies.wishlist, function(err, result) {
      res.send(200, result);
    });
  } else {
    res.send(200, {});
  }
};

wishlist.prototype.addToWishList = function addToWishList(req, res) {
  var wishlistModel = elements.getModel('wishlist');
  var userwishlist;
  var newlist = false;

  var addToWishlistObject = function addToWishlistObject(userwishlist) {
    if(req.query.type && req.query.id) {
      userwishlist.save(function(err, doc) {
        if(doc && newlist) {
          res.cookie('wishlist', doc._id);
        }
        doc.listelements.push(req.query.id);
        res.send(userwishlist);
      });
    }
  };

  if(!req.cookies.wishlist) {
    newlist = true;
    userwishlist = new wishlistModel();
    addToWishlistObject(userwishlist);
  } else {
    wishlistModel.findById(req.cookies.wishlist, function(err, result) {
      if(!err) {
        userwishlist = result;
        addToWishlistObject(userwishlist);
      } else {
        res.send(404);
      }
    });
  }
};

var init = function (m) {
  // store molecuel instance
  molecuel = m;
  return getInstance();
};

module.exports = init;
