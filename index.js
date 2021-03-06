// fs, underscore & util
const fs = require('fs.extra');
const path = require('path');
//const util = require('util');
const _ = require('underscore');
const spawn = require( 'child_process' ).spawn;
const nodemailer = require('nodemailer');

// express js app
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mcache = require('memory-cache');
//const multiparty = require('multiparty');
const sha1 = require('sha1');
//const tar = require('tar');
const mysql = require('mysql');
const webp = require('webp-middleware');
var minifyHTML = require('express-minify-html-2');


const cssEmbeded = fs.readFileSync('./public/css/main.min.css');

//
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

app.use(minifyHTML({
    override:      true,
    exception_url: false,
    htmlMinifier: {
        removeComments:            true,
        collapseWhitespace:        true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes:     true,
        removeEmptyAttributes:     true,
        minifyJS:                  true
    }
}));
//
try {
    var Canvas = require('canvas'),
        Image = Canvas.Image;
}catch(err){
    console.log('ATTENTION : Canvas indisponible');
}
// config file test
const configFile = './config.json',
      configFileDefault = './config-default.json';
//
if (!fs.existsSync(configFile)) {
    fs.copy(configFileDefault,configFile,function(){
        process.exit(1);
    });
    console.log('config.json copied from default. Please restart app');
    return;
}

const _24H_ = 60 * 60 * 24;
const _1MONTH_ = _24H_*30;

var config = require(configFile),
    baseScripts = ['/js/jquery-3.2.0.min.js','/js/bootstrap.min.js','/js/underscore-min.js'];
config.title = config.name;
config.layout = 'main';
config.scripts = [];
config.cssEmbeded = cssEmbeded;
config.socialImage = "https://polyptyque.photo/img/doc/social-card.jpg";
config.bodyClasses = [];

const PORT=config.PORT;

// Upload dir test
var uploadDir = './uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
var cachedDir = './cache/';
var cachedWebPDir = './cache/webp';
if (!fs.existsSync(cachedDir)) {
    fs.mkdirSync(cachedDir);
}
if (!fs.existsSync(cachedWebPDir)) {
    fs.mkdirSync(cachedWebPDir);
}
var thumbsDir = './mixes/thumbs/';
if (!fs.existsSync(thumbsDir)) {
    fs.mkdirSync(thumbsDir);
}

function initializeConnection() {
    var options = {
        host     : config.mysql.host,
        user     : config.mysql.user,
        password : config.mysql.password,
        database : config.mysql.database
    };
    function addDisconnectHandler(connection) {
        connection.on("error", function (error) {
            if (error instanceof Error) {
                if (error.code === "PROTOCOL_CONNECTION_LOST") {
                    console.error(error.stack);
                    console.log("Lost connection. Reconnecting...");

                    initializeConnection(connection.config);
                } else if (error.fatal) {
                    throw error;
                }
            }
        });
    }

    var connection = mysql.createConnection(options);

    // Add handlers.
    addDisconnectHandler(connection);

    connection.connect();
    return connection;
}
//
//

var cache = function(duration) {
    return function(req, res, next){
        //return next();
        //
        if(req.method.toLowerCase() === 'get'){
            var key = '__express__' + req.originalUrl || req.url;
            console.log(key);
            var cachedBody = mcache.get(key);
            if (cachedBody) {
                res.send(cachedBody)
                return
            } else {
                res.sendResponse = res.send
                res.send = function(body) {
                    mcache.put(key, body, duration * 1000);
                    res.sendResponse(body)
                }
                next()
            }
        }else{
            next();
        }
    }
}

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
        },
        ifexists:function (conditional, options) {
            console.log(conditional)
            if (options.hash.value) {
                //console.log('ifvalue YES',conditional,'==',options.hash.value);
                return options.fn(this)
            }
        }
    }
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.enable('view cache');
var scripts = [];

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

            var shortenId = /^[0-9]{6}-[0-9]{6}-([abcdef0-9]{6})$/.exec(uid)[1];

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
                var connection = initializeConnection();

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
                            if(email){
                                var subject = "POLYPOTO : "+firstname+" retrouvez votre portrait !";
                                var message = "Merci "+firstname+". Votre portrait est disponible à cette adresse : \n"+
                                    "http://polyptyque.photo/"+shortenId+ ">";
                                sendMail(email,subject,message,message);
                            }
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
            if (err) return next();
            var img = new Image;
            img.src = squid;

            if(imgReady == 0){
                thumbWidth = Math.round(img.width*thumbsScale),
                thumbHeight = Math.round(img.height*thumbsScale),
                canvasWidth = thumbWidth*thumbsTotal,
                canvasHeight = thumbHeight;
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                console.log('canvas size',thumbWidth,thumbHeight,canvasWidth,canvasHeight);
            }

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

        var fileCachePath = './mixes/thumbs/preview-'+uid+'.jpg',
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

