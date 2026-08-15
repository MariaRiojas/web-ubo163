import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/intranet/page-header"
import { PersonalPanel } from "@/components/personal/personal-client"
import { Users } from "lucide-react"
import type { Permission } from "@/lib/auth/permissions"

export default async function PersonalPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const permissions = session.user.permissions as Permission[]
  const isAdmin = session.user.profileId === 'admin-001'
  const canView = isAdmin || permissions.includes('personnel.view_all') || permissions.includes('area.admin.manage')
  if (!canView) redirect("/dashboard")

  const canEdit = isAdmin || permissions.includes('personnel.edit') || permissions.includes('area.admin.manage')

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Gestión de Personal"
        description="Directorio y administración de efectivos de la compañía"
      />
      <PersonalPanel canEdit={canEdit} />
    </div>
  )
}
