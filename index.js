'use strict';
const got = require('got');

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

	return got(url, opts)
		.then(res => {
			res.body = res.body.data;
			return res;
		})
		.catch(err => {
			if (err.response && typeof err.response.body === 'object') {
				err.name = 'GraphQLError';
				err.body = opts.body;

				if (err.response.body.errors && err.response.body.errors.length > 0) {
					err.message = err.response.body.errors[0].message;
				}
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
