'use server';

import { currentUser } from '@clerk/nextjs/server';
import { PrismaClient } from '../../generated/prisma';

const prisma = new PrismaClient();

type CreateSubjectInstanceInput = {
  subjectId: string;
  teacherName: string;
  grade: string;
  section: string;
  enrolmentCode: number;
  icon: string;
  enrollment: number;
};

type EditSubjectInstanceInput = {
  id: string;
  teacherName: string;
  grade: string;
  section: string;
  enrollment: number;
};

export async function getSubjectInstances() {
  try {
    const user = await currentUser();

    if (!user || !user.id) {
      throw new Error('User not authenticated.');
    }

    const subjectInstances = await prisma.subjectInstance.findMany({
      where: {
        userId: user.id
      },
      include: {
        subject: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      success: true,
      data: subjectInstances
    };
  } catch (error) {
    console.error('Error fetching subject instances:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch subject instances'
    };
  }
}

export async function createSubjectInstance(data: CreateSubjectInstanceInput) {
  try {
    const user = await currentUser();

    if (!user || !user.id) {
      throw new Error('User not authenticated.');
    }

    // Validate required fields
    if (!data.subjectId || !data.teacherName || !data.grade || !data.section || !data.enrolmentCode || !data.icon) {
      throw new Error('All fields are required.');
    }

    // Check if subject exists
    const subject = await prisma.subject.findUnique({
      where: { id: data.subjectId }
    });

    if (!subject) {
      throw new Error('Subject not found.');
    }

    // Create the subject instance
    const subjectInstance = await prisma.subjectInstance.create({
      data: {
        subjectId: data.subjectId,
        userId: user.id,
        teacherName: data.teacherName,
        grade: data.grade,
        section: data.section,
        enrolmentCode: data.enrolmentCode,
        icon: data.icon,
        enrollment: data.enrollment || 1, // Default to 1 (active) if not provided
      },
      include: {
        subject: true
      }
    });

    return { 
      success: true, 
      data: subjectInstance 
    };
  } catch (error) {
    console.error('Error creating subject instance:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create subject instance' 
    };
  }
}

export async function editSubjectInstance(data: EditSubjectInstanceInput) {
  try {
    const user = await currentUser();

    if (!user || !user.id) {
      throw new Error('User not authenticated.');
    }

    // Validate required fields
    if (!data.id || !data.teacherName || !data.grade || !data.section) {
      throw new Error('All fields are required.');
    }

    // Check if subject instance exists and belongs to the user
    const existingInstance = await prisma.subjectInstance.findUnique({
      where: {
        id: data.id,
        userId: user.id
      }
    });

    if (!existingInstance) {
      throw new Error('Subject instance not found or you do not have permission to edit it.');
    }

    // Update the subject instance
    const updatedInstance = await prisma.subjectInstance.update({
      where: {
        id: data.id,
        userId: user.id
      },
      data: {
        teacherName: data.teacherName,
        grade: data.grade,
        section: data.section,
        enrollment: data.enrollment,
      },
      include: {
        subject: true
      }
    });

    return { 
      success: true, 
      data: updatedInstance 
    };
  } catch (error) {
    console.error('Error updating subject instance:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update subject instance' 
    };
  }
}

export async function getSubjectInstance(id: string) {
  try {
    const user = await currentUser();

    if (!user || !user.id) {
      throw new Error('User not authenticated.');
    }

    const subjectInstance = await prisma.subjectInstance.findUnique({
      where: {
        id: id,
        userId: user.id
      },
      include: {
        subject: true,
        announcements: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        moduleFolders: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        uploadedContents: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!subjectInstance) {
      throw new Error('Subject instance not found.');
    }

    return subjectInstance;
  } catch (error) {
    console.error('Error fetching subject instance:', error);
    throw error;
  }
}

export async function deleteSubjectInstance(id: string) {
  try {
    const user = await currentUser();

    if (!user || !user.id) {
      throw new Error('User not authenticated.');
    }

    // First check if the subject instance exists and belongs to the user
    const subjectInstance = await prisma.subjectInstance.findUnique({
      where: {
        id: id,
        userId: user.id
      },
      include: {
        requirements: {
          include: {
            submissions: true
          }
        },
        announcements: true,
        moduleFolders: {
          include: {
            uploadedContents: true
          }
        },
        uploadedContents: true,
        enrolments: true
      }
    });

    if (!subjectInstance) {
      throw new Error('Subject instance not found or you do not have permission to delete it.');
    }

    // Delete all related records in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all submissions first (they depend on requirements and enrollments)
      for (const requirement of subjectInstance.requirements) {
        await tx.submission.deleteMany({
          where: {
            requirementId: requirement.id
          }
        });
      }

      // Delete all requirements
      await tx.requirement.deleteMany({
        where: {
          subjectInstanceId: id
        }
      });

      // Delete all uploaded contents
      await tx.uploadedContent.deleteMany({
        where: {
          subjectInstanceId: id
        }
      });

      // Delete all module folders (this will cascade delete their uploaded contents)
      await tx.moduleFolder.deleteMany({
        where: {
          subjectInstanceId: id
        }
      });

      // Delete all announcements
      await tx.announcement.deleteMany({
        where: {
          subjectInstanceId: id
        }
      });

      // Delete all enrollments
      await tx.enrolment.deleteMany({
        where: {
          subjectInstanceId: id
        }
      });

      // Finally delete the subject instance
      await tx.subjectInstance.delete({
        where: {
          id: id
        }
      });
    });

    return {
      success: true,
      message: 'Subject instance and all related data deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting subject instance:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete subject instance'
    };
  }
}

export async function getStudentSubjectInstance(id: string) {
  try {
    const user = await currentUser();

    if (!user || !user.id) {
      throw new Error('User not authenticated.');
    }

    // First get the student's enrolment for this subject instance
    const enrolment = await prisma.enrolment.findFirst({
      where: {
        subjectInstanceId: id,
        studentId: user.id
      }
    });

    if (!enrolment) {
      throw new Error('You are not enrolled in this subject.');
    }

    // Then fetch the subject instance with all related data
    const subjectInstance = await prisma.subjectInstance.findUnique({
      where: {
        id: id
      },
      include: {
        subject: true,
        announcements: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        moduleFolders: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        uploadedContents: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    return subjectInstance;
  } catch (error) {
    console.error('Error fetching student subject instance:', error);
    throw error;
  }
}
