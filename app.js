// var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var aboutRouter = require('./routes/about');
var p2Router = require('./routes/projectTwo');
var p3Router = require('./routes/projectThree');
var p4Router = require('./routes/projectFour');
var p5Router = require('./routes/projectFive');
var p6Router = require('./routes/projectSix');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use('/jquery-scrollify', express.static(__dirname + '/node_modules/jquery-scrollify/'));

app.use('/', indexRouter);
app.use('/about', aboutRouter);
app.use('/MyEtherWallet', p2Router);
app.use('/ModHealth', p3Router);
app.use('/Specialized', p4Router);
app.use('/NHL', p5Router);
app.use('/MagicMirror', p6Router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');

}).listen(process.env.PORT || 5000);

module.exports = app;
