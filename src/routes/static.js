const express = require('express');
const path = require('path');
const webp = require('webp-middleware');
const { config } = require('../config');

const router = express.Router();

// Fichiers uploadés
router.use('/uploads', express.static('uploads'));

// WebP middleware + fichiers statiques publics
router.use(webp(path.join(__dirname, '../../public'), { cacheDir: path.join(process.cwd(), 'cache/webp') }));
router.use(express.static('public'));

// 404
router.use(function (req, res) {
    res.status(404).render(
        'not-found',
        { ...config, title: '404 non trouvé', bodyClasses: ['404', 'centered-layout'] }
    );
});

module.exports = router;
