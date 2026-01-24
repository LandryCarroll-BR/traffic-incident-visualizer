export function MapLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="h-[calc(100vh-5rem)] p-3 pt-0">{children}</div>;
}
