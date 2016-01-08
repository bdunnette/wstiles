'use strict';

const Hapi = require('hapi');
const Hoek = require('hoek');
const Sqlite3 = require('sqlite3').verbose();
const Glob = require("glob");
const Path = require('path');
const FS = require('fs');

const server = new Hapi.Server();

// Set directory to search for .wstiles files
const tileDir = 'tiles';

server.connection({
  port: 3000
});

server.register(require('inert'), (err) => {
  if (err) {
    throw err;
  }
});

server.register(require('vision'), (err) => {
  Hoek.assert(!err, err);

  server.views({
    engines: {
      html: require('handlebars')
    },
    relativeTo: __dirname,
    path: 'templates'
  });
});

// 'Public' route for web-accessible files (JQuery, Leaflet)
server.route({
  method: 'GET',
  path: '/public/{param*}',
  handler: {
    directory: {
      path: 'public'
    }
  }
});

server.route({
  method: 'GET',
  path: '/',
  handler: function(request, reply) {
    Glob(tileDir + "/*.wstiles", function(er, files) {
      // files is an array of filenames.
      // If the `nonull` option is set, and nothing
      // was found, then files is ["**/*.js"]
      // er is an error object or null.
      var shortFiles = files.map(function(val) {
        return val.replace(tileDir + Path.sep, '').replace('.wstiles', '')
      });
      reply({
        slides: shortFiles
      });
    })
  }
});

server.route({
  method: 'GET',
  path: '/{tileFile}',
  handler: function(request, reply) {
    var tileFile = Path.join(__dirname, tileDir, request.params.tileFile + '.wstiles');
    FS.access(tileFile, FS.R_OK, function(err) {
      if (err) {
        reply('File not found').code(404);
      } else {
        var db = new Sqlite3.Database(tileFile, Sqlite3.OPEN_READONLY, function(error) {
          db.all("SELECT * FROM metadata", function(err, rows) {
            if (rows) {
              var metadata = {};
              rows.forEach(function(row) {
                metadata[row.name] = row.value
              });
              reply(metadata);
            }
          });
        });
      }
    });
  }
});

server.route({
  method: 'GET',
  path: '/{tileFile}/{zoom}/{column}/{row}',
  handler: function(request, reply) {
    var tileFile = Path.join(__dirname, tileDir, request.params.tileFile + '.wstiles');
    FS.access(tileFile, FS.R_OK, function(err) {
      if (err) {
        reply('File not found').code(404);
      } else {
        var db = new Sqlite3.Database(tileFile, Sqlite3.OPEN_READONLY, function(error) {
          var stmt = db.prepare("SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?");
          stmt.get(request.params.zoom, request.params.column, request.params.row, function(err, row) {
            if (err) {
              reply(err).code(404);
            } else if (row) {
              reply(row.tile_data);
            } else {
              reply('Unknown error. Share and enjoy!').code(404);
            }
          });
        });
      }
    });
  }
});

server.route({
  method: 'GET',
  path: '/view',
  handler: {
    view: {
      template: 'index',
      context: {
        title: 'Available Slides'
      }
    }
  }
});

server.route({
  method: 'GET',
  path: '/view/{tileFile}',
  handler: function(request, reply) {
    reply.view('slide', {
      tileFile: request.params.tileFile
    });
  }
});

server.start(() => {
  console.log('Server running at:', server.info.uri);
});
