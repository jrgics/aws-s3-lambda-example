// Steps to get to running full w/env
// [X] 1.) Serve local content w/ remote API
// [X] 2.) Change API in local script to support environments (local/aws)
// [X] 3.) Serve local API (mock it out)
// [X] 4.) Get cypress to run against multiple environments
// [X] 5.) Get postman to run against multiple environments
// [X] 6.) Get cypress to run cli against local serve envrionment w/ startup & shutdown
// [X] 7.) Get postman to run cli against local serve environment w/ startup & shutdown
// [ ] 8.) Integrate tests into package scripts
// [ ] 9.) Incorporate into build/ci/cd

// TODO: npm target to run test server (and reload on change)

let chalk = require('chalk');
let express = require('express');
let app = express();

exports.runServer = function runServer(onServerStarted) {

    app.get('/shutdown', (request, response) => {
        response.json({message: 'ok'});
        stopServer();
    });

    app.get('/api/:name', (request, response, next) => {

        // Delegate to the lambda with the matching "name"
        //
        // Create an 'event' for the lambda to consume
        let event = {
            queryStringParameters: request.query
        };

        // Load the actual API instance
        let lambda = require(`../../app/lambda/${request.params.name}/index`).handler;

        // Invoke the lambda
        lambda(event)
        .then(lambdaResponse => {
            /// Process the results
            Object.keys(lambdaResponse.headers).forEach(key => {
                response.setHeader(key, lambdaResponse.headers[key]);
            });
            response.status(lambdaResponse.statusCode);
            response.json(JSON.parse(lambdaResponse.body));

            return next();
        });

    });

    // Serve static content
    app.use(express.static('app/html'));

    function stopServer() {
        console.info(chalk.blue('shutting down'));
        server.close(error => {
            if (!!error) {
                console.error(chalk.red('server close error'));
                console.error(chalk.red(error));
            } else {
                console.info(chalk.blue('server terminated'));
            }
        });
    }

    let server = app.listen(3000, null, () => {
        console.info(chalk.blue('starting server'));

        onServerStarted()
        .then(() => {
            console.log(chalk.green('server tests finished'));
        })
        .catch(error => {
            console.error(chalk.red('error during server test:', error));
        })
        .then(stopServer);

        console.info(chalk.blue('running test server on port 3000'));
    });

}
