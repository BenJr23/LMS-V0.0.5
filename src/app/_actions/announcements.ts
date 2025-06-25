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
    // Create announcement and update enrolments in a transaction
    const announcement = await prisma.$transaction(async (tx) => {
      const newAnnouncement = await tx.announcement.create({
        data: {
          subjectInstanceId,
          userId: user.id,
          title: title,
          content: content
        }
      });
      await tx.enrolment.updateMany({
        where: { subjectInstanceId },
        data: { hasNewContent: true }
      });
      return newAnnouncement;
    });
    return { success: true, data: announcement };
  } catch (error) {
    console.error('Error creating announcement:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create announcement' };
  }
}

export async function editAnnouncement({
  announcementId,
  title,
  content
}: {
  announcementId: string;
  title: string;
  content: string;
}) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    if (!announcementId || !title || !content) {
      return { success: false, error: 'All fields are required' };
    }
    // Check ownership and get subjectInstanceId
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId }
    });
    if (!announcement || announcement.userId !== user.id) {
      return { success: false, error: 'Announcement not found or no permission' };
    }
    // Update announcement and enrolments in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const updatedAnnouncement = await tx.announcement.update({
        where: { id: announcementId },
        data: { title, content }
      });
      await tx.enrolment.updateMany({
        where: { subjectInstanceId: announcement.subjectInstanceId },
        data: { hasNewContent: true }
      });
      return updatedAnnouncement;
    });
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error editing announcement:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to edit announcement' };
  }
}

export async function deleteAnnouncement(announcementId: string) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    // Check ownership
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId }
    });
    if (!announcement || announcement.userId !== user.id) {
      return { success: false, error: 'Announcement not found or no permission' };
    }
    await prisma.announcement.delete({ where: { id: announcementId } });
    return { success: true };
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete announcement' };
  }
}
