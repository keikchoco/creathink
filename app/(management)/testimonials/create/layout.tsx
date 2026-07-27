import { Suspense } from "react";

export default async function ManagementLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
        {children}
    </Suspense>
  )
}
