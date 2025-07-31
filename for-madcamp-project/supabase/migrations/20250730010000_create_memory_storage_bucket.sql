-- Create memory-images storage bucket for storing memory photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'memory-images',
  'memory-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Create RLS policies for memory-images bucket
CREATE POLICY "Memory images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'memory-images');

CREATE POLICY "Authenticated users can upload memory images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'memory-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own memory images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'memory-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own memory images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'memory-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  ); 