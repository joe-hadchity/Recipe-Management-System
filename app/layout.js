import "./globals.css";
import AppNav from "@/components/layout/AppNav";

export const metadata = {
  title: "Recipe AI Manager",
  description: "Multi-user recipe management and nutrition tracking app"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="px-2 py-3 sm:px-4 sm:py-5">
        <main className="app-shell mx-auto min-h-[calc(100vh-1.5rem)] max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
          <AppNav />
          <div className="mt-5">{children}</div>
        </main>
      </body>
    </html>
  );
}
