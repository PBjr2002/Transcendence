const userDB = require('../database/users');
const xss = require('xss');

function users(fastify, options) {
//to get all the users
  fastify.get('/api/users', async (request, reply) => {
    const users = await userDB.getAllUsers();
	const usersWithoutPass = users.map(({ password, ...rest }) => rest);
    reply.send(usersWithoutPass);
  });

//to add a new user
  fastify.post('/api/users', {
	schema: {
		body: {
			type: 'object',
			required: ['name', 'email', 'password'],
			properties: {
				name: { type: 'string', minLength: 3 },
				email: { type: 'string', format: 'email' },
				password: { type: 'string', minLength: 6 },
				info: { type: 'string' }
			}
		}
	}
  }, async (request, reply) => {
    const { name, info , email, password} = request.body;
	const cleanName = xss(name);
	const cleanInfo = xss(info);
	const checkForUserName = await userDB.getUserByName(cleanName);
  	if (checkForUserName) {
    	return reply.status(409).send({ error: "Username already exists" });
  	}
	const checkForUserEmail = await userDB.checkIfEmailIsUsed(email);
	if (checkForUserEmail) {
    	return reply.status(409).send({ error: "Email already in use" });
  	}
    const result = await userDB.addUser(cleanName, cleanInfo, email, password);
    reply.send({ id: result.lastInsertRowid });
  });

//to get a user by its name
  fastify.get('/api/users/name/:name', (req, reply) => {
	const cleanName = xss(req.params.name);
    const user = userDB.getUserByName(cleanName);
    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }
    reply.send(user);
  });

//to update user information
  fastify.put('/api/users/:id', {
	schema: {
		body: {
			type: 'object',
			properties: {
				name: { type: 'string', minLength: 3 },
				email: { type: 'string', format: 'email' },
				password: { type: 'string', minLength: 6 },
				info: { type: 'string' }
			}
		},
		params: {
			type: 'object',
			properties: {
				id: { type: 'integer' }
			}
		}
	}
  }, async (request, reply) => {
    const id = parseInt(request.params.id);
    const { name, info, email, password } = request.body;
	const cleanName = xss(name);
	const cleanInfo = xss(info);
    const existingUser = await userDB.getUserById(id);
    if (!existingUser) {
    	return reply.status(404).send({ error: "User not found" });
    }
    const updatedFields = {
    	name: cleanName || existingUser.name,
    	info: cleanInfo || existingUser.info,
    	email: email || existingUser.email,
    };
    if (password) {
      const bcrypt = require('bcrypt');
      updatedFields.password = await bcrypt.hash(password, 10);
    }
	else {
      updatedFields.password = existingUser.password;
    }
    userDB.updateUser(id, updatedFields);
    delete updatedFields.password;
    reply.send({ message: "User updated", user: { id, ...updatedFields } });
  });
}

module.exports = users;
