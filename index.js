var express = require('express');
var app = express();
const Sqlite3 = require('sqlite3').verbose();
const Glob = require("glob");
const Path = require('path');
const FS = require('fs');

app.use(express.static('public'));

// Set directory to search for .wstiles files
const tileDir = 'tiles';

// Method to get file path from short name
// e.g. CMU1SmallRegion -> /home/wstiles/tiles/CMU1SmallRegion.wstiles
var getTilePath = function(tileFile) {
  return Path.join(__dirname, tileDir, tileFile + '.wstiles');
}

// List .wstiles files, returning array of names (without extension)
app.get('/tiles', function(req, res) {
  Glob(tileDir + "/*.wstiles", function(er, files) {
    var shortFiles = files.map(function(val) {
      return val.replace(tileDir + Path.sep, '').replace('.wstiles', '')
    });
    res.json({
      slides: shortFiles
    });
  });
});

// Get metadata from specified file
app.get('/tiles/:tileFile', function(req, res) {
  var tileFile = getTilePath(req.params.tileFile);
  FS.access(tileFile, FS.R_OK, function(err) {
    if (err) {
      res.send('File not found').code(404);
    } else {
      var db = new Sqlite3.Database(tileFile, Sqlite3.OPEN_READONLY, function(error) {
        db.all("SELECT * FROM metadata", function(err, rows) {
          if (rows) {
            var metadata = {};
            rows.forEach(function(row) {
              metadata[row.name] = row.value
            });
            res.json(metadata);
          }
        });
      });
    }
  })
});

// Serve a specified image tile from the database
app.get('/tiles/:tileFile/:zoom/:column/:row', function(req, res) {
  var tileFile = getTilePath(req.params.tileFile);
  FS.access(tileFile, FS.R_OK, function(err) {
    if (err) {
      res.send('File not found').code(404);
    } else {
      var db = new Sqlite3.Database(tileFile, Sqlite3.OPEN_READONLY, function(error) {
        var stmt = db.prepare("SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?");
        stmt.get(req.params.zoom, req.params.column, req.params.row, function(err, row) {
          if (err) {
            console.log(err);
            res.sendStatus(500);
          } else if (row) {
            res.send(row.tile_data);
          } else {
            res.sendStatus(404);
          }
        });
      });
    }
  })
});

app.listen(3000, function() {
  console.log('Example app listening on port 3000!');
});
