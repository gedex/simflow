const assert = require( 'assert' )
const parseConfig = require( '../lib/config.js' ).parse
const joinPath = require( 'path' ).join
const {
	MissingConfig,
	InvalidConfig,
} = require( '../lib/errors.js' )

const configFixture = ( tail ) => joinPath( __dirname, 'fixtures', tail )

describe( 'config parser', () => {
	it( 'throws MissingConfig if config arg is empty', () => {
		assert.throws(
			() => parseConfig( {} ),
			MissingConfig
		)
	} )

	it( 'throws MissingConfig if config file doesn\'t exist', () => {
		assert.throws(
			() => parseConfig( { config: '/path/does/not/exist' } ),
			MissingConfig
		)
	} )

	it( 'throws InvalidConfig if url is missing', () => {
		assert.throws(
			() => parseConfig( { config: configFixture( 'invalid-config/missing-url.json' ) } ),
			InvalidConfig
		)
	} )

	it( 'throws InvalidConfig if url is invalid', () => {
		assert.throws(
			() => parseConfig( { config: configFixture( 'invalid-config/invalid-url.json' ) } ),
			InvalidConfig
		)
	} )

	it( 'throws InvalidConfig if flows is missing', () => {
		assert.throws(
			() => parseConfig( { config: configFixture( 'invalid-config/missing-flows.json' ) } ),
			InvalidConfig
		)
	} )

	it( 'throws InvalidConfig if flows is empty', () => {
		assert.throws(
			() => parseConfig( { config: configFixture( 'invalid-config/empty-flows.json' ) } ),
			InvalidConfig
		)
	} )

	it( 'throws InvalidConfig if flow name is invalid', () => {
		assert.throws(
			() => parseConfig( { config: configFixture( 'invalid-config/invalid-flow-name.json' ) } ),
			InvalidConfig
		)
	} )

	it( 'throws InvalidConfig if flow steps is empty', () => {
		assert.throws(
			() => parseConfig( { config: configFixture( 'invalid-config/empty-flow-steps.json' ) } ),
			InvalidConfig
		)
	} )

	it( 'parses valid JSON config', () => {
		const actual = parseConfig( {
			config: configFixture( 'valid-config/simple.json' ),
			_: [ 'flowName' ],
			viewport: null,
			timeout: 1000,
		} )

		const expected = {
			file: configFixture( 'valid-config/simple.json' ),
			flows: {
				flowName: [ "Goto '/'" ],
			},
			flowsToRun: [ 'flowName' ],
			url: 'https://example.com',
			puppeteer: {
				defaultViewport: null,
				ignoreHTTPSErrors: true,
				headless: undefined,
				timeout: 1000,
			},
		}

		assert.deepStrictEqual( actual, expected )
	} )
} )
