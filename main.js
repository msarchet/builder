'use strict';

const argv = require('minimist')(process.argv.slice(2));
const chokidar = require('chokidar');
const fs = require('fs-extra');
const colors = require('colors');
const path = require('path');
const jade = require('jade');
const sass = require('node-sass');
const babel = require('babel-core');
const lr = require('livereload');
const bourbon = require('bourbon');
const neat = require('bourbon-neat');

let isErrored = false;

let checkError = (arg, message) => {
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

let makeWatcher = (glob, transformer) => {
  let watcher = chokidar.watch(glob, {
    persistent: true
  });
  watcher.on('add', transformer);
  watcher.on('change', transformer);
  watcher.on('unlink', removeFile);
}

let writeOutput = (outputPath, result) => {
  fs.outputFile(outputPath, result, 'utf8', (err) => {
    if(err) {
      console.log(colors.red('unable to write %s'), outputPath, err);
      return;
    }
  }); 
}

let replaceExtension = (filePath, extension) => {
  let currentExtension = path.extname(filePath);
  return filePath.replace(currentExtension, extension);
}

let getPath = filePath => path.join(argv.d, filePath);

let removeFile = filePath => {
  fs.unlink(getPath(filePath), (err) => {
    console.log(colors.red('Unable to delete destination file %s'), filePath);
  });
}

let runJade = filePath => { 
  // render the jade and overwrite the target file
  let outputPath = replaceExtension(getPath(filePath), '.html');
  console.log(colors.green('Rendering Jade Template %s to %s'), filePath, outputPath);
  let result = jade.renderFile(filePath, {pretty: true});
  writeOutput(outputPath, result);
}

let runSass = filePath => {
  let outputPath = replaceExtension(getPath(filePath), '.css');
  console.log(colors.green('Rendering sass file %s to %s'), filePath, outputPath);
  sass.render({
    file: filePath,
    includePaths: bourbon.includePaths.concat(neat.includePaths)
  }, (err, result) => {
    if(err) {
      console.log(colors.red('Unable to process scss file %s %s'), filePath, err);
      return;
    }
    writeOutput(outputPath, result.css);
  });
};

let runBabel = filePath => {
  let outputPath = replaceExtension(getPath(filePath), '.js');
  console.log(colors.green('Transforming file %s via Babel %s'), filePath, outputPath);
  babel.transformFile(filePath, {presets: ['es2015', 'react']}, (err, transformed) => {
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

let server = lr.createServer();
let watchPath = path.join(argv.d);
console.log(colors.green('Watching for LR changes at %s') ,watchPath);
server.watch(watchPath);

