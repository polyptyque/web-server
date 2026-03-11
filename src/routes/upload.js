const express = require('express');
const fs = require('fs.extra');
const sha1 = require('sha1');
const spawn = require('child_process').spawn;
const { initializeConnection } = require('../db');
const { sendMail } = require('../mail');
const { config } = require('../config');

const router = express.Router();

const uploadDir = './uploads/';

const response_fields_mapping = {
    res1: 'temper',
    res2: 'quality',
    res3: 'hobby',
    res4: 'prefer',
    res5: 'job',
    res6: 'money',
    res7: 'lenaintillemon',
    res8: 'narvalo'
};

router.post('/', function postImage(req, res) {
    try {
        console.log('postImage');

        const { uid, signature, form_responses } = { ...req.body };
        const { firstname, lastname, email } = { ...form_responses };
        const dirPath = uploadDir + uid;
        const archivePath = dirPath + '.tar.gz';

        try {
            if (!uid || !signature || !form_responses || !firstname || !lastname)
                throw new Error('missing fields');
            var responses = Object.fromEntries(
                Object.entries(response_fields_mapping).map(function ([key, val]) {
                    return [key, form_responses[val] || 'none'];
                })
            );
        } catch (err) {
            return res.status(500).send(
                'erreur dans les champs du formulaire: \n' + err.toString() + '\n\n' + JSON.stringify(req.body)
            );
        }

        const shortenId = /^[0-9]{6}-[0-9]{6}-([abcdef0-9]{6})$/.exec(uid)[1];

        if (signature !== sha1(config.private_key + uid))
            return res.status(500).send('signature invalide');

        if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);

        console.log('start extract', archivePath, uploadDir);
        const extractTarGz = spawn('tar', ['-xzvf', archivePath, '-C', uploadDir]);

        extractTarGz.stdout.on('data', function (data) {
            console.log('stdout: ', data.toString());
        });
        extractTarGz.stderr.on('data', function (data) {
            console.log('stderr: ', data.toString());
        });

        extractTarGz.on('close', function (code) {
            console.log('extract complete', code);
            if (parseInt(code) !== 0) return res.status(500).send('extract failure');

            const connection = initializeConnection();

            const query =
                "INSERT INTO `shot` " +
                "(`shot_id`, `uid`, `date`, " +
                "`user_firstname`, `user_lastname`, `user_email`, `enabled`, " +
                "`res1`, `res2`, `res3`, `res4`, `res5`, `res6`, `res7`, `res8`) " +
                "VALUES (NULL, '" + uid + "', CURRENT_TIMESTAMP, " +
                "'" + firstname + "', '" + lastname + "', '" + email + "', TRUE, " +
                "'" + responses.res1 + "', " +
                "'" + responses.res2 + "', " +
                "'" + responses.res3 + "', " +
                "'" + responses.res4 + "', " +
                "'" + responses.res5 + "', " +
                "'" + responses.res6 + "', " +
                "'" + responses.res7 + "', " +
                "'" + responses.res8 + "')";

            function MysqlError(err) {
                connection.end();
                res.status(500).send('Mysql error: ' + err.toString());
            }

            connection.query(query, function (err, results) {
                if (err) return MysqlError(err);

                const { insertId } = results;
                const q2 = "SELECT * FROM `shot` WHERE `shot_id` != " + insertId + " AND `enabled` = 1";

                connection.query(q2, function (err, results) {
                    if (err) return MysqlError(err);

                    let q3 = "INSERT INTO `relation` (`id`, `shot0`, `shot1`, `value`) VALUES ";
                    const values = [];
                    results.forEach(function (shot) {
                        let score = 0;
                        for (let r = 1; r <= 8; r++) {
                            score += shot['res' + r] == responses['res' + r] ? 1 : 0;
                        }
                        values.push(" (NULL, '" + insertId + "', '" + shot.shot_id + "', '" + score + "')");
                    });
                    q3 += values.join(',') + ';';

                    connection.query(q3, function (err, results) {
                        if (err) return MysqlError(err);
                        res.json(results);
                        connection.end();
                        if (email) {
                            const subject = 'POLYPOTO : ' + firstname + ' retrouvez votre portrait !';
                            const message =
                                'Merci ' + firstname + '. Votre portrait est disponible à cette adresse : \n' +
                                'https://polyptyque.photo/' + shortenId + '>';
                            sendMail(email, subject, message, message);
                        }
                    });
                });
            });
        });
    } catch (err) {
        res.status(500).send('server error: ' + err.toString());
    }
});

module.exports = router;

