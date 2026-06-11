-- Remove anonymous INSERT on job_photos: the table is not used by client code,
-- and the policy let anyone attach photo rows to any known job_id.
DROP POLICY IF EXISTS "Customers upload photos to existing jobs" ON public.job_photos;

-- Restrict listing of customer-uploads bucket to admins. The bucket stays public
-- so already-served image URLs continue to work, but unauthenticated clients can
-- no longer enumerate every uploaded file.
DROP POLICY IF EXISTS "Anyone can read customer photos" ON storage.objects;
CREATE POLICY "Admins read customer photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'customer-uploads'
  AND public.has_role(auth.uid(), 'admin')
);