const bcrypt = require('bcryptjs');
const User = require('../models/User');

const ensureAdminUser = async () => {
  const defaultUsers = [
    {
      email: process.env.ADMIN_EMAIL || 'ADMIN',
      name: process.env.ADMIN_NAME || 'ADMIN',
      password: process.env.ADMIN_PASSWORD || 'ADMIN1234',
      role: 'admin',
    },
    {
      email: process.env.GARIBALDI_EMAIL || 'GARIBALDI',
      name: process.env.GARIBALDI_NAME || 'GARIBALDI',
      password: process.env.GARIBALDI_PASSWORD || 'GARIBALDI156',
      role: 'admin',
    },
  ];

  for (const defaultUser of defaultUsers) {
    const hashedPassword = await bcrypt.hash(defaultUser.password, 10);
    const existingUser = await User.findOne({ email: defaultUser.email });

    if (existingUser) {
      existingUser.name = defaultUser.name;
      existingUser.password = hashedPassword;
      existingUser.role = defaultUser.role;
      await existingUser.save();
      console.log(`Default user updated: ${defaultUser.email}`);
      continue;
    }

    await User.create({
      email: defaultUser.email,
      name: defaultUser.name,
      password: hashedPassword,
      role: defaultUser.role,
    });

    console.log(`Default user created: ${defaultUser.email}`);
  }
};

module.exports = ensureAdminUser;
