// Lazy loading : canvas chargé uniquement à la première requête image
// canvas v3 : Image supprimé → loadImage(path) retourne une Promise
const express = require('express');
const fs = require('fs.extra');
const { PassThrough } = require('stream');
const { getCanvas } = require('../canvas');
const { acquireImageSlot } = require('../cache');

const router = express.Router();

const uploadDir = './uploads/';

// ── ThumbsPreview ──────────────────────────────────────────────────────────────
function ThumbsPreview(req, res, next) {
    const { createCanvas, loadImage } = getCanvas();
    if (!createCanvas || !loadImage) return next();

    acquireImageSlot(function (releaseSlot) {
        let released = false;
        let canvas = null;

        function cleanup() {
            if (released) return;
            released = true;
            if (canvas) { canvas.width = 0; canvas.height = 0; }
            releaseSlot();
        }

        res.once('close', cleanup);
        res.once('finish', cleanup);
        res.once('error', cleanup);

        const uid = req.params.uid;
        const thumbsScale = 0.1;
        const thumbsTotal = 19;

        async function run() {
            canvas = createCanvas(1, 1);
            const ctx = canvas.getContext('2d');

            for (let i = 0; i < thumbsTotal; i++) {
                const imgSrc = uploadDir + uid + '/' + i + '.jpg';
                console.log('AddImage', imgSrc);

                // canvas v3 : loadImage() charge directement depuis le chemin
                const img = await loadImage(imgSrc);

                if (i === 0) {
                    const thumbWidth = Math.round(img.width * thumbsScale);
                    const thumbHeight = Math.round(img.height * thumbsScale);
                    canvas.width = thumbWidth * thumbsTotal;
                    canvas.height = thumbHeight;
                    console.log('canvas size', thumbWidth, thumbHeight, canvas.width, canvas.height);
                }

                const thumbWidth = Math.round(img.width * thumbsScale);
                const thumbHeight = Math.round(img.height * thumbsScale);
                ctx.drawImage(img, i * thumbWidth, 0, thumbWidth, thumbHeight);
            }

            res.type('jpg');
            const fileCachePath = './mixes/thumbs/preview-' + uid + '.jpg';
            const cache = fs.createWriteStream(fileCachePath);
            const stream = canvas.createJPEGStream({ quality: 0.75 });
            const tee = new PassThrough();

            stream.on('error', cleanup);
            cache.on('error', cleanup);
            stream.pipe(tee);
            tee.pipe(res);
            tee.pipe(cache);
            cache.on('finish', function () { console.log('saved ' + fileCachePath); });
        }

        run().catch(function (err) {
            console.error('ThumbsPreview error:', err.message);
            cleanup();
            next();
        });
    });
}

// ── MixImages ──────────────────────────────────────────────────────────────────
function MixImages(req, res, next) {
    const { createCanvas, loadImage } = getCanvas();
    if (!createCanvas || !loadImage) return next();

    acquireImageSlot(function (releaseSlot) {
        let released = false;
        let canvasA = null;
        let canvasB = null;

        function cleanup() {
            if (released) return;
            released = true;
            if (canvasA) { canvasA.width = 0; canvasA.height = 0; }
            if (canvasB) { canvasB.width = 0; canvasB.height = 0; }
            releaseSlot();
        }

        res.once('close', cleanup);
        res.once('finish', cleanup);
        res.once('error', cleanup);

        const A = req.params.A;
        const B = req.params.B;
        const n = req.params.n;
        const i = parseInt(n);
        const side = i < 9;
        const g = Math.abs(i - 9);
        const opacity = Math.round(100 - g * 11.1111);
        console.log(i, side, opacity);

        const imgSrcA = './uploads/' + A + '/' + n + '.jpg';
        const imgSrcB = './uploads/' + B + '/' + n + '.jpg';

        async function run() {
            // canvas v3 : loadImage() en parallèle — plus besoin de fs.readFile
            const [imgA, imgB] = await Promise.all([
                loadImage(imgSrcA),
                loadImage(imgSrcB)
            ]);

            canvasA = createCanvas(imgA.width, imgA.height);
            const ctxA = canvasA.getContext('2d');
            ctxA.drawImage(imgA, 0, 0);

            canvasB = createCanvas(imgB.width, imgB.height);
            const ctxB = canvasB.getContext('2d');
            ctxB.drawImage(imgB, 0, 0);

            let fromCanvas, toCtx, toCanvas;
            if (side) {
                fromCanvas = canvasA; toCtx = ctxB; toCanvas = canvasB;
            } else {
                fromCanvas = canvasB; toCtx = ctxA; toCanvas = canvasA;
            }

            toCtx.globalAlpha = opacity / 100;
            toCtx.globalCompositeOperation = 'darker';
            toCtx.drawImage(fromCanvas, 0, 0);

            const fileCachePathA = 'mixes/' + A;
            const fileCachePathB = fileCachePathA + '/' + B;
            if (!fs.existsSync(fileCachePathA)) fs.mkdirSync(fileCachePathA);
            if (!fs.existsSync(fileCachePathB)) fs.mkdirSync(fileCachePathB);

            res.type('jpg');
            const fileCachePath = fileCachePathB + '/' + n + '.jpg';
            const cache = fs.createWriteStream(fileCachePath);
            const stream = toCanvas.createJPEGStream({ quality: 0.75 });
            const tee = new PassThrough();

            stream.on('error', cleanup);
            cache.on('error', cleanup);
            stream.pipe(tee);
            tee.pipe(res);
            tee.pipe(cache);
            cache.on('finish', function () { console.log('saved ' + fileCachePath); });
        }

        run().catch(function (err) {
            console.error('MixImages error:', err.message);
            cleanup();
            next();
        });
    });
}

router.use('/thumbs/preview-:uid.jpg', ThumbsPreview);
router.use('/:A/:B/:n.jpg', MixImages);

module.exports = router;

