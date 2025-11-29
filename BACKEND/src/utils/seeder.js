const User = require('../models/User');

const seedAdminUser = async () => {
    try {
        const adminEmail = 'admin@gmail.com';
        const userExists = await User.findOne({ email: adminEmail });

        if (userExists) {
            console.log('Admin user already exists');
            return;
        }

        const user = await User.create({
            username: 'admin',
            email: adminEmail,
            password: 'admin@123',
            role: 'admin'
        });

        console.log(`Admin user created: ${user.email}`);
    } catch (error) {
        console.error(`Error seeding admin user: ${error.message}`);
    }
};

module.exports = seedAdminUser;
