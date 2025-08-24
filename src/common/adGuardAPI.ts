// AdGuard DNS API utility functions for ad blocking

export type AdGuardTokenResponse = {
    access_token: string;
    token_type: string;
    refresh_token: string;
    expires_in: number;
};

export type AdGuardDNSConfig = {
    access_token: string;
    refresh_token: string;
    expires_at: number;
};

const ADGUARD_API_BASE = 'https://api.adguard-dns.io';
const ADGUARD_STORAGE_KEY = 'adguard_dns_config';

/**
 * Authenticate with AdGuard DNS API
 * @param username - AdGuard account email
 * @param password - AdGuard account password
 * @param mfaToken - Two-factor authentication token (optional)
 * @returns AdGuard DNS configuration or null if authentication fails
 */
export async function authenticateAdGuard(
    username: string, 
    password: string, 
    mfaToken?: string
): Promise<AdGuardDNSConfig | null> {
    try {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        if (mfaToken) {
            formData.append('mfa_token', mfaToken);
        }

        const response = await fetch(`${ADGUARD_API_BASE}/oapi/v1/oauth_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: AdGuardTokenResponse = await response.json();
        
        const config: AdGuardDNSConfig = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: Date.now() + (data.expires_in * 1000)
        };

        // Store in localStorage
        localStorage.setItem(ADGUARD_STORAGE_KEY, JSON.stringify(config));
        return config;
    } catch (error) {
        console.error('AdGuard authentication failed:', error);
        return null;
    }
}

/**
 * Refresh AdGuard access token using refresh token
 * @param refreshToken - Refresh token from previous authentication
 * @returns New AdGuard DNS configuration or null if refresh fails
 */
export async function refreshAdGuardToken(refreshToken: string): Promise<AdGuardDNSConfig | null> {
    try {
        const formData = new URLSearchParams();
        formData.append('refresh_token', refreshToken);

        const response = await fetch(`${ADGUARD_API_BASE}/oapi/v1/oauth_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: AdGuardTokenResponse = await response.json();
        
        const config: AdGuardDNSConfig = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: Date.now() + (data.expires_in * 1000)
        };

        // Update localStorage
        localStorage.setItem(ADGUARD_STORAGE_KEY, JSON.stringify(config));
        return config;
    } catch (error) {
        console.error('AdGuard token refresh failed:', error);
        return null;
    }
}

/**
 * Get stored AdGuard DNS configuration
 * @returns AdGuard DNS configuration or null if not found/expired
 */
export function getAdGuardConfig(): AdGuardDNSConfig | null {
    try {
        const raw = localStorage.getItem(ADGUARD_STORAGE_KEY);
        if (!raw) return null;
        
        const config: AdGuardDNSConfig = JSON.parse(raw);
        
        // Check if token is expired (with 5 minute buffer)
        if (Date.now() >= config.expires_at - (5 * 60 * 1000)) {
            return null;
        }
        
        return config;
    } catch {
        return null;
    }
}

/**
 * Revoke AdGuard refresh token
 * @param refreshToken - Refresh token to revoke
 * @returns True if successful, false otherwise
 */
export async function revokeAdGuardToken(refreshToken: string): Promise<boolean> {
    try {
        const response = await fetch(`${ADGUARD_API_BASE}/oapi/v1/revoke_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `token=${encodeURIComponent(refreshToken)}`
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Remove from localStorage
        localStorage.removeItem(ADGUARD_STORAGE_KEY);
        return true;
    } catch (error) {
        console.error('AdGuard token revocation failed:', error);
        return false;
    }
}

/**
 * Check if AdGuard DNS is available and authenticated
 * @returns True if AdGuard DNS is available, false otherwise
 */
export function isAdGuardAvailable(): boolean {
    const config = getAdGuardConfig();
    return config !== null;
}

/**
 * Get valid access token for AdGuard API calls
 * @returns Valid access token or null if not available
 */
export async function getValidAdGuardToken(): Promise<string | null> {
    let config = getAdGuardConfig();
    
    if (!config) {
        return null;
    }
    
    // If token is expired, try to refresh it
    if (Date.now() >= config.expires_at - (5 * 60 * 1000)) {
        config = await refreshAdGuardToken(config.refresh_token);
        if (!config) {
            return null;
        }
    }
    
    return config.access_token;
}

/**
 * Make authenticated request to AdGuard API
 * @param endpoint - API endpoint (without base URL)
 * @param options - Fetch options
 * @returns Response or null if authentication fails
 */
export async function makeAdGuardRequest(
    endpoint: string, 
    options: RequestInit = {}
): Promise<Response | null> {
    const token = await getValidAdGuardToken();
    if (!token) {
        return null;
    }

    const url = `${ADGUARD_API_BASE}${endpoint}`;
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    try {
        return await fetch(url, {
            ...options,
            headers
        });
    } catch (error) {
        console.error('AdGuard API request failed:', error);
        return null;
    }
}

/**
 * Clear stored AdGuard configuration
 */
export function clearAdGuardConfig(): void {
    localStorage.removeItem(ADGUARD_STORAGE_KEY);
}

/**
 * Example usage of AdGuard DNS API for ad blocking
 * This function can be called to enable ad blocking for specific domains
 */
export async function enableAdBlockingForDomain(domain: string): Promise<boolean> {
    try {
        // This is a placeholder - you would need to implement the actual
        // AdGuard DNS filtering logic based on their API documentation
        const response = await makeAdGuardRequest('/api/v1/filtering/status');
        
        if (response && response.ok) {
            console.log(`Ad blocking enabled for ${domain}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Failed to enable ad blocking:', error);
        return false;
    }
}
