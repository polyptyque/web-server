#!/usr/bin/env node
/**
 * Gestion des dépendances optionnelles selon le mode serveur
 * POLYPTYQUE_SERVER_MODE=PRESENTATION | FULL (défaut)
 *
 * Usage:
 *   npm install                    (exécuté automatiquement en postinstall)
 *   npm run install:mode           (exécution manuelle)
 *   POLYPTYQUE_SERVER_MODE=PRESENTATION npm install
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const mode = (process.env.POLYPTYQUE_SERVER_MODE || 'FULL').toUpperCase();
const nodeModulesPath = path.join(__dirname, '../node_modules');

// Packages à désinstaller en mode PRESENTATION (read-only)
const presentationPackages = [
    'canvas',           // Génération d'images (canvas ≈ 19 MB disk, 10-15 MB RAM)
    'nodemailer',       // Envoi d'emails après upload
    'webp-middleware'   // Conversion WebP dynamique
];

console.log(`\n🔧 Installing in ${mode} mode...\n`);

if (mode === 'PRESENTATION') {
    console.log('📦 PRESENTATION mode: Désinstallation des packages inutiles...\n');

    presentationPackages.forEach(pkg => {
        const pkgPath = path.join(nodeModulesPath, pkg);
        if (fs.existsSync(pkgPath)) {
            try {
                console.log(`  ➜ npm uninstall ${pkg}`);
                execSync(`npm uninstall --no-save ${pkg}`, {
                    stdio: 'inherit',
                    cwd: path.join(__dirname, '..')
                });
            } catch (err) {
                console.warn(`⚠️  Échec: ${pkg}`);
            }
        }
    });
    console.log('PRESENTATION Mode');
} else if (mode === 'FULL') {
    console.log('FULL Mode');
} else {
    console.error(`Mode inconnu: ${mode}`);
    process.exit(1);
}

console.log('\n');
