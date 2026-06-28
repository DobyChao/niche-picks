'use client';

import SyncPanel from '@/components/sync/SyncPanel';
import ChangeList from '@/components/sync/ChangeList';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';

export default function SyncPage() {
  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 min-h-full lg:h-full flex flex-col gap-5">
      <PageHeader
        title="同步管理"
        description="处理本机变更、拉取云端数据、查看待审核状态"
      />

      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)] lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        <div className="lg:overflow-y-auto">
          <SyncPanel />
        </div>

        <Card className="min-w-0 overflow-hidden flex flex-col lg:min-h-0">
          <CardHeader
            title="变更队列"
            description="草稿可回退，已推送内容需等待管理员审核"
          />
          <CardBody className="flex-1 overflow-y-auto">
            <ChangeList />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
