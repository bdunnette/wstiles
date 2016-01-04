#!/usr/bin/env node

var fs = require('fs'),
  path = require('path'),
  program = require('commander'),
  read = require('fs-readdir-recursive'),
  sqlite3 = require('sqlite3').verbose();

program.parse(process.argv);

// Still need to add code to run vips & generate tiles, along the lines of:
// vips dzsave $s $i.zip --overlap 0 --layout google --centre

// May also be useful to get image dimensions - shell code example:
// width=`vips im_header_int Xsize $s`
// height=`vips im_header_int Ysize $s`

program.args.forEach(function(imgDir) {
  var dir = path.parse(imgDir);
  var db = new sqlite3.Database(dir.name + '.wstiles');
  db.run("DROP TABLE metadata", function(error) {
    console.error(error);
    db.run("CREATE TABLE metadata (name text, value text)", function(error) {
      console.error(error);
      db.run("INSERT INTO metadata VALUES (?, ?)", ['name', dir.name]);
      db.run("INSERT INTO metadata VALUES (?, ?)", ['minzoom', 0]);
      db.run("INSERT INTO metadata VALUES (?, ?)", ['maxzoom', 8]);
      db.run("INSERT INTO metadata VALUES (?, ?)", ['format', 'jpg']);
    });
  });
  
  db.run("DROP TABLE tiles", function(error) {
    console.error(error);
    db.run("CREATE TABLE tiles (zoom_level integer, tile_column integer, tile_row integer, tile_data blob)", function() {
      var tiles = read(path.normalize(imgDir));
      var stmt = db.prepare("INSERT INTO tiles VALUES (?, ?, ?, ?)");
      tiles.forEach(function(tileFile) {
        console.log(tileFile);
        var tileFileSplit = tileFile.split(path.sep);
        console.log(tileFileSplit);
        if (tileFileSplit.length > 1) {
          stmt.run(tileFileSplit[0], tileFileSplit[1], tileFileSplit[2].split('.')[0], null);
        }
      })
    });
  });
});
