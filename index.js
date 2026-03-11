/**
 * Point d'entrée — bootstrap minimal.
 * Toute la logique métier est dans src/.
 */
const fs = require('fs.extra');
const express = require('express');
const minifyHTML = require('express-minify-html-2');

// Initialisation des répertoires nécessaires au démarrage
['./uploads', './cache', './cache/webp', './mixes', './mixes/thumbs'].forEach(function (dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

const { PORT } = require('./src/config');
const { setupHandlebars } = require('./src/middleware/handlebars');

const app = express();

// ── Middlewares globaux ────────────────────────────────────────────────────────
// Express 5 embarque body-parser nativement
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(minifyHTML({
    override: true,
    exceptionUrls: [],
    htmlMinifier: {
        removeComments: true,
        collapseWhitespace: true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes: true,
        removeEmptyAttributes: true,
        minifyJS: true
    }
}));

setupHandlebars(app);

// ── Fichiers mixes (statique avant les routes dynamiques) ─────────────────────
app.use('/mixes', express.static('mixes'));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/upload', require('./src/routes/upload'));
app.use('/mixes',  require('./src/routes/images'));
app.use('/',       require('./src/routes/pages'));
app.use('/',       require('./src/routes/static'));

// ── Démarrage ─────────────────────────────────────────────────────────────────
app.listen(PORT, function () {
    console.log('Server listening on: http://localhost:%s', PORT);
});
