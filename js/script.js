
Modernizr.load([
  {
    load: ['js/libs/underscore-min.js', 'js/libs/bootstrap/bootstrap.min.js']
  },
  {
    load: ['js/state.js', 'js/hsgp.js', 'js/hsgpcanvas.js'],
    complete: function () {
        $(document).ready(function () {
          setup();
        });
    }
  }
]);
