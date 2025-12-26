export const config = {
  jwt: {
    // Secretos JWT hardcodeados en el código
    secret: 'esteeselsecret',
    refreshSecret: 'debeserseguro',
    expiresIn:  '15m',
    refreshExpiresIn:  '7d',
  },
  bcrypt: {
    saltRounds: 10,
  },
};







