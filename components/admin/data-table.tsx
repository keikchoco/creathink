"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowDownIcon, ArrowUpIcon, GripVerticalIcon, SearchIcon } from "lucide-react"

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface DataTableColumn<T> {
  key: string
  label: string
  sortable?: boolean
  render: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  total: number
  page: number
  limit: number
  basePath: string
  getRowId: (row: T) => string
  rowActions?: (row: T) => React.ReactNode
  searchPlaceholder?: string
  onReorder?: (orderedIds: string[]) => void | Promise<void>
}

function DataTable<T>({
  columns,
  rows,
  total,
  page,
  limit,
  basePath,
  getRowId,
  rowActions,
  searchPlaceholder = "Search...",
  onReorder,
}: DataTableProps<T>) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = React.useState(searchParams.get("q") ?? "")

  const currentSort = searchParams.get("sort") ?? ""
  const totalPages = Math.max(1, Math.ceil(total / limit))

  // Drag-and-drop reordering only makes sense in the default (order-based)
  // sequence — a column sort would make the drop position meaningless.
  const canReorder =
    !!onReorder && (currentSort === "" || currentSort === "order")

  const [orderedRows, setOrderedRows] = React.useState(rows)
  const [previousRows, setPreviousRows] = React.useState(rows)
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const dragIndexRef = React.useRef<number | null>(null)

  if (previousRows !== rows) {
    setPreviousRows(rows)
    setOrderedRows(rows)
  }

  const displayRows = canReorder ? orderedRows : rows

  function handleDragStart(event: React.DragEvent, index: number, id: string) {
    dragIndexRef.current = index
    setDraggingId(id)
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", id)
  }

  function handleDragOver(event: React.DragEvent, index: number) {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    const from = dragIndexRef.current
    if (from === null || from === index) return

    setOrderedRows((previous) => {
      const next = [...previous]
      const [moved] = next.splice(from, 1)
      next.splice(index, 0, moved)
      return next
    })
    dragIndexRef.current = index
  }

  function handleDragEnd() {
    dragIndexRef.current = null
    setDraggingId(null)

    const originalIds = rows.map(getRowId).join("|")
    const newIds = orderedRows.map(getRowId)
    if (newIds.join("|") !== originalIds) {
      onReorder?.(newIds)
    }
  }

  function buildUrl(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    return `${basePath}?${params.toString()}`
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault()
    router.push(buildUrl({ q: searchValue || null, page: null }))
  }

  function sortIndicator(key: string) {
    if (currentSort === key) return <ArrowUpIcon className="size-3" />
    if (currentSort === `-${key}`) return <ArrowDownIcon className="size-3" />
    return null
  }

  function nextSortValue(key: string) {
    if (currentSort === key) return `-${key}`
    if (currentSort === `-${key}`) return null
    return key
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearchSubmit} className="flex max-w-sm items-center gap-2">
        <Input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder={searchPlaceholder}
        />
        <Button type="submit" variant="outline" size="icon" aria-label="Search">
          <SearchIcon />
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            {canReorder && <TableHead className="w-8" aria-label="Reorder" />}
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.sortable ? (
                  <Link
                    href={buildUrl({ sort: nextSortValue(column.key), page: null })}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    {column.label}
                    {sortIndicator(column.key)}
                  </Link>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
            {rowActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayRows.map((row, index) => {
            const rowId = getRowId(row)

            return (
              <TableRow
                key={rowId}
                draggable={canReorder && draggingId === rowId}
                onDragStart={(event) => handleDragStart(event, index, rowId)}
                onDragOver={canReorder ? (event) => handleDragOver(event, index) : undefined}
                onDrop={canReorder ? (event) => event.preventDefault() : undefined}
                onDragEnd={canReorder ? handleDragEnd : undefined}
                className={cn(draggingId === rowId && "bg-accent/50")}
              >
                {canReorder && (
                  <TableCell className="w-8">
                    <button
                      type="button"
                      aria-label="Drag to reorder"
                      className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
                      onPointerDown={() => setDraggingId(rowId)}
                      onPointerUp={() => {
                        if (dragIndexRef.current === null) setDraggingId(null)
                      }}
                    >
                      <GripVerticalIcon className="size-4" />
                    </button>
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.render(row)}
                  </TableCell>
                ))}
                {rowActions && (
                  <TableCell className="flex justify-end gap-2">{rowActions(row)}</TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            {page <= 1 ? (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                render={<Link href={buildUrl({ page: String(page - 1) })} />}
              >
                Previous
              </Button>
            )}
            {page >= totalPages ? (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                render={<Link href={buildUrl({ page: String(page + 1) })} />}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export { DataTable }
