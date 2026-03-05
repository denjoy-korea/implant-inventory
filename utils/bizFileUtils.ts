import { DbHospitalRow } from '../components/system-admin/systemAdminDomain';

export const getBizFileName = (hospital: DbHospitalRow): string => {
    const fallback = `${hospital.name}-증빙파일`;
    if (!hospital.biz_file_url) return fallback;
    try {
        const url = new URL(hospital.biz_file_url);
        const last = decodeURIComponent(url.pathname.split('/').pop() || '').trim();
        return last || fallback;
    } catch {
        const raw = String(hospital.biz_file_url || '').trim().replace(/^\/+/, '');
        if (!raw) return fallback;
        const tail = decodeURIComponent(raw.split('/').pop() || '').trim();
        return tail || fallback;
    }
};

export const isSupabaseStorageObjectUrl = (value: string): boolean =>
    /\/storage\/v1\/object\//i.test(value);

export const parseBizFileRef = (rawRef: string): { bucket: string; objectPath: string } | null => {
    const raw = rawRef.trim();
    if (!raw) return null;
    try {
        const url = new URL(raw);
        const parts = url.pathname.split('/').filter(Boolean).map((p) => decodeURIComponent(p));
        const objectIdx = parts.findIndex((p) => p === 'object');
        if (objectIdx >= 0 && parts.length >= objectIdx + 4) {
            const bucket = parts[objectIdx + 2];
            const objectPath = parts.slice(objectIdx + 3).join('/');
            if (bucket && objectPath) return { bucket, objectPath };
        }
        return null;
    } catch {
        // continue
    }
    const cleaned = raw.replace(/^\/+/, '');
    const seg = cleaned.split('/').filter(Boolean).map((p) => decodeURIComponent(p));
    if (seg.length >= 2) return { bucket: seg[0], objectPath: seg.slice(1).join('/') };
    if (seg.length === 1) return { bucket: 'biz-documents', objectPath: seg[0] };
    return null;
};
