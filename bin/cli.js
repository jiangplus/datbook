#!/usr/bin/env node

const yargs = require('yargs');
const util = require('util')
const express = require('express')
const http = require('http')
const fs = require('fs')
const path = require('path')
const Dat = require('dat-node')

const DatJson = require('dat-json')
const prompt = require('prompt')
const chalk = require('chalk')

function exitInvalidNode () {
  console.error('Node Version:', process.version)
  console.error('Unfortunately, we only support Node >= v8. Please upgrade to use Dat.')
  console.error('You can find the latest version at https://nodejs.org/')
  process.exit(1)
}

// Check node version to make sure we support
let NODE_VERSION_SUPPORTED = 8
let nodeMajorVer = process.version.match(/^v([0-9]+)\./)[1]
let invalidNode = nodeMajorVer < NODE_VERSION_SUPPORTED
if (invalidNode) exitInvalidNode()

process.title = 'datbook'
const dir = process.cwd()

let argv = yargs
  .usage('usage: datbook <command> <key>')
  .command(
    'create',
    '',
    () => {},
    async function (argv) {
      Dat(dir, {errorIfExists: true}, function (err, dat) {
        if (err && err.name === 'ExistsError') return console.error('\nArchive already exists.\nYou can use `dat sync` to update.')
        if (err) throw err


        var datjson = DatJson(dat.archive, { file: path.join(dir, 'dat.json') })
        fs.readFile(path.join(dir, 'dat.json'), 'utf-8', function (err, data) {
          if (err || !data) return doPrompt()
          data = JSON.parse(data)
          debug('read existing dat.json data', data)
          doPrompt(data)
        })

        function doPrompt (data) {
          if (!data) data = {}

          var schema = {
            properties: {
              title: {
                description: chalk.magenta('Title'),
                default: data.title || '',
                // pattern: /^[a-zA-Z\s\-]+$/,
                // message: 'Name must be only letters, spaces, or dashes',
                required: false
              },
              description: {
                description: chalk.magenta('Description'),
                default: data.description || ''
              }
            }
          }

          prompt.override = { title: '', description: '' }
          prompt.message = ''
          prompt.start()
          prompt.get(schema, writeDatJson)

          function writeDatJson (err, results) {
            if (err) return exitErr(err) // prompt error
            if (!results.title && !results.description) return done()
            datjson.create(results, done)
          }
        }

        function done () {
          console.log('Datbook created successfully! Link: dat://' + dat.key.toString('hex'))
        
          dat.importFiles()
          dat.archive.readdir('/', function (err, list) {
            if (err) throw err
            console.log('files:')
            console.log(list)
          })
        }

      })
    }
  )
  .command(
    'clone <key>',
    '',
    () => {},
    async function (argv) {
      Dat(dir, {key: argv.key}, function (err, dat) {
        if (err) throw err

        console.log(dat.key)
        dat.joinNetwork(function (err) {
          if (err) throw err
      
          if (!dat.network.connected || !dat.network.connecting) {
            console.error('No users currently online for that key.')
            process.exit(1)
          }
        })
      })
    }
  )
  .command(
    'sync',
    '',
    () => {},
    async function (argv) {
      Dat(dir, function (err, dat) {
        if (err) throw err
        dat.joinNetwork()
        console.log('Datbook syncing: dat://' + dat.key.toString('hex'))
        
        dat.archive.readdir('/', {cached: true}, function (err, content) {
          console.log(content) 
        })
      })
    }
  )
  .command(
    'serve',
    '',
    function (yargs) {
      return yargs.option('p', {
        alias: 'port',
        describe: 'http server binding port'
      })
    },
    async function (argv) {
      Dat(dir, function (err, dat) {
        if (err) throw err
        dat.joinNetwork()
        console.log('Datbook syncing: dat://' + dat.key.toString('hex'))
      })
       
      const app = express();

      function shadowfiles (req, res, next) {
        let options = {
          root: __dirname + '/../public/',
          dotfiles: 'deny',
        };

        let fileName = (req.path === '/' || req.path === '/index.html')  ? 'index.html' : req.params.name;
        res.sendFile(fileName, options, function (err) {
          if (err) {
            next(err);
          }
        });
      }

      app.get('/', shadowfiles)
      app.get('/~/:name', shadowfiles);

      let options = {
        dotfiles: 'ignore',
        etag: false,
        extensions: ['htm', 'html'],
        index: false,
        maxAge: '1d',
        redirect: false,
      }

      app.use(express.static(process.cwd(), options))

      let port = argv.port || 3300
      http.createServer(app).listen(port);
      console.log('Listening on http://localhost:'+3300);
    }
  )
  .command(
    'diff', 
    '', 
    () => {}, 
    (argv) => {
      yargs.showHelp();
    }
  )
  .command(
    'commit', 
    '', 
    () => {}, 
    (argv) => {
      yargs.showHelp();
    }
  )
  .command(
    'checkout', 
    '', 
    () => {}, 
    (argv) => {
      yargs.showHelp();
    }
  )
  .command(
    'status', 
    '', 
    () => {}, 
    (argv) => {
      yargs.showHelp();
    }
  )
  .command(
    '*', 
    '', 
    () => {}, 
    (argv) => {
      yargs.showHelp();
    }
  )
  .help()
  .argv

