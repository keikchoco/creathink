import "server-only"
import { clerkClient } from "@clerk/nextjs/server"

import type { ClerkPublicMetadata, Permissions } from "@/types/permissions"

export interface AdminListItem {
  id: string
  name: string
  email: string
  imageUrl: string
  role: ClerkPublicMetadata["role"]
  isSuperAdmin: boolean
  permissions: Permissions
  banned: boolean
  createdAt: Date
  lastActiveAt: Date | null
}

export interface AdminListResult {
  admins: AdminListItem[]
  totalCount: number
}

interface ListAdminsOptions {
  limit?: number
  offset?: number
}

interface InviteAdminInput {
  email: string
  role: "admin" | "super_admin"
  isSuperAdmin: boolean
  permissions: Permissions
}

interface UpdateAdminMetadataInput {
  role: "admin" | "super_admin"
  isSuperAdmin: boolean
  permissions: Permissions
}

function toAdminListItem(user: {
  id: string
  firstName: string | null
  lastName: string | null
  imageUrl: string
  banned: boolean
  createdAt: number
  lastActiveAt: number | null
  publicMetadata: ClerkPublicMetadata
  emailAddresses: { id: string; emailAddress: string }[]
  primaryEmailAddressId: string | null
}): AdminListItem {
  const primaryEmail =
    user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId) ??
    user.emailAddresses[0]

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed"

  return {
    id: user.id,
    name,
    email: primaryEmail?.emailAddress ?? "",
    imageUrl: user.imageUrl,
    role: user.publicMetadata.role,
    isSuperAdmin: user.publicMetadata.isSuperAdmin === true,
    permissions: user.publicMetadata.permissions ?? {},
    banned: user.banned,
    createdAt: new Date(user.createdAt),
    lastActiveAt: user.lastActiveAt ? new Date(user.lastActiveAt) : null,
  }
}

export async function listAdmins({ limit = 20, offset = 0 }: ListAdminsOptions = {}): Promise<AdminListResult> {
  const client = await clerkClient()
  const { data, totalCount } = await client.users.getUserList({ limit, offset, orderBy: "-created_at" })

  return {
    admins: data.map((user) =>
      toAdminListItem(user as unknown as Parameters<typeof toAdminListItem>[0]),
    ),
    totalCount,
  }
}

export async function inviteAdmin(input: InviteAdminInput): Promise<void> {
  const client = await clerkClient()

  await client.invitations.createInvitation({
    emailAddress: input.email,
    publicMetadata: {
      role: input.role,
      isSuperAdmin: input.isSuperAdmin,
      permissions: input.permissions,
    },
  })
}

export async function updateAdminMetadata(
  userId: string,
  input: UpdateAdminMetadataInput,
): Promise<void> {
  const client = await clerkClient()

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      role: input.role,
      isSuperAdmin: input.isSuperAdmin,
      permissions: input.permissions,
    },
  })
}

export async function getUserNames(
  userIds: string[],
): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(userIds)].filter(Boolean)
  if (uniqueIds.length === 0) return {}

  try {
    const client = await clerkClient()
    const { data } = await client.users.getUserList({
      userId: uniqueIds,
      limit: uniqueIds.length,
    })

    const names: Record<string, string> = {}
    for (const user of data) {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ")
      const email = user.emailAddresses[0]?.emailAddress
      names[user.id] = fullName || email || user.id
    }
    return names
  } catch {
    return {}
  }
}

export async function getAdminMetadata(userId: string): Promise<ClerkPublicMetadata> {
  const client = await clerkClient()
  const user = await client.users.getUser(userId)

  return user.publicMetadata as ClerkPublicMetadata
}
