import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils/errors';
import { DbHospitalRow } from '../components/system-admin/systemAdminDomain';
import { getBizFileName, isSupabaseStorageObjectUrl, parseBizFileRef } from '../utils/bizFileUtils';
import type { ToastType } from './useToast';

interface UseAdminBizFileParams {
    showToast: (message: string, type: ToastType) => void;
    setHospitals: React.Dispatch<React.SetStateAction<DbHospitalRow[]>>;
    setEditCountResetting: (v: string | null) => void;
}

export function useAdminBizFile({ showToast, setHospitals, setEditCountResetting }: UseAdminBizFileParams) {
    const resolveBizFileAccessUrl = async (hospital: DbHospitalRow): Promise<string> => {
        const rawRef = String(hospital.biz_file_url || '').trim();
        if (!rawRef) throw new Error('NO_BIZ_FILE');

        const parsed = parseBizFileRef(rawRef);
        let lastError: unknown = null;

        if (parsed) {
            const attempts: Array<{ bucket: string; objectPath: string }> = [parsed];
            const fallbackBuckets = ['biz-documents', 'biz_document', 'biz-docs'];
            fallbackBuckets.forEach((bucket) => {
                if (bucket !== parsed.bucket) attempts.push({ bucket, objectPath: parsed.objectPath });
            });
            for (const attempt of attempts) {
                const { data, error } = await supabase.storage
                    .from(attempt.bucket)
                    .createSignedUrl(attempt.objectPath, 60 * 10);
                if (!error && data?.signedUrl) return data.signedUrl;
                lastError = error;
            }
        }

        if (!parsed && /^https?:\/\//i.test(rawRef)) return rawRef;
        if (lastError) throw lastError;
        throw new Error('BIZ_FILE_RESOLVE_FAILED');
    };

    const handlePreviewBizFile = (hospital: DbHospitalRow) => {
        void (async () => {
            try {
                const url = await resolveBizFileAccessUrl(hospital);
                window.open(url, '_blank', 'noopener,noreferrer');
            } catch (error: unknown) {
                const msg = getErrorMessage(error, '');
                if (msg.toLowerCase().includes('bucket not found')) {
                    showToast('스토리지 버킷 설정이 없어 파일을 열 수 없습니다. 운영자 DB에 스토리지 마이그레이션 적용이 필요합니다.', 'error');
                    return;
                }
                if (msg === 'NO_BIZ_FILE') {
                    showToast('등록된 세금계산서/증빙 파일이 없습니다.', 'error');
                    return;
                }
                showToast('파일 미리보기에 실패했습니다.', 'error');
            }
        })();
    };

    const handleDownloadBizFile = async (hospital: DbHospitalRow) => {
        try {
            const accessUrl = await resolveBizFileAccessUrl(hospital);
            const response = await fetch(accessUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = getBizFileName(hospital);
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(objectUrl);
            showToast('파일 다운로드를 시작했습니다.', 'success');
        } catch (error: unknown) {
            const msg = getErrorMessage(error, '');
            if (msg.toLowerCase().includes('bucket not found')) {
                showToast('스토리지 버킷 설정이 없어 다운로드할 수 없습니다. 운영자 DB에 스토리지 마이그레이션 적용이 필요합니다.', 'error');
                return;
            }
            if (msg === 'NO_BIZ_FILE') {
                showToast('등록된 세금계산서/증빙 파일이 없습니다.', 'error');
                return;
            }
            if (
                hospital.biz_file_url &&
                /^https?:\/\//i.test(hospital.biz_file_url) &&
                !isSupabaseStorageObjectUrl(hospital.biz_file_url)
            ) {
                window.open(hospital.biz_file_url, '_blank', 'noopener,noreferrer');
                showToast('브라우저에서 파일을 열었습니다. 저장해 주세요.', 'info');
                return;
            }
            showToast('파일 다운로드에 실패했습니다.', 'error');
        }
    };

    const handleResetEditCount = async (hospitalId: string) => {
        setEditCountResetting(hospitalId);
        const { error } = await supabase
            .from('hospitals')
            .update({ base_stock_edit_count: 0 })
            .eq('id', hospitalId);
        if (error) {
            showToast('초기화 실패: ' + error.message, 'error');
        } else {
            setHospitals(prev => prev.map(h => h.id === hospitalId ? { ...h, base_stock_edit_count: 0 } : h));
            showToast('사용이력이 초기화됐습니다.', 'success');
        }
        setEditCountResetting(null);
    };

    return { resolveBizFileAccessUrl, handlePreviewBizFile, handleDownloadBizFile, handleResetEditCount };
}
