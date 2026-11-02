import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { HomePage } from './pages/HomePage'
import { BookServicePage } from './pages/BookServicePage'
import { TrackTicketPage } from './pages/TrackTicketPage'
import { LoginPage } from './pages/LoginPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900 selection:bg-sky-500 selection:text-white">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/book" element={<BookServicePage />} />
              <Route path="/track" element={<TrackTicketPage />} />
              <Route path="/track/:code" element={<TrackTicketPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
