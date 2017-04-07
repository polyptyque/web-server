// fs, underscore & util
var fs = require('fs.extra');
var util = require('util');
var _ = require('underscore');

// express js app
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multiparty = require('multiparty');
//
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
//
var Canvas = require('context-blender');

// config file test
var configFile = './config.json',
    configFileDefault = './config-default.json';
if (!fs.existsSync(configFile)) {
    fs.copy(configFileDefault,configFile,function(){
        process.exit(1);
    });
    console.log('config.json copied from default. Please restart app')
    return;
}

var config = require(configFile);

const PORT=config.PORT;

// Upload dir test
var uploadDir = './uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

//

// express handlerbars template
var exphbs  = require('express-handlebars');
var hbs = exphbs.create({
    helpers:{
        ifvalue:function (conditional, options) {
            if (options.hash.value === conditional) {
                //console.log('ifvalue YES',conditional,'==',options.hash.value);
                return options.fn(this)
            } else {
                //console.log('ifvalue NO',conditional,'==',options.hash.value);
                return options.inverse(this);
            }
        }
    }
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.enable('view cache');
var scripts = ["main.js"];

// Mix
function MixImages(req, res, next){
    var A = req.params.A,
        B = req.params.B,
        n = req.params.n,
        canvasA = new Canvas(),
        canvasB = new Canvas();
    console.log(A,B,n);
    res.status(500).end('In progress');
}
app.get('/mix-:A-:B-:n.jpg',MixImages);

// Demo
function Demo(req, res, next) {
    console.log('Demo. '+req.originalUrl);
    var imgBaseUrl = req.originalUrl == '/demo' ? 'img/demo/':'mix-A-B-';
    res.render('demo', _(config).extend({imgBaseUrl:imgBaseUrl, layout: 'main',title:config.name, scripts:["demo.js"], bodyClasses:['demo']}));
}
app.get('/demo', Demo);
app.get('/demo-mix', Demo);

// Home
function Home(req, res, next) {
    console.log('Home.');
    console.log(req.body);
    res.render('home', _(config).extend({layout: 'main',title:config.name, scripts:scripts, bodyClasses:['home']}));
}
app.get('/', Home);
app.post('/', Home);

// static public
app.use(express.static('public'));

// 404
app.use(function(req, res, next) {
    res.status(404).end('404 not found \n'+req.url);
});

// Server
app.listen(PORT, function(){
    console.log("Server listening on: http://localhost:%s", PORT);
});