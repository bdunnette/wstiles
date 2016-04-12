#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    program = require('commander'),
    read = require('fs-readdir-recursive'),
    sharp = require('sharp'),
    sqlite3 = require('sqlite3').verbose();

program.parse(process.argv);

var tileSize = 256;

// Still need to add code to run vips & generate tiles, along the lines of:
// vips dzsave example.svs example --overlap 0 --layout google --centre

// May also be useful to get image dimensions - shell code example:
// width=`vips im_header_int Xsize $s`
// height=`vips im_header_int Ysize $s`

program.args.forEach(function(wsiFile) {
    console.log(wsiFile);
    sharp(wsiFile)
        .metadata(function(err, metadata) {
            console.log(metadata);
            for (zoomLevel = 0; zoomLevel < 5; zoomLevel++) {
                var scaleFactor = Math.pow(2, zoomLevel);
                console.log(scaleFactor);
                var imgSize = scaleFactor * tileSize;
                console.log(imgSize);
                sharp(wsiFile)
                    .crop()
                    .resize(imgSize, imgSize)
                    .max()
                    .toFile(wsiFile + '_' + zoomLevel + '.jpg', function(err, info) {
                        console.log(err);
                        console.log(info);
                    })
            }
        })
});

// program.args.forEach(function(imgDir) {
//     var dir = path.parse(imgDir);
//     var db = new sqlite3.Database(dir.name + '.wstiles');
//     db.run("PRAGMA synchronous=OFF");
//
//     db.run("DROP TABLE metadata", function(error) {
//         console.error(error);
//         db.run("CREATE TABLE metadata (name text, value text)", function(error) {
//             console.error(error);
//             db.run("create unique index name on metadata (name)");
//             db.run("INSERT INTO metadata VALUES (?, ?)", ['name', dir.name]);
//             db.run("INSERT INTO metadata VALUES (?, ?)", ['minzoom', 0]);
//             db.run("INSERT INTO metadata VALUES (?, ?)", ['maxzoom', 8]);
//             db.run("INSERT INTO metadata VALUES (?, ?)", ['format', 'jpg']);
//         });
//     });
//
//     db.run("DROP TABLE tiles", function(error) {
//         console.error(error);
//         db.run("CREATE TABLE tiles (zoom_level integer, tile_row integer, tile_column integer, tile_data blob)", function() {
//             db.run("create unique index tile_index on tiles (zoom_level, tile_column, tile_row)");
//             // db.run("BEGIN TRANSACTION");
//             var tiles = read(path.normalize(imgDir));
//             var stmt = db.prepare("INSERT INTO tiles VALUES (?, ?, ?, ?)");
//             tiles.forEach(function(tileFile) {
//                     // console.log(tileFile);
//                     var tileData = fs.readFileSync(path.join(imgDir, tileFile));
//                     // console.log(tileData);
//                     var tileFileSplit = tileFile.split(path.sep);
//                     // console.log(tileFileSplit);
//                     if (tileFileSplit.length > 1) {
//                         stmt.run(tileFileSplit[0], tileFileSplit[1], tileFileSplit[2].split('.')[0], tileData);
//                     }
//                 })
//                 // db.run("COMMIT");
//         });
//     });
//
//     db.close();
// });