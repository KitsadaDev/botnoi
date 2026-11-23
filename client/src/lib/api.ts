import axios from 'axios'
import { TOKEN_KEY } from './storageKeys'

// ===========================
// Axios instance หลักของแอป
// ทุก request ไปที่ /api (Vite proxy → localhost:4000)
// ===========================
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ===========================
// Request interceptor: แนบ JWT token อัตโนมัติ
// ===========================
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ===========================
// Response interceptor: จัดการ 401 → redirect ไป /login
// ===========================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      // redirect to login only if accessing protected workspace/admin paths
      if (
        (window.location.pathname.startsWith('/admin') ||
          window.location.pathname.startsWith('/projects') ||
          error.config?.url?.includes('/admin') ||
          error.config?.url?.includes('/projects')) &&
        !window.location.pathname.includes('/login')
      ) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
