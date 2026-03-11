// Lazy loading : canvas (module natif C++) n'est chargé qu'à la première utilisation
// canvas v3 : Image supprimé → utiliser loadImage(src) qui retourne une Promise
let _createCanvas = null;
let _loadImage = null;
let _loaded = false;

function getCanvas() {
    if (!_loaded) {
        _loaded = true;
        try {
            const canvasModule = require('canvas');
            _createCanvas = canvasModule.createCanvas;
            _loadImage = canvasModule.loadImage;
        } catch (err) {
            console.log('ATTENTION : Canvas indisponible');
        }
    }
    return { createCanvas: _createCanvas, loadImage: _loadImage };
}

module.exports = { getCanvas };

