// Lazy loading : canvas chargé uniquement à la première requête image
const express = require('express');
const fs = require('fs.extra');
const { PassThrough } = require('stream');
const { getCanvas } = require('../canvas');
const { acquireImageSlot } = require('../cache');

const router = express.Router();

const uploadDir = './uploads/';

// ── ThumbsPreview ──────────────────────────────────────────────────────────────
function ThumbsPreview(req, res, next) {
    const { createCanvas, Image } = getCanvas();
    if (!createCanvas || !Image) return next();

    acquireImageSlot(function (releaseSlot) {
        let released = false;
        let canvas = null;

        function cleanup() {
            if (released) return;
            released = true;
            if (canvas) {
                canvas.width = 0;
                canvas.height = 0;
            }
            releaseSlot();
        }

        res.once('close', cleanup);
        res.once('finish', cleanup);
        res.once('error', cleanup);

        const uid = req.params.uid;
        canvas = createCanvas(1, 1);
        const thumbsScale = 0.1;
        const thumbsTotal = 19;
        const ctx = canvas.getContext('2d');
        let imgReady = 0;
        let thumbWidth, thumbHeight, canvasWidth, canvasHeight;

        function AddImage() {
            const imgSrc = uploadDir + uid + '/' + imgReady + '.jpg';
            console.log('AddImage', imgSrc);
            fs.readFile(imgSrc, function (err, squid) {
                if (err) {
                    cleanup();
                    return next();
                }
                const img = new Image();
                img.src = squid;

                if (imgReady === 0) {
                    thumbWidth = Math.round(img.width * thumbsScale);
                    thumbHeight = Math.round(img.height * thumbsScale);
                    canvasWidth = thumbWidth * thumbsTotal;
                    canvasHeight = thumbHeight;
                    canvas.width = canvasWidth;
                    canvas.height = canvasHeight;
                    console.log('canvas size', thumbWidth, thumbHeight, canvasWidth, canvasHeight);
                }

                ctx.drawImage(img, imgReady * thumbWidth, 0, thumbWidth, thumbHeight);
                imgReady++;
                if (imgReady === 19) {
                    Finish();
                } else {
                    AddImage();
                }
            });
        }

        function Finish() {
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

            cache.on('finish', function () {
                console.log('saved ' + fileCachePath);
            });
        }

        AddImage();
    });
}

// ── MixImages ──────────────────────────────────────────────────────────────────
function MixImages(req, res, next) {
    const { createCanvas, Image } = getCanvas();
    if (!createCanvas || !Image) return next();

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

        let imgReady = 0;
        const imgSrcBase = './uploads/';
        const imgSrcSuffix = '/' + n + '.jpg';

        canvasA = createCanvas(1, 1);
        const ctxA = canvasA.getContext('2d');
        const imgSrcA = imgSrcBase + A + imgSrcSuffix;

        canvasB = createCanvas(1, 1);
        const ctxB = canvasB.getContext('2d');
        const imgSrcB = imgSrcBase + B + imgSrcSuffix;

        function LoadImage(imgSrc, canvas, ctx) {
            fs.readFile(imgSrc, function (err, squid) {
                if (err) {
                    cleanup();
                    return next();
                }
                const img = new Image();
                img.src = squid;
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0, img.width, img.height);
                imgReady++;
                if (imgReady === 2) Blend();
            });
        }

        function Blend() {
            let fromCanvas, toCtx, toCanvas;
            if (side) {
                fromCanvas = canvasA;
                toCtx = ctxB;
                toCanvas = canvasB;
            } else {
                fromCanvas = canvasB;
                toCtx = ctxA;
                toCanvas = canvasA;
            }
            toCtx.globalAlpha = opacity / 100;
            toCtx.globalCompositeOperation = 'darker';
            toCtx.drawImage(fromCanvas, 0, 0);
            res.type('jpg');

            const fileCachePathA = 'mixes/' + A;
            const fileCachePathB = fileCachePathA + '/' + B;

            if (!fs.existsSync(fileCachePathA)) fs.mkdirSync(fileCachePathA);
            if (!fs.existsSync(fileCachePathB)) fs.mkdirSync(fileCachePathB);

            const fileCachePath = fileCachePathB + '/' + n + '.jpg';
            const cache = fs.createWriteStream(fileCachePath);
            const stream = toCanvas.createJPEGStream({ quality: 0.75 });
            const tee = new PassThrough();

            stream.on('error', cleanup);
            cache.on('error', cleanup);

            stream.pipe(tee);
            tee.pipe(res);
            tee.pipe(cache);

            cache.on('finish', function () {
                console.log('saved ' + fileCachePath);
            });
        }

        LoadImage(imgSrcA, canvasA, ctxA);
        LoadImage(imgSrcB, canvasB, ctxB);
    });
}

router.use('/thumbs/preview-:uid.jpg', ThumbsPreview);
router.use('/:A/:B/:n.jpg', MixImages);

module.exports = router;

