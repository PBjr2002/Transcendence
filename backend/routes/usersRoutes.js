const userDB = require('../database/users');

function users(fastify, options) {
//to get all the users
  fastify.get('/api/users', async (request, reply) => {
    const users = userDB.getAllUsers();
	const usersWithoutPass = users.map(({ password, ...rest }) => rest);
    reply.send(usersWithoutPass);
  });

//to add a new user
  fastify.post('/api/users', async (request, reply) => {
    const { name, info , email, password} = request.body;
	const checkForUserName = userDB.getUserByName(name);
  	if (checkForUserName) {
    	return reply.status(409).send({ error: "Username already exists" });
  	}
	const checkForUserEmail = userDB.checkIfEmailIsUsed(email);
	if (checkForUserEmail) {
    	return reply.status(409).send({ error: "Email already in use" });
  	}
    const result = await userDB.addUser(name, info, email, password);
    reply.send({ id: result.lastInsertRowid });
  });

//to get a user by its name
  fastify.get('/api/users/name/:name', (req, reply) => {
    const user = userDB.getUserByName(req.params.name);
    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }
    reply.send(user);
  });

//to update user information
  fastify.put('/api/users/:id', async (request, reply) => {
    const id = parseInt(request.params.id);
    const { name, info, email, password } = request.body;
    const existingUser = userDB.getUserById(id);
    if (!existingUser) {
    	return reply.status(404).send({ error: "User not found" });
    }
    const updatedFields = {
    	name: name || existingUser.name,
    	info: info || existingUser.info,
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
