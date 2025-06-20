'use server';

import { PrismaClient } from '../../generated/prisma';
import { currentUser } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

export const getEnrolledSubjects = async () => {
  try {
    const user = await currentUser();

    if (!user || !user.id) {
      return {
        success: false,
        error: 'User not authenticated.'
      };
    }

    const enrolledSubjects = await prisma.enrolment.findMany({
      where: {
        studentId: user.id,
      },
      include: {
        subjectInstance: {
          include: {
            subject: true,
            requirements: {
              orderBy: [
                { type: 'asc' },
                { requirementNumber: 'asc' }
              ]
            }
          },
        },
        submissions: {
          include: {
            requirement: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: enrolledSubjects
    };
  } catch (error) {
    console.error("[GET_ENROLLED_SUBJECTS]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch enrolled subjects'
    };
  }
};

export async function updateEnrollmentStatus(enrollmentId: string) {
  try {
    const user = await currentUser();

    if (!user || !user.id) {
      throw new Error('User not authenticated.');
    }

    // Update the enrollment status
    const updatedEnrollment = await prisma.enrolment.update({
      where: {
        id: enrollmentId,
        studentId: user.id
      },
      data: {
        hasNewContent: false
      }
    });

    return {
      success: true,
      data: updatedEnrollment
    };
  } catch (error) {
    console.error('Error updating enrollment status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update enrollment status'
    };
  }
} 