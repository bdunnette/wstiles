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
    })

  }
});

server.start(() => {
  console.log('Server running at:', server.info.uri);
});
