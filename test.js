import test from 'ava';
import {makeExecutableSchema} from 'graphql-tools';
import {microGraphql} from 'apollo-server-micro';
import micro from 'micro';
import nock from 'nock';
import testListen from 'test-listen';
import m from '.';

let url;

test.before(async () => {
	const typeDefs = `
		type Unicorn {
			id: Int
			name: String
		}

		type Query {
			unicorn(id: Int!): Unicorn
			error: Int
		}
	`;

	const resolvers = {
		Query: {
			unicorn: (_, {id}) => ({
				id,
				name: 'Hello world'
			}),
			error: () => {
				throw new Error('boom');
			}
		}
	};

	url = await testListen(micro(microGraphql({
		schema: makeExecutableSchema({typeDefs, resolvers})
	})));
});

test('query', async t => {
	const query = `
		{
			unicorn(id: 0) {
				id,
				name
			}
		}
	`;

	t.deepEqual((await m(url, {query})).body, {
		unicorn: {
			id: 0,
			name: 'Hello world'
		}
	});
});

test('variables', async t => {
	const variables = {id: 0};
	const query = `
		query ($id: Int!) {
			unicorn(id: $id) {
				id,
				name
			}
		}
	`;

	t.deepEqual((await m(url, {query, variables})).body, {
		unicorn: {
			id: 0,
			name: 'Hello world'
		}
	});
});

test('operationName', async t => {
	const operationName = 'foo';
	const query = `
		query foo {
			unicorn(id: 0) {
				id
			}
		}

		query bar {
			unicorn(id: 0) {
				name
			}
		}
	`;

	t.deepEqual((await m(url, {query, operationName})).body, {
		unicorn: {
			id: 0
		}
	});
});

test('resolver error', async t => {
	const query = `
		{
			error
		}
	`;

	const {errors} = await m(url, {query});
	t.deepEqual(errors, [{message: 'boom', locations: [{line: 3, column: 4}], path: ['error']}]);
});

test('GraphQLError', async t => {
	const operationName = 'foo';
	const variables = {id: 0};
	const query = `
		query foo ($id: Int!) {
			unicorn(id: 0) {
				foo
			}
		}
	`;

	const errors = await t.throws(m(url, {operationName, query, variables}));

	for (const x of errors) {
		t.is(x.name, 'GraphQLError');
		t.is(x.operationName, operationName);
		t.is(x.query, query);
		t.true(Array.isArray(x.locations));
		t.deepEqual(x.variables, variables);
	}
});

test('token option', async t => {
	const token = 'unicorn';

	nock('http://foo.bar/')
		.matchHeader('authorization', `bearer ${token}`)
		.post('/')
		.reply(200, {data: {token}});

	t.is((await m('http://foo.bar/', {token})).body.token, token);
});

test('prepends `https://` to url', async t => {
	nock('https://foo.bar/')
		.post('/')
		.reply(200, {data: 'ok'});

	t.is((await m('foo.bar/')).body, 'ok');
});
