'use strict';

// Declare app level module which depends on views, and components
angular.module('wsTiles', [
  'ngRoute',
  'ngResource',
  'leaflet-directive',
  'wsTiles.home',
  'wsTiles.slide'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({
    redirectTo: '/home'
  });
}]);
