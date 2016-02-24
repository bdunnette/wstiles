'use strict';

angular.module('myApp.home', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/home', {
    templateUrl: 'home/home.html',
    controller: 'homeCtrl'
  });
}])

.controller('homeCtrl', function($scope, $resource) {
  var Slide = $resource('/tiles/', {
        id: '@id'
      }, {
        query: {
          // isArray: true
        }
      }),
      slideList = Slide.query(function() {
        $scope.slides = slideList.slides;
      });
});
