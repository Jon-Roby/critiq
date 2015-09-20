var app = angular.module('critiq', ['ui.router']);

app.config([
  '$stateProvider',
  '$urlRouterProvider',
  function($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state('home', {
        url: '/home',
        templateUrl: '/home.html',
        controller: 'mainController',
        resolve: {
          postPromise: ['posts', function(posts) {
            return posts.getAll();
          }]
        }
      })

      .state('posts', {
        url: '/posts/{id}',
        templateUrl: '/posts.html',
        controller: 'postsController as posts',
        resolve: {
          post: ['$stateParams', 'posts', function($stateParams, posts) {
            return posts.get($stateParams.id);
          }]
        }
      })

      .state('login', {
        url: '/login',
        templateUrl: '/login.html',
        controller: 'AuthCtrl',
        onEnter: ['$state', 'auth', function($state, auth){
          if(auth.isLoggedIn()){
            $state.go('home');
          }
        }]
      })

      .state('register', {
        url: '/register',
        templateUrl: '/register.html',
        controller: 'AuthCtrl',
        onEnter: ['$state', 'auth', function($state, auth){
          if (auth.isLoggedIn()){
            $state.go('home');
          }
        }]
      });


      $urlRouterProvider.otherwise('home');
  }
]);

app.factory('posts', ['$http', 'auth', function($http, auth) {
  var postsObject = {
    posts: []
  };

  postsObject.getAll = function() {
    return $http.get('/posts').success(function(data) {
      angular.copy(data, postsObject.posts);
    });
  };

  postsObject.get = function(id) {
    return $http.get('/posts/' + id).then(function(res) {
      return res.data;
    });
  };

  postsObject.create = function(post) {
    return $http.post('/posts', post, {
      headers: {Authorization: 'Bearer ' + auth.getToken()}
    }).success(function(data){
      postsObject.posts.push(data);
    });
  };

  postsObject.upvote = function(post) {
    return $http.put('/posts/' + post._id + '/upvote', null, {
      headers: {Authorization: 'Bearer ' + auth.getToken()}
    }).success(function(data){
      post.upvotes += 1;
    });
  };

  postsObject.addComment = function(id, comment) {
    return $http.post('/posts/' + id + '/comments', comment, {
      headers: {Authorization: 'Bearer ' + auth.getToken()}
    });
  };

  postsObject.upvoteComment = function(post, comment) {
    return $http.put('/posts/' + post._id + '/comments/'+ comment._id + '/upvote', null, {
      headers: {Authorization: 'Bearer ' + auth.getToken()}
    }).success(function(data){
      comment.upvotes += 1;
    });
  };
  return postsObject;
}]);

app.factory('auth', ['$http', '$window', function($http, $window) {
  var auth = {};
  auth.saveToken = function(token) {
    $window.localStorage['critiqToken'] = token;
  }

  auth.getToken = function() {
    return $window.localStorage['critiqToken'];
  }

  auth.isLoggedIn = function(){
    var token = auth.getToken();

    if(token){
      var payload = JSON.parse($window.atob(token.split('.')[1]));

      return payload.exp > Date.now() / 1000;
    } else {
      return false;
    }
  };

  auth.currentUser = function() {
    if(auth.isLoggedIn()){
      var token = auth.getToken();
      var payload = JSON.parse($window.atob(token.split('.')[1]));

      return payload.username;
    }
  };

  auth.register = function(user) {
    return $http.post('/register', user).success(function(data){
      auth.saveToken(data.token);
    });
  };

  auth.logIn = function(user){
    return $http.post('/login', user).success(function(data){
      auth.saveToken(data.token);
    });
  };

  auth.logOut = function() {
    $window.localStorage.removeItem('critiqToken');
  };

  return auth;
}])

app.controller('mainController', [
  'posts',

  function(posts) {
    this.test = 'Hello world!';

    var vm = this;
    vm.posts = posts.posts;

    vm.postFormData = {};
    vm.addPost = function() {
      if(!vm.postFormData.title || vm.postFormData.title === '') { return; }
      posts.create({
        link: vm.postFormData.link,
        title: vm.postFormData.title,
        body: vm.postFormData.body,
        author: 'user',
        upvotes: 0
      });
      vm.postFormData.title = '';
      vm.postFormData.link = '';
      vm.postFormData.body = '';
    };

    // I'm not sure what this does
    vm.postFormData = {};

    vm.incrementUpvotes = function(post) {
      posts.upvote(post);
    };
  }
]);

app.controller('postsController', [
  'posts',
  'post',
  function(posts, post) {

    var vm = this;
    vm.post = post;

    vm.commentFormData = {};
    vm.addComment = function() {
      if (!vm.commentFormData.body) { return; }
      posts.addComment(post._id, {
        body: vm.commentFormData.body,
        author: 'user'
      }).success(function(comment) {
        vm.post.comments.push(comment);
      });
      vm.commentFormData.body = '';
    }

    vm.incrementUpvotes = function(comment) {
      posts.upvoteComment(post, comment);
    }
    // I'm not sure what this does
    vm.commentFormData = {};
  }
]);

app.controller('AuthCtrl', [
'$scope',
'$state',
'auth',
function($scope, $state, auth){
  $scope.user = {};

  $scope.register = function(){
    auth.register($scope.user).error(function(error){
      $scope.error = error;
    }).then(function(){
      $state.go('home');
    });
  };

  $scope.logIn = function(){
    auth.logIn($scope.user).error(function(error){
      $scope.error = error;
    }).then(function(){
      $state.go('home');
    });
  };
}]);

app.controller('NavCtrl', [
  '$scope',
  'auth',
  function($scope, auth){
    $scope.isLoggedIn = auth.isLoggedIn;
    $scope.currentUser = auth.currentUser;
    $scope.logOut = auth.logOut;
}]);
