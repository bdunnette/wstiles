'use strict';

angular.module('myApp.slide', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/slide/:slideId', {
    templateUrl: 'slide/slide.html',
    controller: 'slideCtrl'
  });
}])

.controller('slideCtrl', function($routeParams, $scope, $resource, $location) {
  $scope.slideId = $routeParams.slideId;
  angular.extend($scope, {
      slideCenter: {
        lat: 0,
        lng: 0,
        zoom: 2
      },
      defaults: {
        maxZoom: 8,
        noWrap: true,
        continuousWorld: false
      },
      tiles: {
        url: '',
        options: {
          continuousWorld: false,
          noWrap: true
        }
      },
      controls: {
        // fullscreen: {
        //   position: 'topleft'
        // }
      }
    });

    var slideInfo = $resource('/tiles/' + $routeParams.slideId);
    var slide = slideInfo.get(function() {
      $scope.slide = slide;

      $scope.tiles.url = $location.protocol() + '://' + $location.host() + ':' + $location.port() + '/tiles/' + $routeParams.slideId + '/{z}/{x}/{y}';

      $scope.contributors = [];
      $scope.contributors.push('Regents of the University of Minnesota');
      $scope.tiles.options.attribution = 'Images &copy; 2016 ' + $scope.contributors.join(' and ');

    });
});
