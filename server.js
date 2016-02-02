#!/usr/bin/env node
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

var ipaddress = process.env.OPENSHIFT_NODEJS_IP;
var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;

if (typeof ipaddress === "undefined") {
  //  Log errors on OpenShift but continue w/ 127.0.0.1 - this allows us to run/test the app locally.
  console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
  ipaddress = "127.0.0.1";
};

server.connection({
  host: ipaddress,
  port: port
});

// Enable serving of static files
server.register(require('inert'), (err) => {
  if (err) {
    throw err;
  }
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

// 'Public' route for web-accessible files (JQuery, Leaflet)
server.route({
  method: 'GET',
  path: '/{param*}',
  handler: {
    directory: {
      path: 'public'
    }
  }
});

server.start(() => {
  console.log('Server running at:', server.info.uri);
});
