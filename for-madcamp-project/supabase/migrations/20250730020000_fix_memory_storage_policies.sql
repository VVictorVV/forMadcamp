-- Fix memory storage policies to allow authenticated users to upload images
-- Drop existing policies first
DROP POLICY IF EXISTS "Memory images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload memory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own memory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own memory images" ON storage.objects;

-- Create more permissive policies for memory images
CREATE POLICY "Memory images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'memory-images');

CREATE POLICY "Authenticated users can upload memory images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'memory-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update memory images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'memory-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete memory images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'memory-images' 
    AND auth.role() = 'authenticated'
  ); 