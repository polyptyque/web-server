// fs, underscore & util
var fs = require('fs.extra');
var util = require('util');
var _ = require('underscore');
var spawn = require( 'child_process' ).spawn;

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
config.title = config.name;
config.layout = 'main';
config.scripts = [];
config.bodyClasses = [];

const PORT=config.PORT;

// Upload dir test
var uploadDir = './uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
var thumbsDir = './mixes/thumbs/';
if (!fs.existsSync(thumbsDir)) {
    fs.mkdirSync(thumbsDir);
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


            console.log("postImage");
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
                return res.status(500).send("erreur dans les champs du formulaire: \n"+err.toString()+"\n\n"+JSON.stringify(req.body));
            }

            if (signature != sha1(config.private_key+uid))
                return res.status(500).send("signature invalide");

            if (!fs.existsSync(dirPath)){
                fs.mkdirSync(dirPath);
            }

            console.log("start extract",archivePath,uploadDir);
            var extractTarGz = spawn( 'tar', [ '-xzvf', archivePath, '-C', uploadDir ])

            extractTarGz.stdout.on( 'data', function(data) {
                 console.log( 'stdout: ',data.toString());
            });

            extractTarGz.stderr.on( 'data', function(data) {
                console.log( 'stderr: ',data.toString());
            });

            extractTarGz.on('close',function(code){
                //res.send('archive extract success');
                //
                // INSERT INTO `shot` (`shot_id`, `uid`, `date`, `user_firstname`, `user_lastname`, `user_email`, `res1`, `res2`, `res3`, `res4`, `res5`, `res6`, `res7`, `res8`) VALUES (NULL, 'test_uid', CURRENT_TIMESTAMP, 'arthur', 'violy', 'arthur@violy.net', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h')
                //
                console.log("extract complete", code);
                if(code != 0) return res.status(500).send("extract failure");
                connection.connect();

                var query = "INSERT INTO `shot` " +
                    "(`shot_id`, `uid`, `date`, " +
                    "`user_firstname`, `user_lastname`, `user_email`, `enabled`, " +
                    "`res1`, `res2`, `res3`, `res4`, `res5`, `res6`, `res7`, `res8`) " +
                    "VALUES (NULL, '"+uid+"', CURRENT_TIMESTAMP, " +
                    "'"+firstname+"', '"+lastname+"', '"+email+"', TRUE, " +
                    "'"+responses.res1+"', " +
                    "'"+responses.res2+"', " +
                    "'"+responses.res3+"', " +
                    "'"+responses.res4+"', " +
                    "'"+responses.res5+"', " +
                    "'"+responses.res6+"', " +
                    "'"+responses.res7+"', " +
                    "'"+responses.res8+"')";

                function MysqlError(err){
                    res.status(500).send("Mysql error: "+err.toString());
                }
                //
                // ajout de la prise de vues
                //
                connection.query(query, function (err, results, fields) {
                    if (err) return MysqlError(err);
                    // selection des prises de vues existantes (non nouvelle)
                    var insertId = results.insertId;
                    query = "SELECT * FROM `shot` WHERE `shot_id` != "+insertId+" AND `enabled` = 1";
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

            });

    }catch(err){
        res.status(500).send('server error: '+err.toString());
    }
}

app.post('/upload',postImage);

// ThumbsPreview
function ThumbsPreview(req,res,next){
    var uid = req.params.uid,
        canvas = new Canvas(),
        imgReady = 0,
        thumbsScale = 0.1,
        thumbsTotal = 19,
        thumbWidth, thumbHeight,
        canvasWidth, canvasHeight,
        ctx = canvas.getContext('2d');

    function AddImage(){
        var imgSrc = uploadDir+uid+'/'+imgReady+'.jpg';
        console.log('AddImage',imgSrc)
        fs.readFile(imgSrc, function(err, squid){
            if (err) throw err;
            if(imgReady == 0){
                thumbWidth = Math.round(img.width*thumbsScale),
                thumbHeight = Math.round(img.height*thumbsScale),
                canvasWidth = thumbWidth*thumbsTotal,
                canvasHeight = thumbHeight*thumbsTotal
            }
            var img = new Image;
            img.src = squid;
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            ctx.drawImage(img, imgReady*thumbWidth, 0, thumbWidth, thumbHeight);
            imgReady ++;
            if(imgReady == 19){
                Finish();
            }else{
                AddImage();
            }
        });
    }

    function Finish(){
        res.type("jpg");
        var stream = canvas.jpegStream({bufsize: 4096, quality: 75, progressive:false});
        stream.pipe(res);

        var fileCachePath = '/mixes/thumbs/preview-'+uid+'.jpg',
            streamFile = canvas.jpegStream({bufsize: 4096, quality: 75, progressive:false}),
            cache = fs.createWriteStream(fileCachePath);

        streamFile.on('data', function(chunk){
            cache.write(chunk);
        });

        streamFile.on('end', function(){
            console.log('saved '+fileCachePath);
        });
    }

    AddImage();

}

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
app.use('/mixes/thumbs/preview-:uid.jpg',ThumbsPreview);

// List all shots
function ListAllShots(req,res,next){
    connection.connect();
    connection.query("SELECT * FROM `shot` WHERE `enabled` = 1", function(err, results){
        if(err) return res.status(500).send("MySQLError:",err.toString());
        res.render('list-all', _(config).extend({results:results, scripts:["list-all.js"], bodyClasses:['list-all']}))
    });
    connection.end();
}
app.get('/list-all', ListAllShots);

// Demo
function Demo(req, res, next) {
    console.log('Demo. '+req.originalUrl);
    var imgBaseUrl = 'img/demo/',
        A = req.params.a,
        B = req.params.b;
    if(A && B){
        imgBaseUrl = 'mixes/'+A+'-'+B+'-';
    }
    res.render('demo', _(config).extend({imgBaseUrl:imgBaseUrl, scripts:["demo.js"], bodyClasses:['demo']}));
}
app.get('/demo', Demo);
app.get('/demo-mix-:a-:b', Demo);

// Demo
function Preview(req, res, next) {
    console.log('Demo. '+req.originalUrl);
    var imgBaseUrl = 'img/demo/',
        uid = req.params.uid;
    res.render('preview', _(config).extend({uid:uid,scripts:["preview.js"], bodyClasses:['demo']}));
}
app.get('/preview', Preview);
app.get('/preview-:uid', Preview);


// Home
function Home(req, res, next) {
    console.log('Home.');
    console.log(req.body);
    res.render('home', _(config).extend({scripts:scripts, bodyClasses:['home']}));
}
app.get('/', Home);
app.post('/', Home);

// static public
app.use('/uploads',express.static('uploads'));
// static public
app.use(express.static('public'));

// 404
app.use(function(req, res, next) {
    res.status(404).render('not-found',_(config).extend({title:'404 non trouvé',bodyClasses:['404']}));
});

// Server
app.listen(PORT, function(){
    console.log("Server listening on: http://localhost:%s", PORT);
});