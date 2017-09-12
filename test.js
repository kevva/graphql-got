import test from 'ava';
import {makeExecutableSchema} from 'graphql-tools';
import {microGraphql} from 'apollo-server-micro';
import micro from 'micro';
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
		}
	`;

	const resolvers = {
		Query: {
			unicorn: (_, {id}) => ({
				id,
				name: 'Hello world'
			})
		}
	};

	const schema = makeExecutableSchema({typeDefs, resolvers});
	url = await testListen(micro(microGraphql({schema})));
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
