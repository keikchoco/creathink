import { readFile } from "fs/promises"
import path from "path"

import { NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"

import { invoiceService, effectiveStatus } from "@/services/invoice.service"
import { InvoicePdf } from "@/lib/invoice-pdf"

async function loadLogo(): Promise<string | undefined> {
  try {
    const file = await readFile(
      path.join(process.cwd(), "public", "assets", "Creathink_Name_logo_-_PNG.png")
    )
    return `data:image/png;base64,${file.toString("base64")}`
  } catch {
    return undefined
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params
    const invoice = await invoiceService.getByPublicId(publicId)

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Invoice not found" } },
        { status: 404 }
      )
    }

    const buffer = await renderToBuffer(
      InvoicePdf({
        logoSrc: await loadLogo(),
        invoice: {
          invoiceNumber: invoice.invoiceNumber,
          customer: invoice.customer,
          items: invoice.items,
          currency: invoice.currency,
          discountType: invoice.discountType,
          discountValue: invoice.discountValue,
          subtotal: invoice.subtotal,
          discountAmount: invoice.discountAmount,
          total: invoice.total,
          totalPaid: invoice.totalPaid,
          dueDate: invoice.dueDate,
          createdAt: invoice.createdAt,
          paidAt: invoice.paidAt,
          notes: invoice.notes,
          status: effectiveStatus(invoice),
        },
      })
    )

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[invoice-pdf] Failed to generate PDF:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Unable to generate PDF" } },
      { status: 500 }
    )
  }
}
