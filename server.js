'use strict';

const Hapi = require('hapi');
const Hoek = require('hoek');
const Sqlite3 = require('sqlite3').verbose();
const Glob = require("glob");
const Path = require('path');
const FS = require('fs');

// Set directory to search for .wstiles files
const tileDir = 'tiles';

// Method to get file path from short name
// e.g. CMU1SmallRegion -> /home/wstiles/tiles/CMU1SmallRegion.wstiles
var getTilePath = function(tileFile) {
  return Path.join(__dirname, tileDir, tileFile + '.wstiles');
}

const server = new Hapi.Server();

server.connection({
  port: 3000
});

// Enable serving of static files
server.register(require('inert'), (err) => {
  if (err) {
    throw err;
  }
});

// Set up template rendering
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

// List .wstiles files, returning array of names (without extension)
server.route({
  method: 'GET',
  path: '/',
  handler: function(request, reply) {
    Glob(tileDir + "/*.wstiles", function(er, files) {
      var shortFiles = files.map(function(val) {
        return val.replace(tileDir + Path.sep, '').replace('.wstiles', '')
      });
      reply({
        slides: shortFiles
      });
    })
  }
});

// Get metadata from specified file
server.route({
  method: 'GET',
  path: '/{tileFile}',
  handler: function(request, reply) {
    var tileFile = getTilePath(request.params.tileFile);
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

// Enable downloading of specified .wstiles file
server.route({
  method: 'GET',
  path: '/{tileFile}.wstiles',
  handler: function(request, reply) {
    reply.file(getTilePath(request.params.tileFile));
  }
});

// Serve a specified image tile from the database
server.route({
  method: 'GET',
  path: '/{tileFile}/{zoom}/{column}/{row}',
  handler: function(request, reply) {
    var tileFile = getTilePath(request.params.tileFile);
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

// Index of available files
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

// Leaflet-based slide viewer
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
