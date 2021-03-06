#!/usr/bin/env node
'use strict';

const Hapi = require('hapi');
const Hoek = require('hoek');
const Vision = require('vision');
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

var port = process.env.PORT || 8080;

server.connection({
  host: '0.0.0.0',
  port: port
});

const indexHandler = function (request, reply) {
  Glob(tileDir + "/*.wstiles", function(er, files) {
    var shortFiles = files.map(function(val) {
      return val.replace(tileDir + Path.sep, '').replace('.wstiles', '')
    });
    reply.view('index', {
        title: 'WSTiles ' + request.server.version,
        message: 'Hello World!',
        slides: shortFiles
    });
  })
};

const slideHandler = function (request, reply) {
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
            console.log(metadata);
            reply.view('slide', {slide: metadata});
          }
        });
      });
    }
  });
};

server.register(require('vision'), (err) => {

    if (err) {
        throw err;
    }

    server.views({
        engines: { html: require('handlebars') },
        relativeTo: __dirname,
        path: 'templates'
    });

    server.route({ method: 'GET', path: '/slides', handler: indexHandler });
    server.route({ method: 'GET', path: '/slides/{tileFile}', handler: slideHandler });
});

// List .wstiles files, returning array of names (without extension)
server.route({
  method: 'GET',
  path: '/tiles',
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
  path: '/tiles/{tileFile}',
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
  path: '/tiles/{tileFile}.wstiles',
  handler: function(request, reply) {
    reply.file(getTilePath(request.params.tileFile));
  }
});

// Serve a specified image tile from the database
server.route({
  method: 'GET',
  path: '/tiles/{tileFile}/{zoom}/{column}/{row}',
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

server.start(() => {
  console.log('Server running at:', server.info.uri);
});
