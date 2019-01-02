const Ajv = require( 'ajv' )
const fs = require( 'fs' )
const homedir = require( 'os' ).homedir()
const path = require( 'path' )
const schema = require( './config-schema.json' )
const { MissingConfig, InvalidConfig } = require( './errors.js' )

function readConfigFile( filepath ) {
	if ( ! filepath ) {
		throw new MissingConfig( 'Missing config file.' )
	}
	if ( ! fs.existsSync( filepath ) ) {
		throw new MissingConfig( 'Config file doesn\'t exists.' )
	}

	let config
	try {
		config = JSON.parse( fs.readFileSync( filepath, 'utf8' ) )
	} catch ( e ) {
		throw new InvalidConfig( e.message )
	}

	return config
}

function validateJSON( config ) {
	const ajv = new Ajv()
	const valid = ajv
		.addSchema( schema, 'config' )
		.validate( 'config', config )

	if ( ! valid ) {
		throw new InvalidConfig( ajv.errorsText() )
	}
}

function parse( args ) {
	const config = readConfigFile( args.config )
	validateJSON( config )

	// Validate user.
	const user = args.user.trim()
	const definedUsers = config.users || []
	if ( user && ! Object.keys( definedUsers ).includes( user ) ) {
		throw new InvalidConfig( `User "${ user }" is not defined in ${ args.config }.` )
	}

	// Validate flows.
	const flows = args._.map( s => s.trim() ).filter( Boolean )
	const definedFlows = config.flows
	let prevState = config.initialState
	flows.forEach( flow => {
		if ( typeof definedFlows[ flow ] === 'undefined' ) {
			throw new InvalidConfig( `Flow "${ flow }" is not defined in ${ args.config }.` )
		}

		const requireUser = definedFlows[ flow ].requireUser || false
		if ( requireUser && ! user ) {
			throw new InvalidConfig( `Flow "${ flow }" requires --user to be passed.` )
		}
		if ( typeof requireUser === 'string' && requireUser !== user ) {
			throw new InvalidConfig( `Flow "${ flow }" requires --user="${ requireUser }"` )
		}

		const inputState = definedFlows[ flow ].inputState
		if ( ! prevState.match( inputState ) ) {
			throw new InvalidConfig( `Flow "${ flow }" requires passed state "${ prevState }" matches inputState "${ inputState }"` )
		}
		prevState = definedFlows[ flow ].outputState
	} )

	// Merge sanitized args into config.
	config.file = args.config
	config.user = user
	config.flowsToRun = flows
	config.puppeteer = {
		timeout: args.timeout,
		headless: args.headless,
		defaultViewport: args.viewport,
		ignoreHTTPSErrors: true,
	}

	return config
}

module.exports = {
	parse,
}
