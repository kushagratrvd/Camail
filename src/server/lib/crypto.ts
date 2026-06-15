import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const getSecretKey = () => {
    const kek = process.env.CORSAIR_KEK;
    if (!kek) throw new Error('CORSAIR_KEK is not set in environment');
    
    return crypto.createHash('sha256').update(kek).digest();
};

export function encryptTenantId(tenantId: string): string {
    const key = getSecretKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    
    let encrypted = cipher.update(tenantId, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64url');
}

export function decryptTenantId(encryptedToken: string | null): string | null {
    if (!encryptedToken) return null;
    
    try {
        const key = getSecretKey();
        const combined = Buffer.from(encryptedToken, 'base64url');
        
        if (combined.length < 28) return null;
        
        const iv = combined.subarray(0, 12);
        const authTag = combined.subarray(12, 28);
        const encryptedPayload = combined.subarray(28);
        
        const decipher = crypto.createDecipheriv(ALGO, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encryptedPayload);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted.toString('utf8');
    } catch (e) {
        return null;
    }
}
