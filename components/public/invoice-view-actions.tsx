"use client"

import { DownloadIcon, PrinterIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

function InvoiceViewActions({ publicId }: { publicId: string }) {
  return (
    <div className="flex gap-2 print:hidden">
      {/* <Button variant="outline" onClick={() => window.print()}>
        <PrinterIcon />
        Print
      </Button> */}
      <Button
        render={
          <a href={`/api/invoices/${publicId}/pdf`} target="_blank" rel="noreferrer" />
        }
      >
        <DownloadIcon />
        Download PDF
      </Button>
    </div>
  )
}

export { InvoiceViewActions }
