const fs = require('fs.extra');
const path = require('path');

const configFile = './config.json';
const configFileDefault = './config-default.json';

if (!fs.existsSync(configFile)) {
    fs.copy(configFileDefault, configFile, function () {
        process.exit(1);
    });
    console.log('config.json copied from default. Please restart app');
    process.exit(1);
}

const cssEmbeded = fs.readFileSync('./public/css/main.min.css');

const config = require(path.resolve(configFile));

config.title = config.name;
config.layout = 'main';
config.scripts = [];
config.cssEmbeded = cssEmbeded;
config.socialImage = 'https://polyptyque.photo/img/doc/social-card.jpg';
config.bodyClasses = [];
config.smtps = config.smtps || null;

const PORT = config.PORT;
const _24H_ = 60 * 60 * 24;
const _1MONTH_ = _24H_ * 30;

const baseScripts = [
    '/js/jquery-3.2.0.min.js',
    '/js/bootstrap.min.js',
    '/js/underscore-min.js'
];

module.exports = { config, PORT, _24H_, _1MONTH_, baseScripts };

