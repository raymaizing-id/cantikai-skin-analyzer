// API Service - Handles all backend API calls
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const getStoredAuthToken = () => localStorage.getItem('cantik_auth_token');
const getStoredAdminToken = () => localStorage.getItem('cantik_admin_token');
const getStoredAdminCsrfToken = () => localStorage.getItem('cantik_admin_csrf_token');
const UNSAFE_HTTP_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ADMIN_DATA_CHANGED_EVENT = 'cantik:admin-data-changed';

class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    resolveMediaUrl(value) {
        const source = String(value || '').trim();
        if (!source) return '';
        if (source.startsWith('http://') || source.startsWith('https://') || source.startsWith('data:')) {
            return source;
        }
        if (source.startsWith('/')) {
            return `${this.baseURL}${source}`;
        }
        return `${this.baseURL}/${source}`;
    }

    // Helper method for API calls
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const isAdminRequest = endpoint.startsWith('/api/v2/admin');
        const method = String(options.method || 'GET').toUpperCase();
        const token = isAdminRequest
            ? (getStoredAdminToken() || getStoredAuthToken())
            : getStoredAuthToken();
        const shouldAttachAdminCsrf = isAdminRequest && UNSAFE_HTTP_METHODS.has(method);
        const adminCsrfToken = shouldAttachAdminCsrf ? getStoredAdminCsrfToken() : null;
        const config = {
            ...options,
            method,
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(adminCsrfToken ? { 'x-admin-csrf-token': adminCsrfToken } : {}),
                ...(options.headers || {}),
            },
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const payload = await response.json().catch(() => ({ message: response.statusText }));
                const apiError = new Error(payload.message || payload.error || `HTTP ${response.status}`);
                apiError.status = response.status;
                apiError.endpoint = endpoint;
                apiError.payload = payload;
                throw apiError;
            }

            const data = await response.json();
            if (isAdminRequest && UNSAFE_HTTP_METHODS.has(method) && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent(ADMIN_DATA_CHANGED_EVENT, {
                    detail: { endpoint, method, at: Date.now() }
                }));
            }
            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // Auth endpoints
    async register(userData) {
        return this.request('/api/v2/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async login(email, password) {
        return this.request('/api/v2/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    async loginWithGoogle(credential) {
        return this.request('/api/v2/auth/google', {
            method: 'POST',
            body: JSON.stringify({ credential }),
        });
    }

    async getCurrentProfile() {
        return this.request('/api/v2/auth/me');
    }

    async getPublicSettings() {
        return this.request('/api/v2/settings/public');
    }

    // User endpoints
    async createUser(userData) {
        return this.request('/api/v2/users/create', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async getUserById(userId) {
        return this.request(`/api/v2/users/${userId}`);
    }

    async getUserByEmail(email) {
        return this.request(`/api/v2/users/email/${encodeURIComponent(email)}`);
    }

    async updateUser(userId, userData) {
        return this.request(`/api/v2/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    }

    async deleteUser(userId) {
        return this.request(`/api/v2/users/${userId}`, {
            method: 'DELETE',
        });
    }

    // Analysis endpoints
    async saveAnalysis(analysisData) {
        return this.request('/api/v2/analysis/save', {
            method: 'POST',
            body: JSON.stringify(analysisData),
        });
    }

    async getAnalysisByUserId(userId) {
        return this.request(`/api/v2/analysis/history/${userId}`);
    }

    async getAnalysisById(analysisId) {
        return this.request(`/api/v2/analysis/${analysisId}`);
    }

    async deleteAnalysis(analysisId) {
        return this.request(`/api/v2/analysis/${analysisId}`, {
            method: 'DELETE',
        });
    }

    async deleteAllAnalysesByUserId(userId) {
        return this.request(`/api/v2/analysis/user/${userId}`, {
            method: 'DELETE',
        });
    }

    // Product endpoints
    async getProducts() {
        return this.request('/api/v2/products');
    }

    async getProductById(productId) {
        return this.request(`/api/v2/products/${productId}`);
    }

    // Article endpoints
    async getArticles() {
        return this.request('/api/v2/articles');
    }

    async getArticleById(articleId) {
        return this.request(`/api/v2/articles/${articleId}`);
    }

    // Banner endpoints
    async getBanners() {
        return this.request('/api/v2/banners');
    }

    // Chat endpoints
    async createChatSession(userId, title = 'New Chat') {
        return this.request('/api/v2/chat/sessions', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, title }),
        });
    }

    async getChatSessions(userId) {
        return this.request(`/api/v2/chat/sessions/${userId}`);
    }

    async getChatMessages(sessionId) {
        return this.request(`/api/v2/chat/messages/${sessionId}`);
    }

    async sendChatMessage(sessionId, role, content) {
        return this.request('/api/v2/chat/message', {
            method: 'POST',
            body: JSON.stringify({
                session_id: sessionId,
                role,
                content,
            }),
        });
    }

    async deleteChatSession(sessionId) {
        return this.request(`/api/v2/chat/sessions/${sessionId}`, {
            method: 'DELETE',
        });
    }

    // Admin endpoints
    async adminLogin(username, password) {
        return this.request('/api/v2/admin/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
    }

    async getAllUsers() {
        return this.request('/api/v2/admin/users');
    }

    async createAdminUser(userData) {
        return this.request('/api/v2/admin/users', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async updateAdminUser(userId, userData) {
        return this.request(`/api/v2/admin/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    }

    async deleteAdminUser(userId) {
        return this.request(`/api/v2/admin/users/${userId}`, {
            method: 'DELETE',
        });
    }

    async getAllAnalyses() {
        return this.request('/api/v2/admin/analyses');
    }

    async getAdminAnalysisById(analysisId) {
        return this.request(`/api/v2/admin/analyses/${analysisId}`);
    }

    async deleteAdminAnalysis(analysisId) {
        return this.request(`/api/v2/admin/analyses/${analysisId}`, {
            method: 'DELETE',
        });
    }

    async getAdminDoctors() {
        return this.request('/api/v2/admin/doctors');
    }

    async createAdminDoctor(data) {
        return this.request('/api/v2/admin/doctors', { method: 'POST', body: JSON.stringify(data) });
    }

    async updateAdminDoctor(id, data) {
        return this.request(`/api/v2/admin/doctors/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    async deleteAdminDoctor(id) {
        return this.request(`/api/v2/admin/doctors/${id}`, { method: 'DELETE' });
    }

    async getAdminAppointments() {
        return this.request('/api/v2/admin/appointments');
    }

    async updateAdminAppointment(id, data) {
        return this.request(`/api/v2/admin/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    async getAdminProducts() {
        return this.request('/api/v2/admin/products');
    }

    async createProduct(productData) {
        return this.request('/api/v2/admin/products', {
            method: 'POST',
            body: JSON.stringify(productData),
        });
    }

    async updateProduct(productId, productData) {
        return this.request(`/api/v2/admin/products/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(productData),
        });
    }

    async deleteProduct(productId) {
        return this.request(`/api/v2/admin/products/${productId}`, {
            method: 'DELETE',
        });
    }

    async getAdminArticles() {
        return this.request('/api/v2/admin/articles');
    }

    async createArticle(articleData) {
        return this.request('/api/v2/admin/articles', {
            method: 'POST',
            body: JSON.stringify(articleData),
        });
    }

    async updateArticle(articleId, articleData) {
        return this.request(`/api/v2/admin/articles/${articleId}`, {
            method: 'PUT',
            body: JSON.stringify(articleData),
        });
    }

    async deleteArticle(articleId) {
        return this.request(`/api/v2/admin/articles/${articleId}`, {
            method: 'DELETE',
        });
    }

    async getAdminBanners() {
        return this.request('/api/v2/admin/banners');
    }

    async createBanner(bannerData) {
        return this.request('/api/v2/admin/banners', {
            method: 'POST',
            body: JSON.stringify(bannerData),
        });
    }

    async updateBanner(bannerId, bannerData) {
        return this.request(`/api/v2/admin/banners/${bannerId}`, {
            method: 'PUT',
            body: JSON.stringify(bannerData),
        });
    }

    async deleteBanner(bannerId) {
        return this.request(`/api/v2/admin/banners/${bannerId}`, {
            method: 'DELETE',
        });
    }

    async getAdminChatSessions(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/api/v2/admin/chat-sessions${query ? `?${query}` : ''}`);
    }

    async getAdminChatSessionDetail(sessionId) {
        return this.request(`/api/v2/admin/chat-sessions/${sessionId}`);
    }

    async updateAdminChatSession(sessionId, payload) {
        return this.request(`/api/v2/admin/chat-sessions/${sessionId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }

    async deleteAdminChatSession(sessionId) {
        return this.request(`/api/v2/admin/chat-sessions/${sessionId}`, {
            method: 'DELETE',
        });
    }

    async getAdminKioskSessions(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/api/v2/admin/kiosk/sessions${query ? `?${query}` : ''}`);
    }

    async getAdminKioskSessionDetail(sessionId) {
        return this.request(`/api/v2/admin/kiosk/sessions/${sessionId}`);
    }

    async deleteAdminKioskSession(sessionId) {
        return this.request(`/api/v2/admin/kiosk/sessions/${sessionId}`, {
            method: 'DELETE',
        });
    }

    async getAdminSettings(category) {
        const query = category ? `?category=${encodeURIComponent(category)}` : '';
        return this.request(`/api/v2/admin/settings${query}`);
    }

    async updateAdminSetting(key, payload) {
        return this.request(`/api/v2/admin/settings/${encodeURIComponent(key)}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }

    async bulkUpdateAdminSettings(settings) {
        return this.request('/api/v2/admin/settings/bulk', {
            method: 'POST',
            body: JSON.stringify({ settings }),
        });
    }

    async deleteAdminSetting(key) {
        return this.request(`/api/v2/admin/settings/${encodeURIComponent(key)}`, {
            method: 'DELETE',
        });
    }

    async getAdminDatabaseSummary() {
        return this.request('/api/v2/admin/database/summary');
    }

    async getAdminTableRows(table, params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/api/v2/admin/database/tables/${encodeURIComponent(table)}${query ? `?${query}` : ''}`);
    }

    async getAdminTableSchema(table) {
        return this.request(`/api/v2/admin/database/schema/${encodeURIComponent(table)}`);
    }
}

// Export singleton instance
const apiService = new ApiService();
export default apiService;
