-- Policies de Storage para el bucket "audios"
-- Restringe acceso a la carpeta users/<uid>/...

CREATE POLICY "Users can read own audios"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'audios'
  AND split_part(name, '/', 1) = 'users'
  AND split_part(name, '/', 2) = auth.uid()::text
);

CREATE POLICY "Users can upload own audios"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audios'
  AND split_part(name, '/', 1) = 'users'
  AND split_part(name, '/', 2) = auth.uid()::text
);

CREATE POLICY "Users can update own audios"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'audios'
  AND split_part(name, '/', 1) = 'users'
  AND split_part(name, '/', 2) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'audios'
  AND split_part(name, '/', 1) = 'users'
  AND split_part(name, '/', 2) = auth.uid()::text
);

CREATE POLICY "Users can delete own audios"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'audios'
  AND split_part(name, '/', 1) = 'users'
  AND split_part(name, '/', 2) = auth.uid()::text
);
