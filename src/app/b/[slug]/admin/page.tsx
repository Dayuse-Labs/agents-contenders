import { currentUser } from '@/interfaces/http/session';
import { AdminPanel } from './admin-panel';

export const runtime = 'nodejs';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await currentUser();
  if (!user?.isAdmin) {
    return <main style={{ padding: 40, color: 'var(--muted)' }}>Réservé aux administrateurs.</main>;
  }
  return <AdminPanel slug={slug} />;
}
