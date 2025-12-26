export const config = {
  jwt: {
    // Usar variables de entorno si están disponibles, sino usar valores hardcodeados
    secret: process.env.JWT_SECRET || 'esteeselsecret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'debeserseguro',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  bcrypt: {
    saltRounds: 10,
  },
};







