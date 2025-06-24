'use server';

import { PrismaClient } from '../../generated/prisma';
import { currentUser } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

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
