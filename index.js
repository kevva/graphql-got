'use strict';
const AggregateError = require('aggregate-error');
const got = require('got');
const prependHttp = require('prepend-http');

class GraphQLError extends Error {
	constructor(err, body) {
		super(err.message);
		this.name = 'GraphQLError';
		this.locations = err.locations;
		this.operationName = body.operationName;
		this.query = body.query;
		this.variables = body.variables;
	}
}

const graphqlGot = (url, opts) => {
	opts = Object.assign({method: 'POST'}, opts, {json: true});

	opts.body = Object.assign({}, {
		query: opts.query,
		operationName: opts.operationName,
		variables: opts.variables
	});

	delete opts.query;
	delete opts.operationName;
	delete opts.variables;

	if (opts.token) {
		opts.headers = Object.assign({}, opts.headers, {
			authorization: `bearer ${opts.token}`
		});
	}

	return got(prependHttp(url, {https: true}), opts)
		.then(res => {
			res.body = res.body.data;
			return res;
		})
		.catch(err => {
			if (err.response && typeof err.response.body === 'object') {
				const errors = err.response.body.errors;
				const error = Array.isArray(errors) && errors.length > 0 ?
					errors.map(x => new GraphQLError(x, opts.body)) :
					[new GraphQLError(err, opts.body)];

				throw new AggregateError(error);
			}

			throw err;
		});
};

const helpers = [
	'get',
	'post'
];

for (const x of helpers) {
	const method = x.toUpperCase();
	graphqlGot[x] = (url, opts) => graphqlGot(url, Object.assign({}, opts, {method}));
}

module.exports = graphqlGot;
