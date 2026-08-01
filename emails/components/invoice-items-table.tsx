import { Column, Row, Section, Text } from "@react-email/components"

interface InvoiceEmailItem {
  name: string
  description?: string
  quantity: number
  unitPrice: string
  lineTotal: string
}

interface InvoiceItemsTableProps {
  items: InvoiceEmailItem[]
}

function InvoiceItemsTable({ items }: InvoiceItemsTableProps) {
  return (
    <Section className="mb-6 rounded-xl border border-solid border-[#e4e4e7] bg-[#fafafa] px-5 py-4">
      <Text className="m-0 mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]">
        What you&apos;re paying for
      </Text>

      <Row className="mb-2 border-0 border-b border-solid border-[#e4e4e7] pb-2">
        <Column className="align-top">
          <Text className="m-0 text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]">
            Item
          </Text>
        </Column>
        <Column className="w-[50px] align-top">
          <Text className="m-0 text-right text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]">
            Qty
          </Text>
        </Column>
        <Column className="w-[110px] align-top">
          <Text className="m-0 text-right text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]">
            Total
          </Text>
        </Column>
      </Row>

      {items.map((item, index) => (
        <Row
          key={index}
          className={
            index === items.length - 1
              ? ""
              : "mb-2 border-0 border-b border-solid border-[#e4e4e7] pb-2"
          }
        >
          <Column className="align-top">
            <Text className="m-0 text-[13px] text-[#3f3f46]">{item.name}</Text>
            {item.description && (
              <Text className="m-0 mt-0.5 text-[12px] text-[#a1a1aa]">
                {item.description}
              </Text>
            )}
          </Column>
          <Column className="w-[50px] align-top">
            <Text className="m-0 text-right text-[13px] text-[#3f3f46]">
              {item.quantity}
            </Text>
          </Column>
          <Column className="w-[110px] align-top">
            <Text className="m-0 text-right text-[13px] text-[#3f3f46]">
              {item.lineTotal}
            </Text>
          </Column>
        </Row>
      ))}
    </Section>
  )
}

export { InvoiceItemsTable }
