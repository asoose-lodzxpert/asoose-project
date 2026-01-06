import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { ThemeProvider } from './provider/provider';
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Asoosee',
  description: 'Marketplace',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          
          <ToastContainer 
            position="bottom-center"
            autoClose={3000}
            hideProgressBar={true}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored" 
          />
        </ThemeProvider>
        
      </body>
    </html>
  );
}