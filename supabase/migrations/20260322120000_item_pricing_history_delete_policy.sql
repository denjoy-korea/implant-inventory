-- item_pricing_history: 같은 hospital_id 소속 사용자만 삭제 가능
CREATE POLICY "item_pricing_history_delete" ON public.item_pricing_history
  FOR DELETE TO authenticated
  USING (
    hospital_id = (
      SELECT hospital_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );
