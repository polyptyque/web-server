// fs, underscore & util
var fs = require('fs.extra');
var util = require('util');
var _ = require('underscore');

// express js app
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multiparty = require('multiparty');
var sha1 = require('sha1');
var targz = require('tar.gz');
var mysql = require('mysql');
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
var connection = mysql.createConnection({
    host     : config.mysql.host,
    user     : config.mysql.user,
    password : config.mysql.password,
    database : config.mysql.database
});
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

var response_fields_mapping = {
    res1:'temper',
    res2:'quality',
    res3:'hobby',
    res4:'prefer',
    res5:'job',
    res6:'money',
    res7:'lenaintillemon',
    res8:'narvalo'
};

function postImage(req, res) {

    try {
        // form;


            //
            // uid
            // form
            // signature sha1(private_key+uid)
            // archive file tar gz
            try {
                var uid = req.body.uid,
                    signature = req.body.signature,
                    form_responses = req.body.form_responses,
                    dirPath = uploadDir+uid,
                    archivePath = dirPath+'.tar.gz',
                    firstname = form_responses.firstname,
                    lastname = form_responses.lastname,
                    email = form_responses.email,
                    responses = _(response_fields_mapping).mapObject(function(val,key){
                        var response = form_responses[val];
                        if(response) return response;
                        return "none";
                    });
            }catch(err){
                return res.status(500).send("erreur dans les champs du formulaire. \n"+err.toString());
            }

            if (signature != sha1(config.private_key+uid))
                return res.status(500).send("signature invalide");

            if (!fs.existsSync(dirPath)){
                fs.mkdirSync(dirPath);
            }

            targz().extract(archivePath,uploadDir).then(function(){
                //res.send('archive extract success');
                //
                // INSERT INTO `shot` (`shot_id`, `uid`, `date`, `user_firstname`, `user_lastname`, `user_email`, `res1`, `res2`, `res3`, `res4`, `res5`, `res6`, `res7`, `res8`) VALUES (NULL, 'test_uid', CURRENT_TIMESTAMP, 'arthur', 'violy', 'arthur@violy.net', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h')
                //
                connection.connect();

                var query = "INSERT INTO `shot` " +
                    "(`shot_id`, `uid`, `date`, " +
                    "`user_firstname`, `user_lastname`, `user_email`, " +
                    "`res1`, `res2`, `res3`, `res4`, `res5`, `res6`, `res7`, `res8`) " +
                    "VALUES (NULL, '"+uid+"', CURRENT_TIMESTAMP, " +
                    "'"+firstname+"', '"+lastname+"', '"+email+"', " +
                    "'"+responses.res1+"', " +
                    "'"+responses.res2+"', " +
                    "'"+responses.res3+"', " +
                    "'"+responses.res4+"', " +
                    "'"+responses.res5+"', " +
                    "'"+responses.res6+"', " +
                    "'"+responses.res7+"', " +
                    "'"+responses.res8+"')";

                function MysqlError(err){
                    connection.end();
                    res.status(500).send("Mysql error: "+err.toString());
                }
                //
                // ajout de la prise de vues
                //
                connection.query(query, function (err, results, fields) {
                    if (err) return MysqlError(err);
                    // selection des prises de vues existantes (non nouvelle)
                    var insertId = results.insertId;
                    query = "SELECT * FROM `shot` WHERE `shot_id` != "+insertId;
                    connection.query(query, function(err, results, fields) {
                        if (err) return MysqlError(err);
                        //
                        // ajout des relations
                        //
                        var query = "INSERT INTO `relation` (`id`, `shot0`, `shot1`, `value`) VALUES ";
                        var values = [];
                        _(results).each(function(shot){
                            var score = 0;
                            for(var r=1; r<=8; r++){
                                score += shot['res'+r] == responses['res'+r] ? 1 : 0;
                            }
                            values.push(" (NULL, '"+insertId+"', '"+shot.shot_id+"', '"+score+"')")
                        });
                        query += values.join(',')+';';
                        connection.query(query, function(err, results, fields) {
                            if (err) return MysqlError(err);
                            res.json(results);
                            connection.end();
                        });

                    });
                    //console.log('The solution is: ', results[0].solution);
                });

            }).catch(function(){
                res.status(500).send('archive extract fail')
            });

    }catch(err){
        res.status(500).send('server error: '+err.toString());
    }
}

app.post('/upload',postImage);

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
    res.status(404).render('not-found',_(config).extend({layout:'main',title:'404 non trouvé',scripts:[],bodyClasses:['404']}));
});

// Server
app.listen(PORT, function(){
    console.log("Server listening on: http://localhost:%s", PORT);
});