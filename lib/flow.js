const Listr = require( 'listr' )
const puppeteer = require( 'puppeteer' )

let _browser, _page, _config, _waitOptions, _error

function run( config ) {
	_config = config
	_waitOptions = {
		timeout: _config.puppeteer.timeout,
	}

	const tasks = new Listr( [
		launchBrowserTask(),
		runFlowTask(),
	] )

	tasks.run()
		.catch( catcher )
		.finally( done )
}

function catcher( e ) { _error = e }
function hasError() { return typeof _error !== 'undefined' }
function getError() { return _error }

function done() {
	if ( _browser ) {
		_browser.close()
	}
}

function launchBrowserTask() {
	let title = 'Launching browser'
	if ( _config.puppeteer.headless ) {
		title += ' with headless mode'
	}

	return {
		title,
		task: launchBrowser
	}
}

async function launchBrowser() {
	_browser = await puppeteer.launch( _config.puppeteer )
	_page = await _browser.newPage()

	await _page.goto( _config.url, _waitOptions )
}

function runFlowTask() {
	const flows = []
	_config.flowsToRun.forEach( flow => {
		flows.push( {
			title: `Running flow ${ flow }`,
			task: runFlow( flow ),
		} )
	} )

	return {
		title: 'Running flows',
		task: () => {
			return new Listr( flows )
		},
	}
}

function runFlow( flow ) {
	const steps = []

	_config.flows[ flow ].steps.forEach( step => {
		const stepStr = typeof step === 'object'
			? step.step
			: step

		steps.push( {
			title: `Running step ${ stepStr }`,
			task: async ( ctx, task ) => {
				return await runStep( step, ctx, task )
			},
		} )
	} )

	return () => new Listr( steps )
}

const _handlers = {
	goto: handleGoto,
	see: handleSee,
	page: handlePage,
	click: handleClick,
	type: handleType,
	press: handlePress,
	take: handleTake,
}

async function runStep( step, ctx, task ) {
	let skippable = false
	let args = {}
	if ( typeof step === 'object' ) {
		skippable = step.skippable || skippable
		args = step.args || args
		step = step.step
	}

	const [ verb, ...rest ] = step.split( ' ' )
	if ( ! verb || ! rest.length ) {
		skipOrThrowError( skippable, task, `Invalid step "${ step }"` )
	}

	const handler = _handlers[ verb.toLowerCase() ]
	if ( typeof handler !== 'function' ) {
		skipOrThrowError( skippable, task, `Unknown verb "${ verb }" in step "${ step }"` )
	}

	await handler( rest.join( ' ' ), ctx, task ).catch( e => {
		skipOrThrowError( skippable, task, e.message )
	} )
}

async function handleGoto( args, ctx, task ) {
	const url = buildUrl( args )

	await _page.goto( url, _waitOptions )
}

async function handleSee( args, ctx, task ) {
	const selector = lookupSelector( args )
	await _page.waitForSelector( selector, _waitOptions )
}

async function handleClick( args, ctx, task ) {
	const selector = lookupSelector( args )
	await _page.click( selector )
}

async function handleType( args, ctx, task ) {
	const parts = args.split( ' ' )
	if ( isPreposition( parts[ 0 ] ) ) {
		parts.shift()
	}

	if ( parts.length < 2 ) {
		throw new Error( 'Verb "type" requires selector and value to type in step definition.' )
	}

	const selector = lookupSelector( parts.shift() )
	await _page.click( selector )

	let value = lookupValueToType( parts.join( ' ' ) )
	await _page.keyboard.type( value )
}

async function handlePress( args, ctx, task ) {
	await _page.keyboard.press( args )
}

async function handlePage( args, ctx, task ) {
	switch ( args.toLowerCase() ) {
		case 'reloads':
			await _page.waitForNavigation()
			break;
		default:
			throw new Error( `Unknows Page verb ${ args }.` )
	}
}

async function handleTake( args, ctx, task ) {
	const [ action, ...rest ] = args.split( ' ' )
	switch ( action.toLowerCase() ) {
		case 'screenshot':
			await _page.screenshot( { path: rest.join( ' ' ) } )
			break;
		default:
			throw new Error( `Unknown take action "${ action }".` )
	}
}

function skipOrThrowError( skippable, task, message ) {
	if ( skippable ) {
		task.skip( message )
	} else {
		throw new Error( message )
	}
}

function buildUrl( args ) {
	if ( args.startsWith( '/' ) ) {
		args = new URL( args, _config.url ).href
	}
	if ( ! args.startsWith( 'http' ) ) {
		throw new Error( `Unsupported protocol for ${ args }.` )
	}
	return args
}

function isPreposition( preposition ) {
	return [ 'at', 'in', 'on' ].includes( preposition )
}

function lookupSelector( selector ) {
	const s = _config.selectors[ selector ]
	if ( ! s ) {
		throw new Error( `Selector "${ selector }" is not defined in ${ _config.file }` )
	}
	return s
}

function lookupValueToType( value ) {
	const [ k1, k2 ] = value.split( '.' )
	if ( k1 !== 'user' ) {
		return value
	}

	const user = _config.users[ _config.user ]
	if ( ! user ) {
		return value
	}

	return user[ k2 ] || value
}

module.exports = {
	run,
	hasError,
	getError,
}
