const { DataSource } = require('typeorm');
const dotenv = require('dotenv');
const { User } = require('./src/users/entities/user.entity');
const { Project } = require('./src/projects/entities/project.entity');
dotenv.config();

const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    entities: [User, Project],
});

AppDataSource.initialize().then(async () => {
    const usersRepository = AppDataSource.getRepository(User);
    const users = await usersRepository.find({ relations: { projects: true } });
    
    const mapped = users.map(user => {
      const { passwordHash, ...rest } = user;
      return rest;
    });
    console.log(JSON.stringify(mapped.map(u => ({ username: u.username, projects: u.projects ? u.projects.length : 'UNDEFINED' })), null, 2));
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
