const flatten = require( 'flat' )
const fs = require( 'fs' )
const Listr = require( 'listr' )
const parser = require( './step-parser.js' )
const puppeteer = require( 'puppeteer' )
const parseUrl = require( 'url' ).parse

let _browser, _page, _config, _waitOptions, _error, _references

function run( config ) {
	_config = config
	_waitOptions = {
		timeout: _config.puppeteer.timeout,
	}
	_references = flatten( {
		user: _config.user && _config.users[ _config.user ],
		config: _config,
	} )

	const tasks = new Listr( [
		launchBrowserTask(),
		runFlowTask(),
	] )

	tasks.run()
		.catch( () => {} )
		.finally( done )
}

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
			title: stepStr,
			task: async ( ctx, task ) => {
				return await runStep( step, ctx, task )
			},
		} )
	} )

	return () => new Listr( steps )
}

const _handlers = {
	see: handleSee,
	click: handleClick,
	type: handleType,
	press: handlePress,
	goto: handleGoto,
	save: handleSave,
	wait: handleWait,
	remember: handleRemember,
	print: handlePrint,
}

async function runStep( stepString, ctx, task ) {
	const step = parser.parse( stepString )
	let { action, object, args } = step

	// Normalize object args and step args.
	args = Object.assign( { skippable: false }, normalizeArgs( args ) )
	object.args = Object.assign( {}, normalizeArgs( object.args ) )

	const handler = _handlers[ action.toLowerCase() ]
	if ( typeof handler !== 'function' ) {
		skipOrThrowError( args.skippable, task, `unknown action "${ action }" in step "${ stepString }"` )
	}

	await handler( object, args, ctx, task ).catch( e => {
		skipOrThrowError( args.skippable, task, e.message )
	} )
}

async function handleGoto( object, args, ctx, task ) {
	const url = buildUrl( object.value )
	const options = Object.assign( _waitOptions, args )

	await _page.goto( url, options )
}

async function handleSee( object, args, ctx, task ) {
	const selector = objectToSelector( object )
	switch ( selector.type ) {
		case 'css':
			await handleSeeCSS( selector, args, ctx, task )
			break
		case 'xpath':
			await handleSeeXPath( selector, args, ctx, task )
			break
		default:
			throw new Error( `unknown selector type "${ selector.type }"` )
	}
}

async function handleSeeCSS( selector, args, ctx, task ) {
	const options = Object.assign( { visible: true }, _waitOptions, args )
	const frame = await getSelectorFrame( selector )

	await frame.waitForSelector( selector.str, options )

	const expectText = selector.args.withText
	if ( typeof expectText === 'undefined' ) {
		return
	}

	const element = await frame.$( selector.str )
	const actual = await frame.evaluate( el => el.innerText, element )
	if ( ! actual.match( expectText ) ) {
		throw new Error( `expect text "${ expectText }", but found "${ actual }"` )
	}
}

async function handleSeeXPath( selector, args, ctx, task ) {
	const options = Object.assign( { visible: true }, _waitOptions, args )
	const frame = await getSelectorFrame( selector )

	await frame.waitForXPath( selector.str, options )

	const expectText = selector.args.withText
	if ( typeof expectText === 'undefined' ) {
		return
	}

	const elements = await frame.$x( selector.str )
	for ( const element of elements ) {
		const actual = await frame.evaluate(
			el => el.innerText,
			element
		)

		if ( ! actual.match( expectText ) ) {
			throw new Error( `expect text "${ expectText }", but found "${ actual }"` )
		}
	}
}

async function handleClick( object, args, ctx, task ) {
	const selector = objectToSelector( object )
	const frame = await getSelectorFrame( selector )

	await frame.click( selector.str )
}

async function handleType( object, args, ctx, task ) {
	const selector = objectToSelector( object )
	const options  = Object.assign( { delay: 10 }, args )
	const frame = await getSelectorFrame( selector )

	const text = object.text.type === 'Literal'
		? object.text.value
		: lookupReference( object.text.name )

	await frame.type( selector.str, text, options )
}

