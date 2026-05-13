// src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_change_me';

/**
 * Middleware principal: verifica o Bearer token no header Authorization
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de acesso não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.agent = payload; // { sub, email, role, name }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

/**
 * Guard de role: uso após requireAuth
 * Ex: requireRole('ADMIN')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.agent) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    if (!roles.includes(req.agent.role)) {
      return res.status(403).json({ error: `Acesso restrito. Roles necessárias: ${roles.join(', ')}` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