// Mail



function sendMail(to,subject,text,html,callback){
    // create reusable transporter object using the default SMTP transport
    var transporter = nodemailer.createTransport(config.smtps);

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: '"Polyptyque" <contact@polyptyque.photo>', // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        text: text, // plaintext body
        html: html // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            return console.log(error);
        }
        console.log('Message sent: ' + info.response);
        if(callback){
            callback();
        }
    });
}

app.use('/mailing',function(req,res,next){
    res.render('mails/confirmation-html.handlebars',_.defaults({
        layout:'mail',
        brandBeige:'#fff0c3',
        brandRed: '#e53428',
        brandGrey:'#646464',
        subject:'test subject'
    },config))
    /*sendMail('Arthur Violy <arthur@violy.net>','to','text message','<i>html message</i>',function(){
        res.send('message sended');
    });*/
});

// Mix
function MixImages(req, res, next){
    var A = req.params.A,
        B = req.params.B,
        n = req.params.n,
        i = parseInt(n),
        side = i<9,
        g = Math.abs(i-9),
        opacity = Math.round(100-g*11.1111);
        //iOffset = side == 'r' ? -9 : 10,
        //i = Math.abs(g+iOffset);
    console.log(i,side,opacity);

    var imgReady = 0,
        imgSrcBase = './uploads/',
        imgSrcSuffix = '/'+n+'.jpg',
        canvasA = new Canvas(), ctxA = canvasA.getContext('2d'), imgA = new Image(), imgSrcA = imgSrcBase + A + imgSrcSuffix,
        canvasB = new Canvas(), ctxB = canvasB.getContext('2d'), imgB = new Image(), imgSrcB = imgSrcBase + B + imgSrcSuffix;

    function LoadImage(img,imgSrc,canvas,ctx){
        fs.readFile(imgSrc, function(err, squid){
            if (err) {return next();}
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
        var fromCanvas,toCtx,toCanvas;
        if(side){
            fromCanvas = canvasA;
            toCtx = ctxB;
            toCanvas = canvasB;
        }else{
            fromCanvas = canvasB;
            toCtx = ctxA;
            toCanvas = canvasA;
        }
        toCtx.globalAlpha = opacity/100;
        toCtx.globalCompositeOperation = 'darker';
        toCtx.drawImage(fromCanvas,0,0);
        res.type("jpg");
        var stream = toCanvas.jpegStream({bufsize: 4096, quality: 75, progressive:false});
        stream.pipe(res);

        var fileCachePathA = 'mixes/'+A,
            fileCachePathB = fileCachePathA+'/'+B;

        if (!fs.existsSync(fileCachePathA)) {
            fs.mkdirSync(fileCachePathA);
        }
        if (!fs.existsSync(fileCachePathB)) {
            fs.mkdirSync(fileCachePathB);
        }

        var fileCachePath = fileCachePathB+'/'+n+'.jpg',
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

app.use(/\/([abcdef0-9]{6}|latest)$/,function(req,res,next){

    var shortenUid = req.params['0'];

    var useJsonResponse = req.headers['content-type'] == 'application/json';

    var sql = "SELECT * FROM `shot` ";

    if(shortenUid != 'latest'){
        sql += " WHERE `enabled` = 1 AND `uid` REGEXP '^.*"+shortenUid+"$' ";
    }

    sql+="ORDER BY date DESC LIMIT 1";

    console.log(shortenUid,sql);

    var connection = initializeConnection();
    connection.query(sql,function(err, results, fields){
        if(err){
            console.log(err);
            return res.status(500).send(err);
        }
        var A = results[0];
        if(A){
            var Aid = A.shot_id,
                query = "SELECT value FROM `relation` WHERE `shot0` = "+Aid+" OR `shot1` = "+Aid+" ORDER by value DESC LIMIT 1;";
            console.log(A);
            console.log(query);
            connection.query(query, function(err, results, fields){
                if(err){
                    console.log(err);
                    return res.status(500).send(err);
                }
                var max = results[0].value,
                    query = "SELECT * FROM `relation` WHERE `value` = "+max+" AND (`shot0` = "+Aid+" OR `shot1` = "+Aid+")";
                console.log(query);
                connection.query(query, function(err, results, fields){
                    if(err){
                        console.log(err);
                        return res.status(500).send(err);
                    }
                    var relation = results[0],
                        shot_idB = Aid == relation.shot0 ? relation.shot1 : relation.shot0;
                    query = "SELECT * FROM `shot` WHERE `shot_id` = "+shot_idB+" LIMIT 1";
                    console.log(query);
                    connection.query(query, function(err,results,fields){
                        if(err){
                            console.log(err);
                            return res.status(500).send(err);
                        }
                        connection.end();
                        var B = results[0],
                            imgBaseUrl = '/mixes/'+A.uid+'/'+B.uid+'/';
                        if(useJsonResponse){
                            res.json({
                                A:A,
                                B:B,
                                imgBaseUrl:imgBaseUrl
                            })
                        }else{
                            ;
                            res.render('demo', _.defaults({
                                imgBaseUrl:imgBaseUrl,
                                scripts:_.union(baseScripts,'/js/demo.js'),
                                bodyClasses:['demo'],
                                shortUrl:shortenUid},config)
                            );
                        }
                    });
                });
            });
        }else{
            connection.end();
            return next();
        }
    });
    //next();
});

app.use('/mixes',express.static('mixes'));
app.use('/mixes/:A/:B/:n.jpg',MixImages);
app.use('/mixes/thumbs/preview-:uid.jpg',ThumbsPreview);

// List all shots
function ListAllShots(req,res,next){
    var connection = initializeConnection();
    connection.query("SELECT * FROM `shot` WHERE `enabled` = 1", function(err, results){
        if(err) return res.status(500).send("MySQLError:",err.toString());
        res.render('list-all', _.defaults({
            results:results,
            scripts:_.union(baseScripts,'/js/list-all.js'),
            bodyClasses:['list-all']
        },config))
        connection.end();
    });
}
app.get('/list-all', ListAllShots);

// Demo
function Demo(req, res, next) {
    console.log('Demo. '+req.originalUrl);
    var imgBaseUrl = 'img/demo/',
        A = req.params.a,
        B = req.params.b;
    if(A && B){
        imgBaseUrl = '/mixes/'+A+'/'+B+'/';
    }
    res.render('demo', _.defaults({
        imgBaseUrl:imgBaseUrl,
        scripts:_.union(baseScripts,'/js/demo.js'),
        bodyClasses:['demo'],
        shortUrl:false
    },config));
}
app.get('/demo', Demo);
app.get('/demo-mix/:a/:b', Demo);

// Demo
function Preview(req, res, next) {
    console.log('Demo. '+req.originalUrl);
    var imgBaseUrl = 'img/demo/',
        uid = req.params.uid;
    res.render('preview', _.defaults({
        uid:uid,
        scripts:_.union(baseScripts,'/js/preview.js'),
        bodyClasses:['demo']
    },config));
}
app.get('/preview',cache(_1MONTH_), Preview);
app.get('/preview-:uid',cache(_1MONTH_), Preview);


// Home
function Home(req, res, next) {
    console.log('Home.');
    res.render('home', _.defaults({
        title: "Polyptyque : Photographies interactives à 180°",
        description:"Polyptyque : Projet de recherche par Bertrand Sandrez et Arthur Violy. " +
        "Experience de portraits photographiques à 180°, visibles sur iPhone. " +
        "design interactif, raspberry Pi camera.",
        bodyClasses:['home','centered-layout','header-absolute']
    },config));
}
app.get('/', cache(_1MONTH_), Home);
app.post('/', Home);


// About
function Legals(req, res, next) {
    console.log('Legals.');
    res.render('about', _.defaults({bodyClasses:['about','home','centered-layout']},config));
}
app.use('/a-propos',cache(_1MONTH_), Legals);

// Polypoto
function Polypoto(req, res, next) {
    console.log('Polypoto.');
    res.render('polypoto', _.defaults({
        title:"Polypoto — vivez l’expérience avec Polyptyque.",
        description:"Experience de portraits photographiques à 180°, visibles sur smartphone. " +
        "soutenu par F93 à Montreuil, aux Instants chavirés",
        socialImage:"https://polyptyque.photo/img/polypoto/social-card.png",
        bodyClasses:['polypoto','centered-layout'
    ]},config));
}
app.use('/polypoto', cache(_1MONTH_), Polypoto);

// static public
app.use('/uploads',express.static('uploads'));
//
// static public
app.use(webp(__dirname + '/public', {cacheDir:path.join(process.cwd(), 'cache/webp')}));
app.use(express.static('public'));


// 404
app.use(function(req, res, next) {
    res.status(404).render('not-found',_.defaults({title:'404 non trouvé',bodyClasses:['404','centered-layout']},config));
});

// Server
app.listen(PORT, function(){
    console.log("Server listening on: http://localhost:%s", PORT);
});