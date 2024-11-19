// src/app/layout.js
'use client';

import { AuthProvider } from '../context/AuthContext'; // 命名导出，应使用大括号
import Header from '../components/Header';
import Footer from '../components/Footer';
import '../app/globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head />
      <body>
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}