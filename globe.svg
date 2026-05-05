import "./globals.css";
import { ThemeProvider } from "./context/ThemeContext";
import { SidebarProvider } from "./components/Sidebar";

export const metadata = {
  title: "Advogue AI - Lehr Insurance",
  description: "Beautiful and modern analytics dashboard for business intelligence",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <SidebarProvider>
            {children}
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
