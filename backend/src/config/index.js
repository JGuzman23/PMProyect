export const config = {
  jwt: {
    // Secretos JWT hardcodeados en el código
    secret: 'esteeselsecret',
    refreshSecret: 'debeserseguro',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  bcrypt: {
    saltRounds: 10,
  },
};







