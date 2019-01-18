/* global describe, it */
const assert = require( 'assert' )
const parser = require( '../lib/step-parser.js' )

const assertSteps = steps => {
	steps.forEach( test => {
		const [ step, expected ] = test

		let actual
		try {
			actual = parser.parse( step )
		} catch ( e ) {
			actual = null
		}

		const suffix = actual !== null
			? 'returns an expected result'
			: 'throws an exception'

		it( `'${ step }' ${ suffix }`, () => {
			assert.deepStrictEqual( actual, expected )
		} )
	} )
}

describe( 'step parser', () => {
	describe( 'parse step see', () => {
		const steps = [
			[
				'See namedSelector',
				{
					action: 'see',
					object: { type: 'Identifier', name: 'namedSelector', frame: null, args: null },
					args: null,
				},
			],
			[
				'See selectorName.foo.bar@frame.__.baz',
				{
					action: 'see',
					object: {
						type: 'Identifier',
						name: 'selectorName.foo.bar',
						frame: { type: 'Identifier', name: 'frame.__.baz' },
						args: null
					},
					args: null,
				},
			],
			[
				'See namedSelector( foo: "bar", baz: baz )',
				{
					action: 'see',
					object: {
						type: 'Identifier',
						name: 'namedSelector',
						frame: null,
						args: [
							{ key: 'foo', value: { type: 'Literal', value: 'bar' } },
							{ key: 'baz', value: { type: 'Identifier', name: 'baz' } },
						],
					},
					args: null,
				},
			],
			[
				'See selectorName@frame( foo: "bar", baz: baz )',
				{
					action: 'see',
					object: {
						type: 'Identifier',
						name: 'selectorName',
						frame: { type: 'Identifier', name: 'frame' },
						args: [
							{ key: 'foo', value: { type: 'Literal', value: 'bar' } },
							{ key: 'baz', value: { type: 'Identifier', name: 'baz' } },
						],
					},
					args: null,
				},
			],
			[
				'See selectorName@"frameName"',
				{
					action: 'see',
					object: {
						type: 'Identifier',
						name: 'selectorName',
						frame: { type: 'Literal', value: 'frameName' },
						args: null,
					},
					args: null,
				},
			],
			[
				'See ".header h1"@frameName',
				{
					action: 'see',
					object: {
						type: 'Literal',
						value: '.header h1',
						frame: { type: 'Identifier', name: 'frameName' },
						args: null,
					},
					args: null,
				},
			],
			[
				'See ".header h1 $arg1"@"frameName"(arg1: hello)',
				{
					action: 'see',
					object: {
						type: 'Literal',
						value: '.header h1 $arg1',
						frame: { type: 'Literal', value: 'frameName' },
						args: [
							{ key: 'arg1', value: { type: 'Identifier', name: 'hello' } },
						],
					},
					args: null,
				},
			],
			[
				'See namedSelector( withText: "Hello world"  )',
				{
					action: 'see',
					object: {
						type: 'Identifier',
						name: 'namedSelector',
						frame: null,
						args: [
							{ key: 'withText', value: { type: 'Literal', value: 'Hello world' } },
						],
					},
					args: null,
				},
			],
			[
				'See namedSelector( withText: referenceName  ) { timeout: 3000  }',
				{
					action: 'see',
					object: {
						type: 'Identifier',
						name: 'namedSelector',
						frame: null,
						args: [
							{ key: 'withText', value: { type: 'Identifier', name: 'referenceName' } },
						],
					},
					args: [
						{ key: 'timeout', value: { type: 'Literal', value: 3000 } },
					],
				},
			],
			// Parse errors.
			[ 'See .headerName h1', null ],
			[ 'See text', null ],
			[ 'See text.', null ],
			[ 'See .foo.bar', null ],
			[ 'See url', null ],
			[ 'See page', null ],
			[ 'See screenshot', null ],
			[ 'See true', null ],
			[ 'See false', null ],
		]

		assertSteps( steps )
	} )

	describe( 'parse step click', () => {
		const steps = [
			[
				'Click namedSelector',
				{
					action: 'click',
					object: {
						type: 'Identifier',
						name: 'namedSelector',
						frame: null,
						args: null,
					},
					args: null,
				},
			],
			[
				'Click at namedSelector@frameName( foo: bar  ) { timeout: 3000  }',
				{
					action: 'click',
					object: {
						type: 'Identifier',
						name: 'namedSelector',
						frame: { type: 'Identifier', name: 'frameName' },
						args: [
							{ key: 'foo', value: { type: 'Identifier', name: 'bar' } },
						],
					},
					args: [
						{ key: 'timeout', value: { type: 'Literal', value: 3000 } },
					],
				},
			],
			// Parse errors.
			[ 'Click ', null ],
			[ 'Click false@frame', null ],
			[ 'Click page', null ],
			[ 'Click true', null ],
		]

		assertSteps( steps )
	} )

	describe( 'parse step type', () => {
		const steps = [
			[
				'type in namedSelector "hello"',
				{
					action: 'type',
					object: {
						type: 'Identifier',
						name: 'namedSelector',
						frame: null,
						args: null,
						text: { type: 'Literal', value: 'hello' },
					},
					args: null,
				},
			],
			[
				'type into namedSelector@frameName "hello"',
				{
					action: 'type',
					object: {
						type: 'Identifier',
						name: 'namedSelector',
						frame: { type: 'Identifier', name: 'frameName' },
						args: null,
						text: { type: 'Literal', value: 'hello' },
					},
					args: null,
				},
			],
			[
				'type on namedSelector@frameName( foo: bar  ) valueToType { timeout: 3000  }',
				{
					action: 'type',
					object: {
						type: 'Identifier',
						name: 'namedSelector',
						frame: { type: 'Identifier', name: 'frameName' },
						args: [
							{ key: 'foo', value: { type: 'Identifier', name: 'bar' } },
						],
						text: { type: 'Identifier', name: 'valueToType' },
					},
					args: [
						{ key: 'timeout', value: { type: 'Literal', value: 3000 } },
					],
				},
			],
			// Parse errors.
			[ 'type xo@frame 123', null ],
			[ 'type into selectorName', null ],
			[ 'type false@frame', null ],
			[ 'type page', null ],
			[ 'type true', null ],
		]

		assertSteps( steps )
	} )

	describe( 'parse step press', () => {
		const steps = [
			[
				'Press "Enter"',
				{
					action: 'press',
					object: {
						type: 'Literal',
						value: 'Enter',
					},
					args: null,
				},
			],
			[
				'Press "Enter" { delay: 5000 }',
				{
					action: 'press',
					object: {
						type: 'Literal',
						value: 'Enter',
					},
					args: [
						{ key: 'delay', value: { type: 'Literal', value: 5000 } },
					],
				},
			]
		]

		assertSteps( steps )
	} )

	describe( 'parse step goto', () => {
		const steps = [
			[
				'Goto "https://example.com"',
				{
					action: 'goto',
					object: {
						type: 'Literal',
						value: 'https://example.com',
					},
					args: null,
				},
			],
			[
				'goto "https://example.com"',
				{
					action: 'goto',
					object: {
						type: 'Literal',
						value: 'https://example.com',
					},
					args: null,
				},
			],
			[
				'Go to "https://example.com"',
				{
					action: 'goto',
					object: {
						type: 'Literal',
						value: 'https://example.com',
					},
					args: null,
				},
			],
			[
				'Goto "/path"',
				{
					action: 'goto',
					object: {
						type: 'Literal',
						value: '/path',
					},
					args: null,
				},
			]
		]

		assertSteps( steps )
	} )

	describe( 'parse step save', () => {
		const steps = [
			[
				'Save screenshot as "./screenshots/filename.png" { fullPage: true }',
				{
					action: 'save',
					object: {
						type: 'ReserveObject',
						value: 'screenshot',
						destination: {
							type: 'Literal',
							value: './screenshots/filename.png',
						},
					},
					args: [
						{ key: 'fullPage', value: { type: 'Literal', value: true } },
					],
				},
			],
			[
				'Save page as "./pages/index.html"',
				{
					action: 'save',
					object: {
						type: 'ReserveObject',
						value: 'page',
						destination: {
							type: 'Literal',
							value: './pages/index.html',
						},
					},
					args: null,
				},
			],
			[
				'Save page as "./pdfs/index.pdf" { pdf: true }',
				{
					action: 'save',
					object: {
						type: 'ReserveObject',
						value: 'page',
						destination: {
							type: 'Literal',
							value: './pdfs/index.pdf',
						},
					},
					args: [
						{ key: 'pdf', value: { type: 'Literal', value: true } },
					],
				},
			],
			[
				'Save cookies as "./cookies/me.json"',
				{
					action: 'save',
					object: {
						type: 'ReserveObject',
						value: 'cookies',
						destination: {
							type: 'Literal',
							value: './cookies/me.json',
						},
					},
					args: null,
				},
			],
		]

		assertSteps( steps )
	} )

	describe( 'parse step wait', () => {
		const steps = [
			[
				'Wait page { until: "reload", timeout: 5000 }',
				{
					action: 'wait',
					object: {
						type: 'ReserveObject',
						value: 'page',
					},
					args: [
						{ key: 'until', value: { type: 'Literal', value: 'reload' } },
						{ key: 'timeout', value: { type: 'Literal', value: 5000 } },
					]
				},
			],
			[
				'Wait page { to: "reload", timeout: 5000 }',
				{
					action: 'wait',
					object: {
						type: 'ReserveObject',
						value: 'page',
					},
					args: [
						{ key: 'to', value: { type: 'Literal', value: 'reload' } },
						{ key: 'timeout', value: { type: 'Literal', value: 5000 } },
					]
				},
			],
			[
				'Wait request { to: "/?wc-ajax=update_order_review", timeout: 5000 }',
				{
					action: 'wait',
					object: {
						type: 'ReserveObject',
						value: 'request',
					},
					args: [
						{ key: 'to', value: { type: 'Literal', value: '/?wc-ajax=update_order_review' } },
						{ key: 'timeout', value: { type: 'Literal', value: 5000 } },
					]
				},
			],
			[
				'Wait response { from: "/?wc-ajax=update_order_review", timeout: 5000 }',
				{
					action: 'wait',
					object: {
						type: 'ReserveObject',
						value: 'response',
					},
					args: [
						{ key: 'from', value: { type: 'Literal', value: '/?wc-ajax=update_order_review' } },
						{ key: 'timeout', value: { type: 'Literal', value: 5000 } },
					]
				},
			],
			[
				'Wait url { has: "success=true" }',
				{
					action: 'wait',
					object: {
						type: 'ReserveObject',
						value: 'url',
					},
					args: [
						{ key: 'has', value: { type: 'Literal', value: 'success=true' } },
					],
				},
			],
		]

		assertSteps( steps )
	} )

	describe( 'parse step remember', () => {
		const steps = [
			[
				'Remember url as orderID { part: "qs", name: "order_id" }',
				{
					action: 'remember',
					object: {
						type: 'ReserveObject',
						value: 'url',
						reference: { type: 'Identifier', name: 'orderID' },
					},
					args: [
						{ key: 'part', value: { type: 'Literal', value: 'qs' } },
						{ key: 'name', value: { type: 'Literal', value: 'order_id' } },
					],
				},
			],
			[
				'Remember url as orderID { part: "path", index: 2 }',
				{
					action: 'remember',
					object: {
						type: 'ReserveObject',
						value: 'url',
						reference: { type: 'Identifier', name: 'orderID' },
					},
					args: [
						{ key: 'part', value: { type: 'Literal', value: 'path' } },
						{ key: 'index', value: { type: 'Literal', value: 2 } },
					],
				},
			],
			[
				'Remember selectorName as referenceName { part: "text" }',
				{
					action: 'remember',
					object: {
						type: 'Identifier',
						name: 'selectorName',
						frame: null,
						args: null,
						reference: { type: 'Identifier', name: 'referenceName' },
					},
					args: [
						{ key: 'part', value: { type: 'Literal', value: 'text' } },
					]
				},
			],
			[
				'Remember "literal string" as referenceName',
				{
					action: 'remember',
					object: {
						type: 'Literal',
						value: 'literal string',
						reference: { type: 'Identifier', name: 'referenceName' },
					},
					args: null,
				},
			],
			[
				'Remember true as referenceName',
				{
					action: 'remember',
					object: {
						type: 'Literal',
						value: true,
						reference: { type: 'Identifier', name: 'referenceName' },
					},
					args: null,
				},
			],
			[
				'Remember selectorName@frame( foo: bar ) as referenceName { part: "attribute", name: "id" }',
				{
					action: 'remember',
					object: {
						type: 'Identifier',
						name: 'selectorName',
						frame: { type: 'Identifier', name: 'frame' },
						args: [
							{ key: 'foo', value: { type: 'Identifier', name: 'bar' } },
						],
						reference: { type: 'Identifier', name: 'referenceName' },
					},
					args: [
						{ key: 'part', value: { type: 'Literal', value: 'attribute' } },
						{ key: 'name', value: { type: 'Literal', value: 'id' } },
					],
				},
			],
		]

		assertSteps( steps )
	} )

	describe( 'parse step print', () => {
		const steps = [
			[
				'Print "literal string"',
				{
					action: 'print',
					object: {
						type: 'Literal',
						value: 'literal string',
					},
					args: null,
				},
			],
			[
				'Print true',
				{
					action: 'print',
					object: {
						type: 'Literal',
						value: true,
					},
					args: null,
				},
			],
			[
				'Print 123.456',
				{
					action: 'print',
					object: {
						type: 'Literal',
						value: 123.456,
					},
					args: null,
				},
			],
			[
				'print referenceName',
				{
					action: 'print',
					object: {
						type: 'Identifier',
						name: 'referenceName',
					},
					args: null,
				},
			],
		]

		assertSteps( steps )
	} )
} )
