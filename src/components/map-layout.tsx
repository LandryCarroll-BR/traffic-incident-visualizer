export function MapLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="flex flex-col p-4 pt-0">{children}</div>;
}
