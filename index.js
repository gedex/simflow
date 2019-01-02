#!/usr/bin/env node

const parseArgs = require( 'minimist' )
const parseConfig = require( './lib/config.js' ).parse
const flow = require( './lib/flow.js' )
const fs = require( 'fs' )
const homedir = require( 'os' ).homedir()
const path = require( 'path' )
const pkg = require( './package.json' )

const defaultValues = {
	timeout: 10000,
	user: '',
}

const usage = `${ pkg.name } ${ pkg.version } by ${ pkg.author }
${ pkg.homepage }

Usage:
   ${ pkg.name } <flows...> [options...]

Options:
  -c, --config    Config file.
  -t, --timeout   Global timeout for wait actions.
                  Default to ${ defaultValues.timeout } (in milliseconds).
  -h, --headless  Run Chrome in headless mode.
      --viewport  Viewport for each page. Example viewport: 800x600.
  -u, --user      User to choose from config file.

  -v, --version   Show version.
  -h, --help      Show usage.
`

const args = parseArgs( process.argv.slice( 2 ), {
	string: [ '_', 'config', 'user', 'viewport' ],
	boolean: [ 'headless', 'version', 'help' ],
	alias: {
		c: 'config',
		t: 'timeout',
		h: 'headless',
		u: 'user',
		v: 'version',
		h: 'help',
	},
	default: defaultValues,
} )

if ( args.version ) {
	console.log( pkg.version )
	process.exit( 0 )
}

if ( ! args._.length || args.help ) {
	console.log( usage )
	process.exit( 0 )
}

let timeout = parseInt( args.timeout, 10 ) || defaultValues.timeout
if ( timeout < 0 ) {
	timeout = defaultValues.timeout
}
args.timeout = timeout

let viewport = ( typeof args.viewport === 'string' && args.viewport.length ) || null
if ( viewport ) {
	let [ width, height ] = args.viewport.split( 'x' )
	width = parseInt( width, 10 )
	height = parseInt( height, 10 )
	viewport = { width, height }
}
args.viewport = viewport

try {
	flow.run( parseConfig( args ) )
} catch ( e ) {
	console.error( `${ e.name }: ${ e.message }` )
}
