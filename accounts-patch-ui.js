"use strict";
/* globals AccountsPatchUi: true, LoginState */

// Remember the official Meteor versions of the functions we will be
// monkey patching.
var meteorUserIdFunc = Meteor.userId;
var meteorUserFunc = Meteor.user;
var accountsCallLoginMethod = Accounts.callLoginMethod;

var addServicePkg = Package['brettle:accounts-add-service'];
var mergeUserErrorReason = addServicePkg && addServicePkg.AccountsAddService &&
  addServicePkg.AccountsAddService._mergeUserErrorReason;

/** Returns a function that will execute `func` with 
 * `Meteor.userId` set to `userIdFunc` and `Meteor.user` set to `userFunc`.
 * @param {Function} userIdFunc - the function to use for `Meteor.userId`.
 * @param {Function} userFunc - the function to use for `Meteor.user`.
 * @param {Function} func - the function to wrap.
 * @returns {Function} - the wrapped function
 */
var wrapWithUserFuncs = function (userIdFunc, userFunc, func) {
  return function ( /*arguments*/ ) {
    var savedUserIdFunc = Meteor.userId;
    var savedUserFunc = Meteor.user;
    Meteor.userId = userIdFunc;
    Meteor.user = userFunc;
    try {
      return func.apply(this, arguments);
    } finally {
      Meteor.userId = savedUserIdFunc;
      Meteor.user = savedUserFunc;
    }
  };
};

// A version of Meteor.userId() that returns null for users who have not signed
// up. NOTE: We use the original Meteor.user and Meteor.userId while in this
// function to avoid infinite recursion.
var signedUpUserIdFunc = wrapWithUserFuncs(meteorUserIdFunc, meteorUserFunc,
  function () {
    var meteorUserId = Meteor.userId();
    if (!meteorUserId) {
      return null;
    }
    var user = Meteor.users.findOne(meteorUserId);
    if (!user) {
      // Meteor.userId() was not null, but the userId wasn't found locally. That
      // only happens before startup has finished and the Meteor.users
      // subscription is not yet ready. So, just act like regular 
      // Meteor.userId() in this case (i.e. assume the user is signed up).
      return meteorUserId;
    }
    if (LoginState.signedUp()) {
      return meteorUserId;
    }
    return null;
  });

// A version of Meteor.user() that returns null for user who have not signed up.
// NOTE: We use the original Meteor.user and Meteor.userId while in this
// function to avoid infinite recursion.
var signedUpUserFunc = wrapWithUserFuncs(meteorUserIdFunc, meteorUserFunc,
  function () {
    if (LoginState.signedUp()) {
      return meteorUserFunc.call(Meteor);
    }
    return null;
  });

var callLoginMethod = function(options) {
  var origCallback = options && options.userCallback;
  if (! origCallback) {
    return accountsCallLoginMethod.apply(this, arguments);
  }
  options = _.clone(options);
  options.userCallback = function (error) {
    if (error && error.error === Accounts.LoginCancelledError.numericError &&
        error.reason === mergeUserErrorReason) {
      return origCallback.call(this);
    } else {
      return origCallback.apply(this, arguments);
    }
  }
  return accountsCallLoginMethod.call(this, options);
}

function AccountsPatchUiConstructor() {}

_.extend(AccountsPatchUiConstructor.prototype, {
  /** Returns a function that will execute the passed function with a version
   * `Meteor.userId()` and `Meteor.user()` that return null for users who have 
   * not signed up.
   * @param {Function} func - the function to wrap.
   * @returns {Function} - the wrapped function
   */
  wrapWithSignedUp: function (func) {
    return wrapWithUserFuncs(signedUpUserIdFunc, signedUpUserFunc, func);
  },

  /** Returns a function that will execute the passed function with a version
   * `Accounts.callLoginMethod()` (which is used by `Meteor.loginWithPassword()`
   * and `Meteor.createUser()`) that calls the user's callback with no arguments
   * (indicating success) if the login method returns the error that 
   * `brettle:accounts-add-service` uses to indicate that the service was 
   * merged into the current user's account.
   * @param {Function} func - the function to wrap.
   * @returns {Function} - the wrapped function
   */
  wrapWithMergedErrorSuppressed: function (func) {
    return function ( /*arguments*/ ) {
      var savedCallLoginMethod = Accounts.callLoginMethod;
      Accounts.callLoginMethod = callLoginMethod;
      try {
        return func.apply(this, arguments);
      } finally {
        Accounts.callLoginMethod = savedCallLoginMethod;
      }
    };
  },
  
  /** Returns a function has been wrapped with both
   * `wrapWithMergedErrorSuppressed()` and `wrapWithSignedUp()`.
   * @param {Function} func - the function to wrap.
   * @returns {Function} - the wrapped function
   */
  wrap: function (func) {
    return this.wrapWithMergedErrorSuppressed(
      this.wrapWithSignedUp(func));
  },

  _signedUpUser: signedUpUserFunc,

  _wrapTemplate: function (template) {
    var self = this;
    if (!template) {
      return;
    }
    self._wrapMethods(template.__helpers);
    if (!_.isArray(template.__eventMaps)) {
      throw new TypeError('__eventMaps not an Array');
    }
    _.each(template.__eventMaps, function (value, index, eventMaps) {
      self._wrapMethods(eventMaps[index]);
    });
  },

  _wrapMethods: function (obj) {
    if (obj === undefined) {
      return;
    }
    if (!_.isObject(obj)) {
      throw new TypeError('Not an object');
    }
    _.each(obj, function (value, key) {
      if (_.isFunction(value)) {
        obj[key] = AccountsPatchUi.wrap(value);
      }
    });
  }
});

AccountsPatchUi = new AccountsPatchUiConstructor();
