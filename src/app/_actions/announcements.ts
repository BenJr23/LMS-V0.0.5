'use server';

import { PrismaClient } from '../../generated/prisma';
import { currentUser } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

export async function createAnnouncement({
  subjectInstanceId,
  title,
  content
}: {
  subjectInstanceId: string;
  title: string;
  content: string;
}) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    if (!subjectInstanceId || !title.trim() || !content.trim()) {
      return { success: false, error: 'All fields are required' };
    }
    const announcement = await prisma.announcement.create({
      data: {
        subjectInstanceId,
        userId: user.id,
        title: title.trim(),
        content: content.trim()
      }
    });
    return { success: true, data: announcement };
  } catch (error) {
    console.error('Error creating announcement:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create announcement' };
  }
}
