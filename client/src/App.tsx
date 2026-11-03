import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { ScrollProgressAndFab } from './components/InteractiveUI'
import { HomePage } from './pages/HomePage'
import { BookServicePage } from './pages/BookServicePage'
import { TrackTicketPage } from './pages/TrackTicketPage'
import { LoginPage } from './pages/LoginPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { MyTicketsPage } from './pages/MyTicketsPage'


function ScrollToTopOnNavigate() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTopOnNavigate />
        <ScrollProgressAndFab />
        <div className="min-h-screen flex flex-col bg-[#fafafa] bg-grid-light font-sans text-zinc-900 selection:bg-sky-500 selection:text-white">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/book" element={<BookServicePage />} />
              <Route path="/track" element={<TrackTicketPage />} />
              <Route path="/track/:code" element={<TrackTicketPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/my-tickets" element={<MyTicketsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}