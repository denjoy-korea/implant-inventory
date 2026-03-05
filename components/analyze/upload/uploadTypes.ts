export interface UploadRequirement {
  label: string;
  detail?: string;
  status: 'done' | 'pending' | 'warning';
}
