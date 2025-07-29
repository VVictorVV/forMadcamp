-- Grant authenticated users access to the 'project-images' bucket.
-- This policy allows any authenticated user to upload files.
CREATE POLICY "Enable insert for authenticated users"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-images' AND auth.uid() = owner);

-- This policy allows authenticated users to view their own images.
CREATE POLICY "Enable read access for own images"
ON storage.objects
FOR SELECT
TO authenticated
USING (auth.uid() = owner);

-- This policy allows authenticated users to update their own images.
CREATE POLICY "Enable update for own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (auth.uid() = owner);

-- This policy allows authenticated users to delete their own images.
CREATE POLICY "Enable delete for own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (auth.uid() = owner); 