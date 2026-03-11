const mcache = require('memory-cache');

const CACHE_MAX_ENTRIES = parseInt(process.env.CACHE_MAX_ENTRIES || '200', 10);
const CACHE_MAX_BODY_BYTES = parseInt(process.env.CACHE_MAX_BODY_BYTES || '262144', 10);
const IMAGE_TASK_LIMIT = parseInt(process.env.IMAGE_TASK_LIMIT || '2', 10);

const cacheKeys = [];
let runningImageTasks = 0;
const pendingImageTasks = [];

function safeBodySize(body) {
    if (typeof body === 'string') return Buffer.byteLength(body, 'utf8');
    if (Buffer.isBuffer(body)) return body.length;
    return 0;
}

function enqueueCacheKey(key) {
    cacheKeys.push(key);
    if (cacheKeys.length > CACHE_MAX_ENTRIES) {
        const oldest = cacheKeys.shift();
        if (oldest) mcache.del(oldest);
    }
}

function acquireImageSlot(runTask) {
    if (runningImageTasks < IMAGE_TASK_LIMIT) {
        runningImageTasks++;
        return runTask(releaseImageSlot);
    }
    pendingImageTasks.push(runTask);
}

function releaseImageSlot() {
    runningImageTasks = Math.max(0, runningImageTasks - 1);
    const nextTask = pendingImageTasks.shift();
    if (nextTask) {
        runningImageTasks++;
        nextTask(releaseImageSlot);
    }
}

function cacheMiddleware(duration) {
    return function (req, res, next) {
        if (req.method.toLowerCase() === 'get') {
            if (/^\/preview-[^/]+$/.test(req.path)) return next();
            const key = '__express__' + (req.originalUrl || req.url);
            const cachedBody = mcache.get(key);
            if (cachedBody) {
                res.send(cachedBody);
            } else {
                res.sendResponse = res.send;
                res.send = function (body) {
                    const contentType = (res.get('Content-Type') || '').toLowerCase();
                    const bodySize = safeBodySize(body);
                    if (
                        res.statusCode === 200 &&
                        contentType.indexOf('text/html') !== -1 &&
                        bodySize > 0 &&
                        bodySize <= CACHE_MAX_BODY_BYTES
                    ) {
                        mcache.put(key, body, duration * 1000);
                        enqueueCacheKey(key);
                    }
                    res.sendResponse(body);
                };
                next();
            }
        } else {
            next();
        }
    };
}

module.exports = { cacheMiddleware, acquireImageSlot };

