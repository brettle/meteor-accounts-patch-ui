"use strict";

Package.describe({
  name: 'brettle:accounts-patch-ui',
  version: '0.1.13',
  // Brief, one-line summary of the package.
  summary: 'Monkey patches accounts UI packages to support logged in users ' +
    'who have not signed up.',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/brettle/meteor-accounts-patch-ui.git',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0.4');
  api.use('underscore', 'client');
  api.use('accounts-base', 'client');
  api.use('templating', 'client');
  api.use('tracker', 'client');
  api.use('accounts-ui-unstyled', 'client', { weak: true });
  api.use('ian:accounts-ui-bootstrap-3@1.0.0 || 0.1.0', 'client', 
    { weak: true });

  // Allows other packages/apps to help determine whether a user has signed up.
  api.use('brettle:accounts-login-state@0.0.3');
  api.use('brettle:accounts-add-service@1.0.0', { weak: true });

  // Whatever UI variation is being used, it needs to load first so that
  // we can monkey patch it's atNav and atForm templates.
  // Tested:
  api.use('useraccounts:bootstrap@1.12.0', 'client', { weak: true });
  // Untested but probably work:
  api.use('useraccounts:foundation@1.12.0', 'client', { weak: true });
  api.use('useraccounts:ionic@1.12.0', 'client', { weak: true });
  api.use('useraccounts:materialize@1.12.0', 'client', { weak: true });
  api.use('useraccounts:polymer@1.12.0', 'client', { weak: true });
  api.use('useraccounts:ratchet@1.12.0', 'client', { weak: true });
  api.use('useraccounts:semantic-ui@1.12.0', 'client', { weak: true });
  api.use('useraccounts:unstyled@1.12.0', 'client', { weak: true });

  // Use specific versions of the following packages because we rely on or
  // monkey patch their internals. Those internals could change even in a patch
  // release. So as new releases of these packages are published, we need to
  // re-test this package with the new release, and add the supported version
  // below.

  // We monkey patch the _helpers and _eventMaps Template properties blaze
  // manages.
  api.use('blaze@=2.1.5 || =2.1.4 || =2.1.3 || =2.1.2 || =2.1.1 || =2.1.0' +
    ' || =2.1.6 || =2.1.7 || =2.1.8 || =2.1.9',
    'client');
  // Among other things, we assume that the hooks in the options object are used
  // directly, not copied.
  api.use('iron:router@=1.0.13 || 1.0.12 || =1.0.11 || =1.0.10 || =1.0.9', 
    'client', { weak: true });
  // Among other things, we use the internal _routesMap and _action properties.
  // Also need the stop() function passed to triggers which was added in 2.5.0.
  api.use('kadira:flow-router' +
    '@=2.12.1 || =2.10.1 || =2.9.0 || =2.8.0 || =2.7.0 || =2.6.2 || =2.5.0', 
    'client', { weak: true });

  // We don't rely on the internals of these packages, but we do rely on
  // Router.routes and FlowRouter.routes which are undocumented, so we
  // should watch them closely.
  api.use('useraccounts:iron-routing@1.12.1', 'client', { weak: true });
  api.use('useraccounts:flow-routing@1.12.0', 'client', { weak: true });

  api.export('AccountsPatchUi');
  api.addFiles('accounts-patch-ui.js', 'client');
  api.addFiles('patch-accounts-ui-unstyled.js', 'client');
  api.addFiles('patch-ian_accounts-ui-bootstrap-3.js', 'client');
  api.addFiles('patch-useraccounts.js', 'client');
});

Package.onTest(function(api) {
  api.versionsFrom('1.0.4');
  api.use('tinytest');
  api.use('templating', 'client');
  api.use('underscore');
  api.use('tracker');
  api.use('accounts-password');
  api.use('test-helpers');
  api.use('random');
  api.use('ejson');
  api.use('twbs:bootstrap');

  // Test the useraccounts routing package identified by the UI environment var
  var ui = process.env.UI;
  
  // Set versions to test against below.
  var blazeVersion = '2.1.8';
  var useraccountsVersion = '1.14.2';
  var ironRouterVersion = '1.0.13';
  var kadiraFlowRouterVersion = '2.12.1';
  if (ui === 'iron-routing') {
    api.use('useraccounts:bootstrap@' + useraccountsVersion);
    api.use('useraccounts:iron-routing@' + useraccountsVersion);
    api.use('iron:router@' + ironRouterVersion);
  } else if (ui === 'flow-routing') {
    api.use('useraccounts:bootstrap@' + useraccountsVersion);
    api.use('useraccounts:flow-routing@' + useraccountsVersion);
    api.use('kadira:flow-router@' + kadiraFlowRouterVersion);
  } else if (ui === 'accounts-ui') {
    api.use('accounts-ui-unstyled');
  }

  api.use('brettle:accounts-anonymous@0.3.1');
  api.use('brettle:accounts-add-service@1.0.0');
  api.use('brettle:accounts-patch-ui');

  // Workaround iron:layout package not depending on tracker as required by
  // Meteor 1.2.
  api.imply('tracker');

  // Workaround iron:middleware-stack package not depending on ejson as required
  // by Meteor 1.2.
  api.use('ejson');
  api.imply('ejson');

  // Workaround kadira:blaze-layout package not depending on jquery as required
  // by Meteor 1.2.
  api.use('jquery');
  api.imply('jquery');

  // Workaround softwarerero:accounts-t9n package not depending on blaze as
  // required by Meteor 1.2.
  api.use('blaze@' + blazeVersion);
  api.imply('blaze@' + blazeVersion);

  api.addFiles('accounts-patch-ui-tests.html', 'client');
  api.addFiles('accounts-patch-ui-tests.js', 'client');
  api.addFiles('accounts-patch-ui-tests-server.js', 'server');
});
