#!/usr/local/bin/node
var fs = require('fs');

var json = fs.readFileSync('./specs.json', 'utf8');
JSON.parse(json);
