const { create: exphbs } = require('express-handlebars');

function setupHandlebars(app) {
    const hbs = exphbs({
        helpers: {
            ifvalue: function (conditional, options) {
                if (options.hash.value === conditional) {
                    return options.fn(this);
                } else {
                    return options.inverse(this);
                }
            },
            ifexists: function (conditional, options) {
                console.log(conditional);
                if (options.hash.value) {
                    return options.fn(this);
                }
            }
        }
    });

    app.engine('handlebars', hbs.engine);
    app.set('view engine', 'handlebars');
    app.enable('view cache');
}

module.exports = { setupHandlebars };

