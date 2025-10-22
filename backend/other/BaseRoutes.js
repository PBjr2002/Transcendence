class BaseRoute {
	static authenticateRoute(fastify, schema) {
		return {
			onRequest: [fastify.authenticate],
			schema: schema
		};
	}
	static handleError(reply, message, status = 500) {
		if (status >= 500)
			reply.status(status).send({ 'err': message });
		else
			reply.status(status).send({ 'error': message });
	}
	static handleSuccess(reply, message, status = 200) {
		reply.status(status).send({ success: true, message: message });
	}
	static createSchema(params = null, body = null, querystring = null) {
		const schema = {};
		if (params)
			schema.params = params;
		if (body)
			schema.body = body;
		if (querystring)
			schema.querystring = querystring;
		return (schema);
	}
}

export default BaseRoute;