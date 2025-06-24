'use server';

import { PrismaClient } from '../../generated/prisma';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

// Create a Supabase client with service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CreateModuleFolderParams {
  subjectInstanceId: string;
  folderName: string;
}

export async function createModuleFolder({
  subjectInstanceId,
  folderName
}: CreateModuleFolderParams) {
  try {
    // Get the current authenticated user
    const user = await currentUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Validate input
    if (!subjectInstanceId || !folderName.trim()) {
      return {
        success: false,
        error: 'All fields are required'
      };
    }

    // Check if folder name already exists for this subject instance
    const existingFolder = await prisma.moduleFolder.findFirst({
      where: {
        subjectInstanceId,
        folderName: folderName.trim()
      }
    });

    if (existingFolder) {
      return {
        success: false,
        error: 'A folder with this name already exists'
      };
    }

    // Create the module folder
    const moduleFolder = await prisma.moduleFolder.create({
      data: {
        subjectInstanceId,
        userId: user.id,
        folderName: folderName.trim()
      }
    });

    return {
      success: true,
      data: moduleFolder
    };
  } catch (error) {
    console.error('Error creating module folder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create module folder'
    };
  }
}

export async function uploadModuleFile(file: File, moduleFolderId: string, fileName?: string) {
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
    const originalName = fileName || file.name.replace(/\.[^/.]+$/, ''); // Use custom name or remove extension
    const finalFileName = `${originalName}_${timestamp}_${randomString}.${fileExtension}`;

    const filePath = `modules/${moduleFolderId}/${finalFileName}`;

    console.log('Attempting to upload module file:', {
      path: filePath,
      type: file.type,
      size: file.size,
      originalName: file.name,
      moduleFolderId
    });

    const { error } = await supabaseAdmin.storage
      .from('lms')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Error uploading module file:', error);
      throw new Error('Failed to upload file');
    }

    // Get the public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('lms')
      .getPublicUrl(filePath);

    console.log('Module file uploaded successfully:', {
      path: filePath,
      publicUrl
    });

    return {
      success: true,
      path: filePath,
      publicUrl
    };
  } catch (error) {
    console.error('Error in uploadModuleFile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file'
    };
  }
}

export async function createUploadedContent(data: {
  fileName: string;
  filePath: string;
  subjectInstanceId: string;
  moduleFolderId: string;
}) {
  try {
    const user = await currentUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const uploadedContent = await prisma.uploadedContent.create({
      data: {
        fileName: data.fileName,
        filePath: data.filePath,
        subjectInstanceId: data.subjectInstanceId,
        moduleFolderId: data.moduleFolderId
      }
    });

    return {
      success: true,
      data: uploadedContent
    };
  } catch (error) {
    console.error('Error creating uploaded content:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create uploaded content'
    };
  }
}
