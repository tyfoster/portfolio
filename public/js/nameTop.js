$(window).scroll (
  {
    previousTop: 0
  },

function () {
var currentTop = $(window).scrollTop();
if (currentTop <= this.previousTop) {
  $(".name-top").css("opacity", "1");
  } else {
  $(".name-top").css("opacity", "0");

  }
  this.previousTop = currentTop;

});
