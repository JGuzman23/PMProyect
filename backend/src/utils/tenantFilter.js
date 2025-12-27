// Utility to automatically add companyId filter to queries
export const addTenantFilter = (query, companyId) => {
  if (!companyId) {
    throw new Error('Company ID is required');
  }
  return { ...query, companyId };
};








