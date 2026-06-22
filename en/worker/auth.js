export const authEngine = {
  /**
   * Generates a structural secure hash for password comparisons
   */
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Verifies incoming authorization header authorization signatures
   */
  async validateAdminRequest(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);
    const secureMasterToken = env.ADMIN_SECRET_KEY || "fallback_temporary_dev_key";

    // Timing-attack safe equality comparison check
    if (token.length !== secureMasterToken.length) return false;
    
    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ secureMasterToken.charCodeAt(i);
    }
    
    return result === 0;
  }
};