async function handlePress( object, args, ctx, task ) {
	const key = object.type === 'Literal'
		? object.value
		: lookupReference( object.name )

	await _page.keyboard.press( key, args )
}

async function handleSave( object, args, ctx, task ) {
	switch ( object.value ) {
		case 'screenshot':
			await handleSaveScreenshot( object, args, ctx, task )
			break
		case 'page':
			await handleSavePage( object, args, ctx, task )
			break
		case 'cookies':
			await handleSaveCookies( object, args, ctx, task )
			break
		default:
			throw new Error( `unknown save object "${ object.value }".` )
	}
}

async function handleSaveScreenshot( object, args, ctx, task ) {
	const options = Object.assign( {
		path: object.destination.value
	}, args )

	await _page.screenshot( options )
}

async function handleSavePage( object, args, ctx, task ) {
	const dst = object.destination.value
	const options = Object.assign( {
		pdf: false,
		path: dst,
	}, args )
	const saveAsPDF = options.pdf

	delete options.pdf

	if ( saveAsPDF ) {
		await _page.pdf( options )
		return
	}

	const content = await _page.content()
	fs.writeFileSync( dst, content )
}

async function handleSaveCookies( object, args, ctx, task ) {
	const dst = object.destination.value
	const cookies = await _page.cookies()
	const content = JSON.stringify( cookies )

	fs.writeFileSync( dst, content )
}

async function handleWait( object, args, ctx, task ) {
	switch ( object.value ) {
		case 'page':
			await handleWaitPage( object, args, ctx, task )
			break
		case 'url':
			await handleWaitUrl( object, args, ctx, task )
			break
		default:
			throw new Error( `unkonwn wait object "${ object.value }".` )
	}
}

async function handleWaitPage( object, args, ctx, task ) {
	const until = getWaitConjunction( args, 'until', 'to' )
	await handleWaitPageUntil( until, args )
}

async function handleWaitPageUntil( until, args ) {
	const options = Object.assign( _waitOptions, args )
	switch ( until ) {
		case 'reload':
			await _page.waitForNavigation( options )
			break
	}
}

async function handleWaitUrlHas( object, args, ctx, task ) {
	const has = getWaitConjunction( args, 'has', 'match' )
	await handleWaitUrlHas( has, args )
}

async function handleWaitUrlHas( has, args ) {
	const options = Object.assign( _waitOptions, args )

	const match = await _page.waitForFunction( has => !!window.location.href.match( has ), options, has )
	if ( ! match ) {
		throw new Error( `expect url to match pattern "${ has }"` )
	}
}

function getWaitConjunction( args, ...conjunctions ) {
	let conj
	for ( key of Object.keys( args ) ) {
		if ( conjunctions.includes( key ) ) {
			conj = args[ key ]
			break
		}
	}

	const expectsString = conjunctions.join( ' or ' )
	if ( ! conj ) {
		throw new Error( `wait expects conjunction ${ expectsString } in step args` )
	}

	return conj
}

async function handleRemember( object, args, ctx, task ) {
	switch ( object.type ) {
		case 'ReserveObject':
			await handleRememberReserveUrlPart( object, args, ctx, task )
			break
		case 'Literal':
			_references[ object.reference.name ] = object.value
			break
		case 'Identifier':
			await handleRememberSelectorPart( object, args, ctx, task )
			break
	}
}

async function handleRememberUrlPart( object, args, ctx, task ) {
	const { part, name, index } = args
	const url = await _page.url()
	const urlParts = parseUrl( url, true )

	let refValue
	switch ( part.toLowerCase() ) {
		case 'querystring':
		case 'qs':
			refValue = urlParts.query[ name ]
			break;
		case 'path':
			const paths = urlParts.pathname.split( '/' ).filter( v => !!v )
			if ( index >= paths.length ) {
				throw new Error( `passed index ${ index } is greater than available url paths length ${ paths.length }` )
			}
			refValue = paths[ index ]
		default:
			throw new Error( 'missing expected part in step args' )
	}

	_references[ object.reference.name ] = refValue
}

