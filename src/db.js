const mysql = require('mysql2');
const { config } = require('./config');

function initializeConnection() {
    const options = {
        host: config.mysql.host,
        user: config.mysql.user,
        password: config.mysql.password,
        database: config.mysql.database
    };

    function addDisconnectHandler(connection) {
        connection.on('error', function (error) {
            if (error instanceof Error) {
                if (error.code === 'PROTOCOL_CONNECTION_LOST') {
                    console.error(error.stack);
                    console.log('Lost connection. Reconnecting...');
                    initializeConnection();
                } else if (error.fatal) {
                    throw error;
                }
            }
        });
    }

    const connection = mysql.createConnection(options);
    addDisconnectHandler(connection);
    connection.connect();
    return connection;
}

module.exports = { initializeConnection };

