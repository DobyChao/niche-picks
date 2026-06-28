import type { Metadata } from 'next';
import { friendLinks } from '@/lib/data/friends';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: '友链 — 小众点评',
  description: '小众点评的友情链接',
};

export default function FriendsPage() {
  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 min-h-full lg:h-full flex flex-col gap-5">
      <PageHeader title="友情链接" description="感谢这些朋友的支持与帮助" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {friendLinks.map((friend) => (
          <a key={friend.url} href={friend.url} target="_blank" rel="noopener noreferrer">
            <Card
              padding="md"
              className="flex items-center gap-3 h-full hover:shadow-[var(--shadow-elevated)] hover:border-primary/30 transition-all group"
            >
              {friend.avatar ? (
                <img src={friend.avatar} alt={friend.name} className="w-10 h-10 rounded-[var(--radius-button)] object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-[var(--radius-button)] bg-primary-muted text-primary flex items-center justify-center text-sm font-bold shrink-0">
                  {friend.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                  {friend.name}
                </h2>
                {friend.description && (
                  <p className="text-xs text-muted mt-0.5 truncate">{friend.description}</p>
                )}
              </div>
              {friend.tags && friend.tags.length > 0 && (
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  {friend.tags.map((tag) => (
                    <Badge key={tag} variant="muted">{tag}</Badge>
                  ))}
                </div>
              )}
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