async function handleRememberSelectorPart( object, args, ctx, task ) {
	const selector = objectToSelector( object )
	const frame = await getSelectorFrame( selector )
	const { part, name } = args


	const element = selector.type === 'css'
		? ( await frame.$( selector.str ) )
		: ( await frame.$x( selector.str ) )[0]

	let refValue
	switch ( part ) {
		case 'text':
			refValue = await frame.evaluate( el => el.innerText, element )
			break
		case 'attribute':
			refValue = await frame.evaluate( el => el.getAttribute( name ), element )
			break
		default:
			throw new Error( 'missing expected part in step args' )
	}

	_references[ object.reference.name ] = refValue
}

async function handlePrint( object, args, ctx, task ) {
	const value = object.type === 'Literal'
		? object.value
		: lookupReference( object.name )

	task.skip( JSON.stringify( value ) )
}

function skipOrThrowError( skippable, task, message ) {
	if ( skippable ) {
		task.skip( message )
	} else {
		throw new Error( message )
	}
}

function buildUrl( urlOrPath ) {
	if ( urlOrPath.startsWith( '/' ) ) {
		urlOrPath = new URL( urlOrPath, _config.url ).href
	}
	if ( ! urlOrPath.startsWith( 'http' ) ) {
		throw new Error( `unsupported protocol for ${ urlOrPath }` )
	}
	return urlOrPath
}

async function getFrameByName( frame ) {
	return await _page.frames().find( f => f.name().match( frame ) )
}

async function getSelectorFrame( selector ) {
	return selector.frame
		? ( await getFrameByName( selector.frame ) )
		: _page
}

function normalizeArgs( args ) {
	const obj = {}

	args = args || []
	args.forEach( arg => {
		if ( arg.value.type === 'Literal' ) {
			obj[ arg.key ] = arg.value.value
		} else {
			obj[ arg.key ] = lookupReference( arg.value.name )
		}
	} )

	return obj
}

function lookupFrame( frame ) {
	const i = _config.frames[ frame ]
	if ( ! i ) {
		throw new Error( `frame "${ frame }" is not defined in ${ _config.file }` )
	}

	return lookupPlaceholder( i )
}

function objectToSelector( object ) {
	const selector = {}

	let str, type
	switch ( object.type ) {
		case 'Literal':
			str = object.value
			type = object.args.type || 'css'
			break
		case 'Identifier':
			( { str, type } = lookupSelector( object.name, object.args ) )
			break
		default:
			throw new Error( 'Invalid selector' )
	}
	selector.str = str
	selector.type = type

	let frameType = object.frame && object.frame.type
	switch ( frameType ) {
		case 'Literal':
			selector.frame = object.frame.value
			break
		case 'Identifier':
			selector.frame = lookupFrame(  object.frame.name, object.args )
			break
		default:
			selector.frame = null
	}

	selector.args = object.args

	return selector;
}

function lookupSelector( selector, args ) {
	let s = _config.selectors[ selector ]
	if ( ! s ) {
		throw new Error( `named selector "${ selector }" is not defined` )
	}

	if ( typeof s === 'string' ) {
		s = { str: s, type: args.type || 'css' }
	}
	s.str = lookupPlaceholder( s.str )

	return s
}

function lookupPlaceholder( input ) {
	return input.replace( /\{\s*([a-zA-Z0-9_]+)\s*\}/g, referenceReplacer )
}

function referenceReplacer( match, referenceName ) {
	return lookupReference( referenceName )
}

function lookupReference( name ) {
	if ( typeof _references[ name ] === 'undefined' ) {
		throw new Error( `unknown reference name "${ name }"` )
	}

	return _references[ name ]
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
}
