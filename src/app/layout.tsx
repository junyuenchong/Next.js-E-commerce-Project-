// app/layout.tsx

import "./globals.css"; // <-- Import TailwindCSS (or your global styles)

export const metadata = {
  title: "E-Commerce",
  description: "Simple white layout with Next.js App Router",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
