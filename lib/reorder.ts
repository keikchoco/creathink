import "server-only"

import { NotFoundError } from "@/lib/errors"

interface ReorderableRepository {
  findById(id: string): Promise<{ order: number } | null>
  update(id: string, data: { order: number }): Promise<unknown>
}

/**
 * Reassigns `order` values for the given ids so they persist in the given
 * sequence. The existing order values of the affected documents are reused
 * (sorted ascending) so documents outside this set keep their relative
 * position; if the existing values contain duplicates they are replaced with
 * a sequential range instead.
 */
export async function applyReorder(
  repository: ReorderableRepository,
  ids: string[]
): Promise<void> {
  const documents = await Promise.all(ids.map((id) => repository.findById(id)))

  if (documents.some((document) => document === null)) {
    throw new NotFoundError("One or more items could not be found.")
  }

  const currentOrders = documents
    .map((document) => document!.order)
    .sort((a, b) => a - b)

  const hasDuplicates = new Set(currentOrders).size !== currentOrders.length
  const assignedOrders = hasDuplicates
    ? currentOrders.map((_, index) => (currentOrders[0] ?? 0) + index)
    : currentOrders

  await Promise.all(
    ids.map((id, index) => repository.update(id, { order: assignedOrders[index] }))
  )
}
