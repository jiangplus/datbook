#!/usr/bin/env node

const util = require('util')
var subcommand = require('subcommand')
var Dat = require('dat-node')
var createDat = util.promisify(Dat)


const express = require('express')
const http = require('http')

process.title = 'datbook'

var commands = [
  {
    name: 'create',
    command: async function (args) {
      var dir = process.cwd()
      console.log('dir: ', dir)

      var dat = await createDat(dir);
      console.log('Datbook created successfully! Link: dat://' + dat.key.toString('hex'))

      dat.importFiles()
      var list = await util.promisify(dat.archive.readdir('/'))
      console.log(list)
    }
  },
  {
    name: 'clone',
    command: function (args) {
      console.log('cloning')
      var dir = process.cwd()
      console.log('dir: ', dir)
      console.log(args._[0])

      Dat(dir, {key: args._[0]}, function (err, dat) {
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
  },
  {
    name: 'sync',
    command: function (args) {
      var dir = process.cwd()
      console.log('dir: ', dir)
      dat.importFiles()
      
      Dat(dir, function (err, dat) {
        if (err) throw err
        dat.joinNetwork()
        console.log('Datbook syncing: dat://' + dat.key.toString('hex'))
        
        dat.archive.readdir('/', {cached: true}, function (err, content) {
          console.log(content) 
        })
      })
    }
  },
  {
    name: 'serve',
    options: [
      {
        name: 'port',
      }
    ],
    command: function (args) {
      var dir = process.cwd()
      console.log('dir: ', dir)
      
      Dat(dir, function (err, dat) {
        if (err) throw err
        dat.joinNetwork()
        console.log('Datbook syncing: dat://' + dat.key.toString('hex'))
      })
       
      const app = express();

      function shadowfiles (req, res, next) {
        var options = {
          root: __dirname + '/../public/',
          dotfiles: 'deny',
        };

        var fileName = (req.path === '/' || req.path === '/index.html')  ? 'index.html' : req.params.name;
        res.sendFile(fileName, options, function (err) {
          if (err) {
            next(err);
          }
        });
      }

      app.get('/', shadowfiles)
      app.get('/~/:name', shadowfiles);

      var options = {
        dotfiles: 'ignore',
        etag: false,
        extensions: ['htm', 'html'],
        index: false,
        maxAge: '1d',
        redirect: false,
      }

      app.use(express.static(process.cwd(), options))

      http.createServer(app).listen(3300);
      console.log('Listening on http://localhost:3300');
    }
  },
  {
    name: 'diff',
    command: function (args) {
      console.log('call foo', args)
    }
  },
  {
    name: 'commit',
    command: function (args) {
      console.log('call foo', args)
    }
  },
  {
    name: 'checkout',
    command: function (args) {
      console.log('call foo', args)
    }
  },
  {
    name: 'status',
    command: function (args) {
      console.log('call foo', args)
    }
  },
  {
    name: 'help',
    command: usage
  }
]

var config = {
  root: {
    command: usage
  },
  commands: commands
}

var match = subcommand(config)
var result = match(process.argv.slice(2))


function usage (opts, help, usage) {
  if (opts.version) {
    var pkg = require('../package.json')
    console.error(pkg.version)
    process.exit(1)
  }
  var msg = `
Usage: dat <cmd> [<dir>] [options]

Sharing Files:
   datbook create                  create empty dat and dat.json

Downloading Files:
   datbook clone <link> [<dir>]    download a dat via link to <dir>
   datbook pull                    update dat & exit
   datbook sync                    live sync files with the network
   datbook serve                   serve local files and live sync files with the network

Info:
   datbook diff                    log history for a dat
   datbook commit                  log history for a dat
   datbook checkout                log history for a dat
   datbook status                  get key & info about a local dat

Dat public registries:
   datbook register                register new account
   datbook login                   login to your account
   datbook publish                 publish a dat
   datbook whoami                  print active login information
   datbook logout                  logout from active login

Help:
   datbook help                    print this usage guide
   datbook --version, -v           print the dat version

  `
  console.error(msg)
  if (usage) {
    console.error('General Options:')
    console.error(usage)
  }
  console.error('Have fun using Dat! Learn more at docs.datproject.org')
  process.exit(1)
}
