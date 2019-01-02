const Ajv = require( 'ajv' )
const fs = require( 'fs' )
const homedir = require( 'os' ).homedir()
const path = require( 'path' )
const schema = require( './config-schema.json' )

let _config

function parse( args ) {
	if ( ! fs.existsSync( args.config ) ) {
		throw new Error( `Invalid config: File doesn't exists.` )
	}
	try {
		_config = JSON.parse( fs.readFileSync( args.config, 'utf8' ) )
	} catch ( e ) {
		throw new Error( `Invalid config: ${ e.message }` )
	}

	// Validate config against its schema.
	const ajv = new Ajv()
	const valid = ajv
		.addSchema( schema, 'config' )
		.validate( 'config', _config )
	if ( ! valid ) {
		throw new Error( `Invalid config: ${ ajv.errorsText() }.` )
	}

	// Validate user.
	const user = args.user.trim()
	const definedUsers = _config.users || []
	if ( user && ! Object.keys( definedUsers ).includes( user ) ) {
		throw new Error( `User "${ user }" is not defined in ${ args.config }.` )
	}

	// Validate flows.
	const flows = args._.map( s => s.trim() ).filter( Boolean )
	const definedFlows = _config.flows
	let prevState = _config.initialState
	flows.forEach( flow => {
		if ( typeof definedFlows[ flow ] === 'undefined' ) {
			throw new Error( `Flow "${ flow }" is not defined in ${ args.config }.` )
		}

		const requireUser = definedFlows[ flow ].requireUser || false
		if ( requireUser && ! user ) {
			throw new Error( `Flow "${ flow }" requires --user to be passed.` )
		}
		if ( typeof requireUser === 'string' && requireUser !== user ) {
			throw new Error( `Flow "${ flow }" requires --user="${ requireUser }"` )
		}

		const inputState = definedFlows[ flow ].inputState
		if ( ! prevState.match( inputState ) ) {
			throw new Error( `Flow "${ flow }" requires passed state "${ prevState }" matches inputState "${ inputState }"` )
		}
		prevState = definedFlows[ flow ].outputState
	} )

	// Merge sanitized args into config.
	_config.file = args.config
	_config.user = user
	_config.flowsToRun = flows
	_config.puppeteer = {
		timeout: args.timeout,
		headless: args.headless,
		defaultViewport: args.viewport,
		ignoreHTTPSErrors: true,
	}

	return _config
}

module.exports = {
	parse,
}
