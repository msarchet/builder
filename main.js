'use strict';

var argv = require('minimist')(process.argv.slice(2));
var chokidar = require('chokidar');
var fs = require('fs');
var colors = require('colors');
var path = require('path');
var jade = require('jade');
var sass = require('node-sass');
var babel = require('babel-core');
var lr = require('livereload');

var isErrored;

var checkError = (arg, message) => {
  if(!arg) {
    console.log(message);
    isErrored = true;
  }
}

checkError(argv.c, 'no css path provided'.error);
checkError(argv.t, 'no template path provided'.error);
checkError(argv.d, 'no destination path provided'.error);

if(isErrored) {
  return;
}

var makeWatcher = (glob, transformer) => {
  var watcher = chokidar.watch(glob, {
    persistent: true
  });
  watcher.on('add', transformer);
  watcher.on('change', transformer);
  watcher.on('unlink', removeFile);
}

var writeOutput = (outputPath, result) => {
  fs.writeFile(outputPath, result, 'utf8', (err) => {
    if(err) {
      console.log(colors.red('unable to write %s'), outputPath);
      return;
    }
  }); 
}

var replaceExtension = (filePath, extension) => {
  var currentExtension = path.extname(filePath);
  return filePath.replace(currentExtension, extension);
}

var getPath = filePath => path.join(argv.d, filePath);

var removeFile = filePath => {
  fs.unlink(getPath(filePath), (err) => {
    console.log(colors.red('Unable to delete destination file %s'), filePath);
  });
}

var runJade = filePath => { 
  // render the jade and overwrite the target file
  var outputPath = replaceExtension(getPath(filePath), '.html');
  console.log(colors.green('Rendering Jade Template %s to %s'), filePath, outputPath);
  var result = jade.renderFile(filePath, {pretty: true});
  writeOutput(outputPath, result);
}

var runSass = filePath => {
  var outputPath = replaceExtension(getPath(filePath), '.css');
  console.log(colors.green('Rendering sass file %s to %s'), filePath, outputPath);
  sass.render({
    file: filePath
  }, (err, result) => {
    if(err) {
      console.log(colors.red('Unable to process scss file %s'), filePath);
      return;
    }
    writeOutput(outputPath, result.css);
  });
};

var runBabel = filePath => {
  var outputPath = replaceExtension(getPath(filePath), '.js');
  console.log(colors.green('Transforming file %s via Babel %s'), filePath, outputPath);
  babel.transformFile(filePath, {presets: ["es2015"]}, (err, transformed) => {
    if(err) {
      console.log(colors.red('Error transforming file %s via babel %s'), filePath, err.message);
      return;
    }
    writeOutput(outputPath, transformed.code);
  });
}

makeWatcher(argv.t, runJade);
makeWatcher(argv.c, runSass);
makeWatcher(argv.j, runBabel);

var server = lr.createServer();
var watchPath = path.join(argv.d);
console.log(colors.green('Watching for LR changes at %s') ,watchPath);
server.watch(watchPath);

