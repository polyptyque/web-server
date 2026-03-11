// Lazy loading : nodemailer n'est chargé qu'au premier envoi
let nodemailer = null;
const { config } = require('./config');

function sendMail(to, subject, text, html, callback) {
    if (!nodemailer) nodemailer = require('nodemailer');
    if(!config.smtps) throw new Error('SMTP configuration missing');

    const transporter = nodemailer.createTransport(config.smtps);

    const mailOptions = {
        from: '"Polyptyque" <contact@polyptyque.photo>',
        to,
        subject,
        text,
        html
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: ' + info.response);
        if (callback) callback();
    });
}

module.exports = { sendMail };

