const API_BASE_URL = typeof window !== 'undefined' ? '/api' : (process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001');

const getAuthToken = () => {
    if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        let tokenName = 'accessToken'; // fallback

        if (path.startsWith('/admin')) {
            tokenName = 'admin_accessToken';
        } else if (path.startsWith('/developer/ide')) {
            const isAsAdmin = window.location.search.includes('asAdmin=true');
            tokenName = (isAsAdmin && document.cookie.includes('admin_accessToken=')) ? 'admin_accessToken' : 'developer_accessToken';
        } else if (path.startsWith('/developer')) {
            tokenName = 'developer_accessToken';
        } else if (path.startsWith('/viewer')) {
            tokenName = 'viewer_accessToken';
        }

        const match = document.cookie.match(new RegExp('(^| )' + tokenName + '=([^;]+)'));
        const cookieToken = match ? match[2] : null;

        // For all roles, prioritize sessionStorage for multi-tab isolation
        if (tokenName === 'developer_accessToken' || tokenName === 'viewer_accessToken' || tokenName === 'admin_accessToken') {
            return sessionStorage.getItem(tokenName) || cookieToken;
        }

        return cookieToken;
    }
    return null;
};

const getHeaders = () => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        let errorMessage = 'An error occurred';
        let lockoutUntil: string | undefined = undefined;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            lockoutUntil = errorData.lockoutUntil;
        } catch (e) {
            errorMessage = response.statusText || errorMessage;
        }

        if (response.status === 401 && errorMessage === 'SESSION_EXPIRED') {
            if (typeof window !== 'undefined') {
                sessionStorage.clear();
                document.cookie.split(";").forEach((c) => {
                  document.cookie = c
                    .replace(/^ +/, "")
                    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
                window.location.href = '/?expired=true';
            }
        }

        const err = new Error(errorMessage) as any;
        err.lockoutUntil = lockoutUntil;
        throw err;
    }
    
    // Check if the response has content
    const text = await response.text();
    return text ? JSON.parse(text) : null;
};

export const api = {
    get: async (endpoint: string): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    post: async (endpoint: string, data: any): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    patch: async (endpoint: string, data: any): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    delete: async (endpoint: string): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },
    
    download: async (endpoint: string, filename: string): Promise<void> => {
        // Use native browser download to avoid fetch/blob buffering and CORS stream issues
        const a = document.createElement('a');
        a.href = `${API_BASE_URL}${endpoint}`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup after a short delay
        setTimeout(() => {
            document.body.removeChild(a);
        }, 100);
    }
};
