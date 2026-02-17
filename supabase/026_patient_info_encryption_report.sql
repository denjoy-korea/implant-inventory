-- ============================================
-- 026: patient_info 암호화 상태 리포트
-- 목적: ENCv1(ENC:) / ENCv2(ENCv2:) / 평문 분포 점검
-- ============================================

SELECT
  hospital_id,
  COUNT(*) AS total_records,
  COUNT(*) FILTER (
    WHERE patient_info IS NULL OR btrim(patient_info) = ''
  ) AS empty_records,
  COUNT(*) FILTER (
    WHERE patient_info LIKE 'ENC:%'
  ) AS enc_v1_records,
  COUNT(*) FILTER (
    WHERE patient_info LIKE 'ENCv2:%'
  ) AS enc_v2_records,
  COUNT(*) FILTER (
    WHERE patient_info IS NOT NULL
      AND btrim(patient_info) <> ''
      AND patient_info NOT LIKE 'ENC:%'
      AND patient_info NOT LIKE 'ENCv2:%'
  ) AS plain_records,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE patient_info LIKE 'ENCv2:%') / NULLIF(COUNT(*), 0),
    2
  ) AS enc_v2_ratio_percent
FROM surgery_records
GROUP BY hospital_id
ORDER BY total_records DESC, hospital_id;
