import { VotePanel } from './vote-panel';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <VotePanel slug={slug} />;
}
