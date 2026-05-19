export type SyncStatus = 'synced' | 'pending' | 'local_modified';

export interface LocalShop {
  id: string;
  name: string;
  address: string;
  category: string;
  phone: string;
  businessHours: string;
  lng: number | null;
  lat: number | null;
  tags: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  _syncStatus: SyncStatus;
}

export interface LocalReview {
  id: string;
  shopId: string;
  author: string;
  rating: number;
  content: string;
  tags: string[];
  avgPrice: number | null;
  visitDate: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  _syncStatus: SyncStatus;
}

export interface ChangeLogItem {
  entity: 'shop' | 'review';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  snapshot: any;
  timestamp: string;
}

export interface LocalChangeLog extends ChangeLogItem {
  id?: number;
}

export interface PendingSync {
  syncId: string;
  userToken: string;
  authorName: string;
  changesPayload: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}
