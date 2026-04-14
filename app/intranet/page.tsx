// Redirige al login de la intranet
import { redirect } from 'next/navigation'
export default function IntranetRedirect() {
  redirect('/login')
}
