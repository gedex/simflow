class CustomError extends Error {
	constructor( message ) {
		super( message )
		this.name = this.constructor.name
		Error.captureStackTrace( this, this.constructor )
	}
}

class MissingConfig extends CustomError {}
class InvalidConfig extends CustomError {}

module.exports = {
	MissingConfig,
	InvalidConfig,
}
