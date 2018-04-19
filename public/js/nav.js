$('#toggle').click(function() {
   $(this).toggleClass('active');
   $('#overlay').toggleClass('open');
  });

  $('#overlay').click(function() {
     $('#toggle').toggleClass('active');
     $('#overlay').toggleClass('open');
    });
//   function closeMenu() {
//     $('#overlay').toggleClass('open');
//     $('#toggle').toggleClass('active');
//   }
// $('#toggle').click(closeMenu());
