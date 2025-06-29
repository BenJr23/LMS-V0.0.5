'use server';

import { createClient } from '@supabase/supabase-js';
import { currentUser } from '@clerk/nextjs/server';

// Create a Supabase client with service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function uploadRequirementFile(file: File) {
  try {
    const user = await currentUser();

    if (!user || !user.id) {
      throw new Error('User not authenticated.');
    }

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get file extension
    const fileExtension = file.name.split('.').pop() || '';
    
    // Create a unique filename while preserving the original name
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const originalName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    const fileName = `${originalName}_${timestamp}_${randomString}.${fileExtension}`;

    const filePath = `requirements/${fileName}`;

    console.log('Attempting to upload file:', {
      path: filePath,
      type: file.type,
      size: file.size,
      originalName: file.name
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data, error } = await supabaseAdmin.storage
      .from('lms')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }

    // Get the public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('lms')
      .getPublicUrl(filePath);

    console.log('File uploaded successfully:', {
      path: filePath,
      publicUrl
    });

    return {
      success: true,
      path: filePath,
      publicUrl
    };
  } catch (error) {
    console.error('Error in uploadRequirementFile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file'
    };
  }
} 