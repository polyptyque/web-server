const express = require('express');
const _ = require('underscore');
const { initializeConnection } = require('../db');
const { cacheMiddleware } = require('../cache');
const { config, _1MONTH_, baseScripts } = require('../config');

const router = express.Router();

// ── Mailing preview ────────────────────────────────────────────────────────────
router.use('/mailing', function (req, res) {
    res.render(
        'mails/confirmation-html.handlebars',
        _.defaults(
            {
                layout: 'mail',
                brandBeige: '#fff0c3',
                brandRed: '#e53428',
                brandGrey: '#646464',
                subject: 'test subject'
            },
            config
        )
    );
});

// ── List all shots ─────────────────────────────────────────────────────────────
router.get('/list-all', function ListAllShots(req, res, next) {
    const connection = initializeConnection();
    connection.query("SELECT * FROM `shot` WHERE `enabled` = 1", function (err, results) {
        if (err) {
            connection.end();
            return res.status(500).send('MySQLError:' + err.toString());
        }
        res.render(
            'list-all',
            _.defaults(
                {
                    results,
                    scripts: _.union(baseScripts, ['/js/list-all.js']),
                    bodyClasses: ['list-all']
                },
                config
            )
        );
        connection.end();
    });
});

// ── Demo ───────────────────────────────────────────────────────────────────────
function Demo(req, res) {
    console.log('Demo. ' + req.originalUrl);
    let imgBaseUrl = 'img/demo/';
    const A = req.params.a;
    const B = req.params.b;
    if (A && B) imgBaseUrl = '/mixes/' + A + '/' + B + '/';

    res.render(
        'demo',
        _.defaults(
            {
                imgBaseUrl,
                scripts: _.union(baseScripts, ['/js/demo.js']),
                bodyClasses: ['demo'],
                shortUrl: false
            },
            config
        )
    );
}
router.get('/demo', Demo);
router.get('/demo-mix/:a/:b', Demo);

// ── Preview ────────────────────────────────────────────────────────────────────
function Preview(req, res) {
    console.log('Preview. ' + req.originalUrl);
    const uid = req.params.uid;
    res.render(
        'preview',
        _.defaults(
            {
                uid,
                scripts: _.union(baseScripts, ['/js/preview.js']),
                bodyClasses: ['demo']
            },
            config
        )
    );
}
router.get('/preview', cacheMiddleware(_1MONTH_), Preview);
router.get('/preview-:uid', cacheMiddleware(_1MONTH_), Preview);

// ── Home ───────────────────────────────────────────────────────────────────────
function Home(req, res) {
    console.log('Home.');
    res.render(
        'home',
        _.defaults(
            {
                title: 'Polyptyque : Photographies interactives à 180°',
                description:
                    "Polyptyque : Projet de recherche par Bertrand Sandrez et Arthur Violy. " +
                    "Experience de portraits photographiques à 180°, visibles sur iPhone. " +
                    "design interactif, raspberry Pi camera.",
                bodyClasses: ['home', 'centered-layout', 'header-absolute']
            },
            config
        )
    );
}
router.get('/', cacheMiddleware(_1MONTH_), Home);
router.post('/', Home);

// ── À propos / Legals ──────────────────────────────────────────────────────────
router.use(
    '/a-propos',
    cacheMiddleware(_1MONTH_),
    function Legals(req, res) {
        console.log('Legals.');
        res.render('about', _.defaults({ bodyClasses: ['about', 'home', 'centered-layout'] }, config));
    }
);

// ── Polypoto ───────────────────────────────────────────────────────────────────
router.use(
    '/polypoto',
    cacheMiddleware(_1MONTH_),
    function Polypoto(req, res) {
        console.log('Polypoto.');
        res.render(
            'polypoto',
            _.defaults(
                {
                    title: "Polypoto — vivez l'expérience avec Polyptyque.",
                    description:
                        "Experience de portraits photographiques à 180°, visibles sur smartphone. " +
                        "soutenu par F93 à Montreuil, aux Instants chavirés",
                    socialImage: 'https://polyptyque.photo/img/polypoto/social-card.png',
                    bodyClasses: ['polypoto', 'centered-layout']
                },
                config
            )
        );
    }
);

// ── Shorten UID ────────────────────────────────────────────────────────────────
// path-to-regexp v8 (Express 5) ne supporte plus les regex inline.
// On extrait le handler dans une fonction et on monte deux routes explicites.
function shortenUidHandler(req, res, next) {
    const shortenUid = req.params.shortenUid;
    const useJsonResponse = req.headers['content-type'] === 'application/json';

    let sql = "SELECT * FROM `shot` ";
    if (shortenUid !== 'latest') {
        sql += " WHERE `enabled` = 1 AND `uid` REGEXP '^.*" + shortenUid + "$' ";
    }
    sql += "ORDER BY date DESC LIMIT 1";
    console.log(shortenUid, sql);

    const connection = initializeConnection();
    connection.query(sql, function (err, results) {
        if (err) {
            connection.end();
            console.log(err);
            return res.status(500).send(err);
        }
        const A = results[0];
        if (!A) {
            connection.end();
            return next();
        }

        const Aid = A.shot_id;
        const q2 =
            "SELECT value FROM `relation` WHERE `shot0` = " + Aid +
            " OR `shot1` = " + Aid + " ORDER by value DESC LIMIT 1;";
        console.log(A);
        console.log(q2);

        connection.query(q2, function (err, results) {
            if (err) {
                connection.end();
                console.log(err);
                return res.status(500).send(err);
            }
            const max = results[0].value;
            const q3 =
                "SELECT * FROM `relation` WHERE `value` = " + max +
                " AND (`shot0` = " + Aid + " OR `shot1` = " + Aid + ")";
            console.log(q3);

            connection.query(q3, function (err, results) {
                if (err) {
                    connection.end();
                    console.log(err);
                    return res.status(500).send(err);
                }
                const relation = results[0];
                const shot_idB = Aid == relation.shot0 ? relation.shot1 : relation.shot0;
                const q4 = "SELECT * FROM `shot` WHERE `shot_id` = " + shot_idB + " LIMIT 1";
                console.log(q4);

                connection.query(q4, function (err, results) {
                    if (err) {
                        connection.end();
                        console.log(err);
                        return res.status(500).send(err);
                    }
                    connection.end();
                    const B = results[0];
                    const imgBaseUrl = '/mixes/' + A.uid + '/' + B.uid + '/';

                    if (useJsonResponse) {
                        res.json({ A, B, imgBaseUrl });
                    } else {
                        res.render(
                            'demo',
                            _.defaults(
                                {
                                    imgBaseUrl,
                                    scripts: _.union(baseScripts, ['/js/demo.js']),
                                    bodyClasses: ['demo'],
                                    shortUrl: shortenUid
                                },
                                config
                            )
                        );
                    }
                });
            });
        });
    });
}

// Route /latest
router.use('/latest', function (req, res, next) {
    req.params.shortenUid = 'latest';
    return shortenUidHandler(req, res, next);
});

// Route /:shortenUid — on filtre manuellement les UIDs valides (6 chars hex)
router.use('/:shortenUid', function (req, res, next) {
    if (!/^[abcdef0-9]{6}$/.test(req.params.shortenUid)) return next();
    return shortenUidHandler(req, res, next);
});

module.exports = router;

