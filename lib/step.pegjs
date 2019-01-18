{
	function extractList( list, index ) {
		return list.map( element => element[ index ] )
	}

	function buildList( head, tail, index ) {
		return [ head ].concat( extractList( tail, index ) )
	}
}

Start
	= Step

Step
	= step:(
		StepSee /
		StepClick /
		StepType /
		StepSelect /
		StepPress /
		StepGoto /
		StepSave /
		StepWait /
		StepRemember /
		StepPrint
	) WS args:(StepArguments)? {
		step.args = args
		return step
	}

// - See namedSelector
// - See selectorName@frame( withText: 'expected text' ) { timeout: 5000 }
// - See '.header h1'@'frameName'
StepSee
	= action:ActionSee WS object:Selector {
		return { action, object }
	}

// - Click namedSelector
// - Click at namedSelector
// - Click at namedSelector@frameName( replacement: 'replace with this' )
StepClick
	= action:ActionClick WS object:Selector {
		return { action, object }
	}

// Type into namedSelector "hello world"
StepType
	= action:ActionType WS object:Selector WS text:(StringLiteral / Identifier) {
		object.text = text
		return { action, object }
	}

// Select namedSelector 'value1, value2'
// Select '.select-name'@'frameName' 'value1, value2'
// Select '.select-name'@'frameName' identifierName
StepSelect
	= action:ActionSelect WS object:Selector WS values:(StringLiteral / Identifier) {
	object.values = values
	return { action, object }
}

// - Press 'Enter'
// - Press 'Enter' { delay: 1000 }
StepPress
	= action:ActionPress WS object:StringLiteral {
		return { action, object }
	}

// - Goto 'https://example.com'
// - Goto '/path/appended/to/url/config'
StepGoto
	= action:ActionGoto WS object:StringLiteral {
		return { action, object }
	}

// - Save screenshot as './screenshots/filename.png' { fullPage: true }
// - Save page as './pages/index.html'
// - Save page as './pages/index.html' { output: 'html' }
// - Save page as './pages/index.pdf' { output: 'pdf' }
// - Save cookies as './cookies/me.json'
StepSave
	= action:ActionSave WS object:(ObjectScreenshot / ObjectPage / ObjectCookies) WS "as"i WS destination:StringLiteral {
		object.destination = destination
		return { action, object }
	}

// - Wait page { until: 'reload', timeout: 3000 }.
// - Wait url { has: 'success=true' }
// - Wait request { to: '/?wc-ajax=update_order_review' }
// - Wait response { from: '/?wc-ajax=update_order_review' }
StepWait
	= action:ActionWait WS object:(ObjectURL / ObjectPage / ObjectRequest / ObjectResponse) {
		return { action, object }
	}

// - Remember url as orderID { part: 'qs', name: 'order_id' }
// - Remember selectorName as referenceName { part: 'text' }
// - Remember selectorName@frame as referenceName { part: 'attribute', name: 'id'  }
// - Remember 'literal string' as referenceName
StepRemember
	= action:ActionRemember WS object:(Literal / ObjectURL / Selector) WS "as" WS reference:Identifier {
		object.reference = reference
		return { action, object }
	}

StepPrint
	= action:ActionPrint WS object:(Literal / Identifier) {
		return { action, object }
	}

Selector
	= selector:(Identifier / StringLiteral) frame:SelectorFrame? args:ObjectArguments? {
		selector.frame = frame
		selector.args = args
		return selector
	}

SelectorFrame
	= "@" frame:(StringLiteral / Identifier) { return frame }

StepArguments
	= "{" WS args:(ArgumentsList) WS "}" { return args }

ObjectArguments
	= "(" WS args:(ArgumentsList) WS ")" { return args }

ArgumentsList
	= head:Argument tail:(WS "," WS Argument)* {
		return buildList( head, tail, 3 )
	}

Argument
	= key:IdentifierName WS ":" WS value:(Literal / Identifier) {
		return { key: key.name, value: value }
	}

ReserveObject
	= ObjectPage
	/ ObjectScreenshot
	/ ObjectText
	/ ObjectURL
	/ ObjectCookies
	/ ObjectRequest
	/ ObjectResponse

ObjectURL        = ("url"i / "current url"i)                  { return { type: 'ReserveObject', value: 'url' } }
ObjectPage       = "page"i                                    { return { type: 'ReserveObject', value: 'page' } }
ObjectScreenshot = "screenshot"i                              { return { type: 'ReserveObject', value: 'screenshot' } }
ObjectText       = "text"i preposition:(WS PrepositionPlace)? { return { type: 'ReserveObject', value: 'text' } }
ObjectCookies    = "cookies"i                                 { return { type: 'ReserveObject', value: 'cookies' } }
ObjectRequest    = "request"i                                 { return { type: 'ReserveObject', value: 'request' } }
ObjectResponse   = "response"i                                { return { type: 'ReserveObject', value: 'response' } }

