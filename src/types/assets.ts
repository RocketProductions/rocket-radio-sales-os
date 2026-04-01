export interface UploadedAsset {
  id: string;
  session_id: string | null;
  brand_kit_id: string | null;
  tenant_id: string | null;
  owner_type: 'client' | 'agency';
  file_name: string;
  original_name: string;
  file_type: string;
  category: 'logo' | 'photo' | 'document' | 'note';
  storage_path: string | null;
  file_size: number;
  note_content: string | null;
  tags: string[];
  created_at: string;
  signedUrl?: string | null; // generated server-side
  // joined from campaign_sessions (admin view only)
  business_name?: string | null;
}
