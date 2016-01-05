'use strict';

const Hapi = require('hapi');
const Sqlite3 = require('sqlite3').verbose();
const Path = require('path');
const FS = require('fs');

const server = new Hapi.Server();
server.connection({
  port: 3000
});

server.route({
  method: 'GET',
  path: '/',
  handler: function(request, reply) {
    reply('Hello, world!');
  }
});

server.route({
  method: 'GET',
  path: '/{tileFile}',
  handler: function(request, reply) {
    var tileFile = Path.join(__dirname, request.params.tileFile + '.wstiles');
    FS.access(tileFile, FS.R_OK, function(err) {
      if (err) {
        reply('File not found').code(404);
      } else {
        var db = new Sqlite3.Database(Path.join(__dirname, request.params.tileFile + '.wstiles'), Sqlite3.OPEN_READONLY, function(error) {
          var metadata = {};
          db.all("SELECT * FROM metadata", function(err, rows) {
            if (rows) {
              console.log(rows);
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
    var tileFile = Path.join(__dirname, request.params.tileFile + '.wstiles');
    FS.access(tileFile, FS.R_OK, function(err) {
      if (err) {
        reply('File not found').code(404);
      } else {
        var db = new Sqlite3.Database(Path.join(__dirname, request.params.tileFile + '.wstiles'), Sqlite3.OPEN_READONLY, function(error) {
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
