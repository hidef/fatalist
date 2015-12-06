var Express = require('express'),
    app = new Express(),
    bodyParser = require('body-parser'),
    proxy = require('express-http-proxy');

// database
var redis = require("redis"),
    client = redis.createClient();

client.on("error", function (err) {
    console.log("Error " + err);
});

// proxy everything else
app.use('/*', function fatalist(req, res, next)
  {
    console.log('looking up config for: ' + req.headers.host);

    client.get(req.headers.host, function(err, mapping) {
      
      if ( err ) 
      {
        console.log({
          message: 'error retrieving mapping',
          request: req
        });
        return;
      }

      if ( !mapping )
      {
        console.log({
          message: 'invalid mapping',
          request: req,
          data: mapping
        });
        return;
      }

      // var mapping = mappings[req.headers.host];
      var conf = JSON.parse(mapping);
      var failureType = 'failureType' in conf ? conf.failureType : 'end';
      
      if ( 'failureRate' in conf )
      {
        if ( Math.random() < conf.failureRate )
        {
          switch (failureType)
          {
            case 'end': res.end(); return;
            case '404': return next();
          }
        }
      }
      
      var proxyfunc = proxy(conf.host, {  
        forwardPath: function(req, res) {
          console.log(conf.host + req.originalUrl);
          return conf.host + req.originalUrl;
        }
      });
      
      (proxyfunc)(req, res, next);
    });
});

app.listen(process.env.PORT || 80);

module.exports = app;

console.log('fatalist started');