import { ThemeToggle } from "@/components/theme-toggle";

export default function PageLayout({
  children,
  menu,
}: Readonly<{
  children: React.ReactNode;
  menu?: React.ReactNode;
}>) {
  return (
    <div>
      <header>
        <div className="bg-background w-full p-4 h-16 flex items-center gap-8">
          <div className="text-2xl font-bold flex items-center gap-3 text-foreground">
            <div className="bg-primary rounded-full size-7 -mb-0.5" />
            Orlando Waze Alerts
          </div>

          {menu}

          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
