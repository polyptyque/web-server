// Lazy loading : canvas (module natif C++) n'est chargé qu'à la première utilisation
let _createCanvas = null;
let _Image = null;
let _loaded = false;

function getCanvas() {
    if (!_loaded) {
        _loaded = true;
        try {
            const canvasModule = require('canvas');
            _createCanvas = canvasModule.createCanvas;
            _Image = canvasModule.Image;
        } catch (err) {
            console.log('ATTENTION : Canvas indisponible');
        }
    }
    return { createCanvas: _createCanvas, Image: _Image };
}

module.exports = { getCanvas };

