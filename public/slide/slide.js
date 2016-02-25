'use strict';

angular.module('wsTiles.slide', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/slide/:slideId', {
    templateUrl: 'slide/slide.html',
    controller: 'slideCtrl'
  });
}])

.controller('slideCtrl', ['$routeParams', '$scope', '$resource', '$location', function($routeParams, $scope, $resource, $location) {
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
    console.log(slide);

    $scope.tiles.url = $location.protocol() + '://' + $location.host() + ':' + $location.port() + '/tiles/' + $routeParams.slideId + '/{z}/{x}/{y}';
    $scope.tiles.maxZoom = $scope.slide.maxzoom;
    $scope.contributors = [];
    $scope.contributors.push('Regents of the University of Minnesota');
    $scope.tiles.options.attribution = 'Images &copy; 2016 ' + $scope.contributors.join(' and ');
  });

  // $scope.$on("centerUrlHash", function(event, centerHash) {
  //   console.log(event);
  //     $location.search({ c: centerHash });
  // });
}]);
