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
try {
    var Canvas = require('canvas'),
        Image = Canvas.Image;
}catch(err){
    console.log('ATTENTION : Canvas indisponible');
}
// config file test
var configFile = './config.json',
    configFileDefault = './config-default.json';
if (!fs.existsSync(configFile)) {
    fs.copy(configFileDefault,configFile,function(){
        process.exit(1);
    });
    console.log('config.json copied from default. Please restart app');
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
        iEx = /([lr]?)(\d)/.exec(n),
        side = iEx[1],
        g = parseInt(iEx[2]),
        opacity = Math.round(100-g*11.1111),
        iOffset = side == 'r' ? -9 : 10,
        i = Math.abs(g+iOffset);
    console.log(side,i,iOffset,opacity);

    var imgReady = 0,
        imgSrcBase = './uploads/',
        imgSrcSuffix = '/'+n+'.jpg',
        canvasA = new Canvas(), ctxA = canvasA.getContext('2d'), imgA = new Image(), imgSrcA = imgSrcBase + A + imgSrcSuffix,
        canvasB = new Canvas(), ctxB = canvasB.getContext('2d'), imgB = new Image(), imgSrcB = imgSrcBase + B + imgSrcSuffix;

    function LoadImage(img,imgSrc,canvas,ctx){
        fs.readFile(imgSrc, function(err, squid){
            if (err) throw err;
            img = new Image;
            img.src = squid;
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, img.width, img.height);
            imgReady ++;
            if(imgReady ==2){
                Blend();
            }
        });
    }

    function Blend(){
        var fromCtx,fromCanvas,toCtx,toCanvas;
        if(side == 'l'){
            fromCtx = ctxA;
            fromCanvas = canvasA;
            toCtx = ctxB;
            toCanvas = canvasB;
        }else{
            fromCtx = ctxB;
            fromCanvas = canvasB;
            toCtx = ctxA;
            toCanvas = canvasA;
        }
        console.log(opacity);
        toCtx.globalAlpha = opacity/100;
        toCtx.globalCompositeOperation = 'darker';
        toCtx.drawImage(fromCanvas,0,0);
        res.type("jpg");
        var stream = toCanvas.jpegStream({bufsize: 4096, quality: 75, progressive:false});
        stream.pipe(res);

        var fileCachePath = 'mixes/'+A+'-'+B+'-'+n+'.jpg',
            streamFile = toCanvas.jpegStream({bufsize: 4096, quality: 75, progressive:false}),
            cache = fs.createWriteStream(fileCachePath);

        streamFile.on('data', function(chunk){
            cache.write(chunk);
        });

        streamFile.on('end', function(){
            console.log('saved '+fileCachePath);
        });
    }

    LoadImage(imgA,imgSrcA,canvasA,ctxA);
    LoadImage(imgB,imgSrcB,canvasB,ctxB);

    //res.status(500).end('In progress');
}
app.use('/mixes',express.static('mixes'));
app.use('/mixes/:A-:B-:n.jpg',MixImages);

// Demo
function Demo(req, res, next) {
    console.log('Demo. '+req.originalUrl);
    var imgBaseUrl = 'img/demo/',
        A = req.params.a,
        B = req.params.b;
    if(A && B){
        imgBaseUrl = 'mixes/'+A+'-'+B+'-';
    }
    res.render('demo', _(config).extend({imgBaseUrl:imgBaseUrl, layout: 'main',title:config.name, scripts:["demo.js"], bodyClasses:['demo']}));
}
app.get('/demo', Demo);
app.get('/demo-mix-:a-:b', Demo);

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