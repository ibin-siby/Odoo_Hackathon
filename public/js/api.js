// Brightloop Unified API Client
const api = {
    getToken() {
        return sessionStorage.getItem('token');
    },

    getUser() {
        try {
            return JSON.parse(sessionStorage.getItem('user') || '{}');
        } catch (e) {
            return {};
        }
    },

    setAuth(token, user) {
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('user', JSON.stringify(user));
    },

    clearAuth() {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
    },

    async request(endpoint, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

        try {
            const response = await fetch(url, config);

            if (response.status === 401) {
                // If not currently on login, signup or reset, redirect
                const path = window.location.pathname;
                if (!path.includes('login') && !path.includes('signup') && !path.includes('forgot') && !path.includes('reset')) {
                    this.clearAuth();
                    window.location.href = 'login.html';
                }
            }

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const message = data.message || `Request failed with status ${response.status}`;
                const err = new Error(message);
                err.status = response.status;
                err.data = data;
                throw err;
            }

            return data;
        } catch (err) {
            console.error(`API Error [${options.method || 'GET'} ${url}]:`, err.message);
            throw err;
        }
    },

    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    post(endpoint, body) {
        return this.request(endpoint, { method: 'POST', body });
    },

    put(endpoint, body) {
        return this.request(endpoint, { method: 'PUT', body });
    },

    patch(endpoint, body) {
        return this.request(endpoint, { method: 'PATCH', body });
    },

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

window.api = api;

