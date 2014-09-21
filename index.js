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
      listelements: [{type: elements.Types.Mixed}]
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

wishlist.prototype.getMyList = function getMyList(req, res, next) {
  var self = getInstance();
  self.getListFromRequest(req, function(err, result) {
    if(result) {
      return res.send(result);
    }
    res.send(200, {});
  });
};

wishlist.prototype.getListFromRequest = function getListFromRequest(req, callback) {
  if(req.cookies && req.cookies.wishlist) {
    // get the wishlist from the database
    var wishlistModel = elements.getModel('wishlist');
    wishlistModel.findById(req.cookies.wishlist, function(err, result) {
      if(err) {
        return callback(err);
      }
      return callback(null, result);
    });
  } else {
    return callback();
  }
};

wishlist.prototype.addItemToWishList = function addItemToWishList(req, res, item, callback) {
  var self = getInstance();
  var wishlistModel = elements.getModel('wishlist');
  var newlist = false;
  var userwishlist;

  var addToWishlistObject = function addToWishlistObject(userwishlist) {
    if(item.type && item.id) {
      if(userwishlist.entries && userwishlist.entries[item.type]) {
        var index = userwishlist.entries[item.type].indexOf(item.id);
        if(index > -1) {
          userwishlist.entries[item.type].splice(index, 1);
        }
        userwishlist.entries[item.type].push(item.id);
      } else {
        if(!_.findWhere(userwishlist.listelements, item)) {
          userwishlist.listelements.push({type: item.type, id: item.id});
        }
      }
      userwishlist.save(function(err, doc) {
        if(err) {
          return callback(err);
        } else {
          if(doc && newlist) {
            res.cookie('wishlist', doc._id);
          }
          return callback(null, doc);
        }
      });
    }
  };

  if(!req.cookies.wishlist) {
    newlist = true;
    userwishlist = new wishlistModel();
    addToWishlistObject(userwishlist);
  } else {
    wishlistModel.findById(req.cookies.wishlist, function(err, result) {
      if(err) {
        return callback(err);
      } else {
        userwishlist = result;
        addToWishlistObject(userwishlist);
      }
    });
  }
};

wishlist.prototype.removeItemFromWishList = function removeItemFromWishList(req, res, item, callback) {
  var self = getInstance();
  var wishlistModel = elements.getModel('wishlist');
  var newlist = false;
  var userwishlist;

  var removeFromWishlistObject = function removeFromWishlistObject(userwishlist) {
    if(item.type && item.id) {
      if(userwishlist.entries && userwishlist.entries[item.type]) {
        var index = userwishlist.entries[item.type].indexOf(item.id);
        if(index > -1) {
          userwishlist.entries[item.type].splice(index, 1);
        }
      } else {
        userwishlist.listelements = _.reject(userwishlist.listelements, function(el) {
          return el.type == item.type && el.id == item.id;
        });
      }
      userwishlist.save(function(err, doc) {
        if(err) {
          return callback(err);
        } else {
          if(doc && newlist) {
            res.cookie('wishlist', doc._id);
          }
          return callback(null, doc);
        }
      });
    }
  };

  if(req.cookies.wishlist) {
    wishlistModel.findById(req.cookies.wishlist, function(err, result) {
      if(err) {
        return callback(err);
      } else {
        userwishlist = result;
        removeFromWishlistObject(userwishlist);
      }
    });
  }
};

wishlist.prototype.addToWishList = function addToWishList(req, res) {
  var self = getInstance();
  var item = {};
  if(req.query.type && req.query.id) {
    item.type = req.query.type;
    item.id = req.query.id;
  }
  self.addItemToWishList(req, res, item, function(err, result) {
    if(err) {
      return res.send(404, err);
    } else {
      return res.send(result);
    }
  });
};

var init = function (m) {
  // store molecuel instance
  molecuel = m;
  return getInstance();
};

module.exports = init;
