const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

const getProductById = async (productId, requestId) => {
  const response = await fetch(`${PRODUCT_SERVICE_URL}/api/products/${productId}`, {
    headers: requestId ? { 'x-request-id': requestId } : {}
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`product_service_${response.status}`);
  }

  const payload = await response.json();
  return payload?.data || null;
};

module.exports = {
  getProductById
};
