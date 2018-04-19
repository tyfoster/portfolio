var home = "/"
var work = "/#work"
var about = "about"
var writing = "https://medium.com/@tyfoster"
var contact = "/#contact"
var twitter = "https://www.twitter.com/tyfoster"
var email = "mailto:foster.ty@gmail.com"
var metamask = "https://metamask.io/"
var linkedin = "https://www.linkedin.com/in/ty-foster-/"
var ens = "https://www.myetherwallet.com/#ens"
var projectOne ="projectOne.html"
var projectTwo ="MyEtherWallet"
var projectThree ="ModHealth"
var projectFour ="Specialized"
var projectFive ="NHL"
var projectSix ="MagicMirror"


  $(document).ready(function() {
    $('.home').attr('href', home);
    $('.work').attr('href', work);
    $('.about').attr('href', about);
    $('.writing').attr('href', writing);
    $('.contact').attr('href', contact);
    $('#email').attr('href', email);
    $('#twitter').attr('href', twitter);
    $('#linkedin').attr('href', linkedin);
    $('#email').attr('href', email);
    $('#metamask').attr('href', metamask);
    $('#ens').attr('href', ens);

    $('#projectOne').attr('href', projectOne);
    $('#projectTwo').attr('href', projectTwo);
    $('#projectThree').attr('href', projectThree);
    $('#projectFour').attr('href', projectFour);
    $('#projectFive').attr('href', projectFive);
    $('#projectSix').attr('href', projectSix);


    console.log("success");
});
