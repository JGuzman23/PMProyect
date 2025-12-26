import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export const generateTokens = (userId) => {
  // Validar que userId esté presente
  if (!userId) {
    console.log('userId is required');
    throw new Error('User ID is required to generate tokens');
  }

  // Validar que los secretos estén presentes (ahora están hardcodeados en el código)
  console.log('config.jwt.refreshSecret', config.jwt.refreshSecret);
  console.log('config.jwt.secret', config.jwt.secret);

  if (!config.jwt.secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  console.log('config.jwt.refreshExpiresIn', config.jwt.refreshExpiresIn);

  if (!config.jwt.refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET is not configured');
  }

  try {
    console.log('About to generate accessToken with:', {
      userId,
      secretLength: config.jwt.secret ? config.jwt.secret.length : 0,
      expiresIn: config.jwt.expiresIn
    });

    console.log('Step 0.1: About to generate accessToken, calling jwt.sign...');
    const accessToken = jwt.sign(
      { userId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    console.log('Step 0.2: accessToken jwt.sign completed');
    
    console.log('accessToken generated successfully, length:', accessToken ? accessToken.length : 0);
    console.log('Step 1: AccessToken completed');

    // Verificar que tenemos todo lo necesario antes de continuar
    if (!config.jwt.refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }
    if (!config.jwt.refreshExpiresIn) {
      throw new Error('JWT_REFRESH_EXPIRES_IN is not configured');
    }
    console.log('Step 2: Refresh secret and expiresIn validated');

    console.log('About to generate refreshToken with:', {
      userId,
      refreshSecretLength: config.jwt.refreshSecret ? config.jwt.refreshSecret.length : 0,
      refreshSecretType: typeof config.jwt.refreshSecret,
      refreshSecretValue: config.jwt.refreshSecret ? config.jwt.refreshSecret.substring(0, 10) + '...' : 'null',
      expiresIn: config.jwt.refreshExpiresIn,
      expiresInType: typeof config.jwt.refreshExpiresIn
    });
    console.log('Step 3: About to call jwt.sign for refreshToken');

    let refreshToken;
    try {
      console.log('Step 4: Calling jwt.sign for refreshToken...');
      console.log('Step 4.1: Creating payload object...');
      const payload = { userId, type: 'refresh' };
      console.log('Step 4.2: Payload created:', JSON.stringify(payload));
      
      console.log('Step 4.3: Calling jwt.sign with:', {
        payloadKeys: Object.keys(payload),
        secretType: typeof config.jwt.refreshSecret,
        secretLength: config.jwt.refreshSecret.length,
        expiresIn: config.jwt.refreshExpiresIn
      });
      
      // Verificar que el secreto sea válido (sin caracteres problemáticos)
      const secretBuffer = Buffer.from(config.jwt.refreshSecret, 'utf8');
      console.log('Step 4.4: Secret converted to buffer, length:', secretBuffer.length);
      
      console.log('Step 4.5: About to execute jwt.sign...');
      console.log('Step 4.5.1: Verifying jwt module is loaded...');
      console.log('Step 4.5.2: jwt.sign function exists:', typeof jwt.sign === 'function');
      
      // Forzar un flush de los logs antes de ejecutar jwt.sign
      process.stdout.write('Step 4.5.3: About to call jwt.sign, flushing stdout...\n');
      
      // Intentar generar el token con manejo de errores más específico
      // Usar una función wrapper para asegurar que cualquier error sea capturado
      try {
        console.log('Step 4.5.4: Entering try block for jwt.sign...');
        
        // Verificar que todos los parámetros sean válidos
        if (!payload || typeof payload !== 'object') {
          throw new Error('Invalid payload for jwt.sign');
        }
        if (!config.jwt.refreshSecret || typeof config.jwt.refreshSecret !== 'string') {
          throw new Error('Invalid refreshSecret for jwt.sign');
        }
        if (!config.jwt.refreshExpiresIn) {
          throw new Error('Invalid refreshExpiresIn for jwt.sign');
        }
        
        console.log('Step 4.5.5: All parameters validated, calling jwt.sign now...');
        
        // TEMPORAL: Usar el mismo secreto que accessToken para debug
        // Si esto funciona, el problema está en el refreshSecret
        console.log('Step 4.5.6: Attempting jwt.sign with refreshSecret...');
        console.log('Step 4.5.7: Secret bytes:', Array.from(Buffer.from(config.jwt.refreshSecret, 'utf8')).slice(0, 10));
        
        // Llamar a jwt.sign de forma síncrona
        // Intentar primero con el secreto normal
        try {
          refreshToken = jwt.sign(
            payload,
            config.jwt.refreshSecret,
            { expiresIn: config.jwt.refreshExpiresIn }
          );
          console.log('Step 5: jwt.sign for refreshToken completed successfully');
        } catch (signErr) {
          console.error('Step 5.1: jwt.sign failed with refreshSecret, trying with accessSecret...');
          // Si falla, intentar con el secreto de accessToken como fallback
          refreshToken = jwt.sign(
            payload,
            config.jwt.secret, // Usar el mismo secreto que accessToken
            { expiresIn: config.jwt.refreshExpiresIn }
          );
          console.log('Step 5.2: jwt.sign completed using accessSecret as fallback');
        }
        
        console.log('Step 5: jwt.sign for refreshToken completed successfully');
      } catch (jwtError) {
        console.error('Step 5 ERROR: jwt.sign failed');
        console.error('JWT Error type:', typeof jwtError);
        console.error('JWT Error:', jwtError);
        if (jwtError instanceof Error) {
          console.error('JWT Error name:', jwtError.name);
          console.error('JWT Error message:', jwtError.message);
          console.error('JWT Error stack:', jwtError.stack);
        } else {
          console.error('JWT Error is not an Error instance, value:', JSON.stringify(jwtError));
        }
        throw jwtError;
      }
      
      console.log('Step 6: refreshToken variable assigned, value exists:', !!refreshToken);
    } catch (signError) {
      console.error('ERROR in jwt.sign for refreshToken:', signError);
      console.error('Error name:', signError.name);
      console.error('Error message:', signError.message);
      console.error('Error stack:', signError.stack);
      throw signError;
    }
    
    console.log('refreshToken generated successfully, length:', refreshToken ? refreshToken.length : 0);
    console.log('Both tokens generated, returning result...');

    const result = { accessToken, refreshToken };
    console.log('Result object created, accessToken exists:', !!result.accessToken, 'refreshToken exists:', !!result.refreshToken);
    
    return result;
  } catch (error) {
    console.error('Error generating JWT tokens:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw new Error('Failed to generate authentication tokens: ' + error.message);
  }
};

export const verifyToken = (token, isRefresh = false) => {
  if (!token) {
    throw new Error('Token is required');
  }

  const secret = isRefresh ? config.jwt.refreshSecret : config.jwt.secret;
  
  if (!secret) {
    throw new Error('JWT secret is not configured');
  }

  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    throw error;
  }
};








