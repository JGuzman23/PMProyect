export const tenantMiddleware = (req, res, next) => {
  // Extract tenant from subdomain or header
  const host = req.get('host') || '';
  const subdomain = host.split('.')[0];
  
  // Check if subdomain is not 'www', 'api', or 'app' (main domains)
  const excludedSubdomains = ['www', 'api', 'app', 'localhost', '127.0.0.1'];
  
  if (!excludedSubdomains.includes(subdomain) && subdomain !== host) {
    req.tenantId = subdomain;
  } else {
    // Fallback to header
    req.tenantId = req.headers['x-tenant-id'] || null;
  }
  
  // Store tenant in request for use in controllers/services
  req.companyId = req.tenantId;
  
  next();
};