ActionGoto     = "go"i WS "to"i?                               { return 'goto' }
ActionClick    = "click"i preposition:(WS PrepositionPlace)?   { return 'click' }
ActionPress    = "press"i preposition:(WS PrepositionPlace)?   { return 'press' }
ActionRemember = "remember"i                                   { return 'remember' }
ActionSee      = "see"i                                        { return 'see' }
ActionSave     = "save"i                                       { return 'save' }
ActionType     = "type"i preposition:(WS Preposition)?         { return 'type' }
ActionSelect   = "select"i                                     { return 'select' }
ActionWait     = "wait"i preposition:(WS PrepositionMovement)? { return 'wait' }
ActionPrint    = "print"i                                      { return 'print' }

Preposition
	= PrepositionMovement
	/ PrepositionPlace

PrepositionMovement
	= "into"i
	/ "to"i

PrepositionPlace
	= "at"i
	/ "in"i
	/ "on"i

WS "whitespace"
	= [ \t\n\r]*

Identifier
	= head:IdentifierHead tail:IdentifierTail* {
		head.name += extractList( tail, 'name' ).join( '' )
		return head
	}

IdentifierHead
	= !ReserveWord head:IdentifierName { return head }

IdentifierTail
	= "." tail:IdentifierName {
		tail.name = '.' + tail.name
		return tail
	}

IdentifierName "identifier"
	= head:IdentifierStart tail:IdentifierPart* {
		return { type: 'Identifier', name: head + tail.join( '' ) }
	}

IdentifierStart
	= "_"
	/ [a-z]i

IdentifierPart
	= [a-z0-9_]i

Literal
	= BooleanLiteral
	/ NumericLiteral
	/ StringLiteral

BooleanLiteral
	= TrueToken  { return { type: 'Literal', value: true  } }
	/ FalseToken { return { type: 'Literal', value: false } }

NumericLiteral "number"
	= literal:HexIntegerLiteral !(IdentifierStart / DecimalDigit) {
		return literal
	}
	/ literal:DecimalLiteral !(IdentifierStart / DecimalDigit) {
		return literal
	}

DecimalLiteral
	= DecimalIntegerLiteral "." DecimalDigit* ExponentPart? {
		return { type: 'Literal', value: parseFloat( text() ) }
	}
	/ "." DecimalDigit+ ExponentPart? {
		return { type: 'Literal', value: parseFloat( text() ) }
	}
	/ DecimalIntegerLiteral ExponentPart? {
		return { type: 'Literal', value: parseFloat( text() ) }
	}

DecimalIntegerLiteral
	= "0"
	/ NonZeroDigit DecimalDigit*

DecimalDigit
	= [0-9]

NonZeroDigit
	= [1-9]

ExponentPart
	= ExponentIndicator SignedInteger

ExponentIndicator
	= "e"i

SignedInteger
	= [+-]? DecimalDigit+

HexIntegerLiteral
	= "0x"i digits:$HexDigit+ {
		return { type: 'Literal', value: parseInt( digits, 16 ) }
	}

HexDigit
	= [0-9a-f]i

StringLiteral "string"
	= '"' chars:DoubleStringCharacter* '"' {
		return { type: 'Literal', value: chars.join( '' ) }
	}
	/ "'" chars:SingleStringCharacter* "'" {
		return { type: 'Literal', value: chars.join( '' ) }
	}

DoubleStringCharacter
	= !('"' / "\\" / LineTerminator) SourceCharacter { return text() }
	/ "\\" sequence:EscapeSequence { return sequence }
	/ LineContinuation

SingleStringCharacter
	= !("'" / "\\" / LineTerminator) SourceCharacter { return text() }
	/ "\\" sequence:EscapeSequence { return sequence }
	/ LineContinuation

SourceCharacter
	= .

LineContinuation
	= "\\" LineTerminatorSequence { return '' }

LineTerminator
	= [\n\r\u2028\u2029]

LineTerminatorSequence "end of line"
	= "\n"
	/ "\r\n"
	/ "\r"
	/ "\u2028"
	/ "\u2029"

EscapeSequence
	= CharacterEscapeSequence
	/ "0" !DecimalDigit { return "\0" }
	/ HexEscapeSequence
	/ UnicodeEscapeSequence

CharacterEscapeSequence
	= SingleEscapeCharacter
	/ NonEscapeCharacter

SingleEscapeCharacter
	= "'"
	/ '"'
	/ "b" { return "\b" }
	/ "f" { return "\f" }
	/ "n" { return "\n" }
	/ "r" { return "\r" }
	/ "t" { return "\t" }
	/ "v" { return "\v" }

NonEscapeCharacter
	= !(EscapeCharacter / LineTerminator) SourceCharacter { return text() }

EscapeCharacter
	= SingleEscapeCharacter
	/ DecimalDigit
	/ "x"
	/ "u"

HexEscapeSequence
	= "x" digits:$(HexDigit HexDigit) {
		return String.fromCharCode( parseInt( digits, 16 ) )
	}

UnicodeEscapeSequence
	= "u" digits:$(HexDigit HexDigit HexDigit HexDigit) {
		return String.fromCharCode( parseInt( digits, 16 ) )
	}

TrueToken  = "true"  !IdentifierPart
FalseToken = "false" !IdentifierPart

ReserveWord
	= ReserveObject
	/ Preposition
	/ BooleanLiteral
