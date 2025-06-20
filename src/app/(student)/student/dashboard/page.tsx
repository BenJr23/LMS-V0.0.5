'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Users, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getEnrolledSubjects, updateEnrollmentStatus } from '@/app/_actions/enrolledsubjects';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { getImageUrl } from '@/app/_actions/uploadIcon';

interface EnrolledSubject {
  id: string;
  hasNewContent: boolean;
  subjectInstance: {
    id: string;
    teacherName: string;
    grade: string;
    section: string;
    enrollment: number;
    icon: string;
    subject: {
      id: string;
      name: string;
      code: string;
    };
    requirements: Array<{
      id: string;
      title: string;
      type: string;
      requirementNumber: number;
    }>;
  };
  submissions: Array<{
    id: string;
    requirementId: string;
    status: number;
    requirement: {
      id: string;
      title: string;
    };
  }>;
  createdAt: Date;
}

export default function DashboardPage() {
  const router = useRouter();
  const [enrolledSubjects, setEnrolledSubjects] = useState<EnrolledSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [isImageLoading, setIsImageLoading] = useState(true);

  // Function to calculate progress percentage
  const calculateProgress = (enrollment: EnrolledSubject) => {
    const totalRequirements = enrollment.subjectInstance.requirements.length;
    if (totalRequirements === 0) return 0;
    
    // Count completed submissions (status === 1 means complete)
    const completedSubmissions = enrollment.submissions.filter(sub => sub.status === 1).length;
    
    return Math.round((completedSubmissions / totalRequirements) * 100);
  };

  useEffect(() => {
    const fetchEnrolledSubjects = async () => {
      try {
        const response = await getEnrolledSubjects();
        if (response.success && response.data) {
          setEnrolledSubjects(response.data as EnrolledSubject[]);
        } else {
          toast.error(response.error || 'Failed to fetch enrolled subjects');
        }
      } catch (error) {
        console.error('Error fetching enrolled subjects:', error);
        toast.error('Failed to fetch enrolled subjects');
      } finally {
        setLoading(false);
      }
    };

    fetchEnrolledSubjects();
  }, []);

  // Add useEffect to handle image URLs
  useEffect(() => {
    const updateImageUrls = async () => {
      setIsImageLoading(true);
      try {
        const newUrls: Record<string, string> = {};
        for (const enrollment of enrolledSubjects) {
          if (enrollment.subjectInstance.icon && !imageUrls[enrollment.subjectInstance.icon]) {
            try {
              const url = await getImageUrl(enrollment.subjectInstance.icon);
              if (url) {
                newUrls[enrollment.subjectInstance.icon] = url;
              }
            } catch (error) {
              console.error(`Failed to load image for ${enrollment.subjectInstance.subject.name}:`, error);
            }
          }
        }
        if (Object.keys(newUrls).length > 0) {
          setImageUrls(prev => ({ ...prev, ...newUrls }));
        }
      } catch (error) {
        console.error('Failed to update image URLs:', error);
      } finally {
        setIsImageLoading(false);
      }
    };

    updateImageUrls();
  }, [enrolledSubjects, imageUrls]);

  const handleSubjectClick = async (enrollment: EnrolledSubject) => {
    try {
      // Update the enrollment status
      const result = await updateEnrollmentStatus(enrollment.id);
      if (result.success) {
        // Update the local state to remove the notification dot
        setEnrolledSubjects(prev => 
          prev.map(e => 
            e.id === enrollment.id 
              ? { ...e, hasNewContent: false }
              : e
          )
        );
      }
      // Navigate to the subject page
      router.push(`/student/dashboard/${enrollment.subjectInstance.id}`);
    } catch (error) {
      console.error('Error updating enrollment status:', error);
      // Still navigate even if the status update fails
      router.push(`/student/dashboard/${enrollment.subjectInstance.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <Toaster position="top-right" />
      {/* Enrolled Courses Section */}
      <section>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#800000]">My Courses</h2>
            <p className="text-gray-600">View and manage your enrolled courses.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {enrolledSubjects.map((enrollment) => {
            const instance = enrollment.subjectInstance;
            if (!instance || !instance.subject) return null;
            
            return (
              <div
                key={enrollment.id}
                onClick={() => handleSubjectClick(enrollment)}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] transform cursor-pointer relative"
              >
                {enrollment.hasNewContent && (
                  <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse z-10"></div>
                )}
                <div className="relative h-40 w-full">
                  {isImageLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#800000]"></div>
                    </div>
                  ) : (
                    <Image
                      src={imageUrls[instance.icon] || '/assets/depositphotos_121012076-stock-illustration-blank-photo-icon.jpg'}
                      alt={instance.subject.name}
                      fill
                      className="object-cover"
                      unoptimized
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/assets/depositphotos_121012076-stock-illustration-blank-photo-icon.jpg';
                      }}
                    />
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="bg-pink-100 text-[#800000] px-2 py-0.5 rounded font-medium">
                      {instance.subject.code}
                    </span>
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-medium">
                      Section {instance.section}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900">
                    {instance.subject.name}
                  </h3>
                  <p className="text-sm text-gray-600">Grade {instance.grade}</p>
                  <p className="text-sm text-gray-600">Teacher: {instance.teacherName}</p>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-700 gap-1">
                      <Users className="w-4 h-4 text-[#800000]" />
                      {instance.enrollment === 1 ? 'Active' : 'Inactive'}
                    </div>
                    <div className="flex items-center text-gray-700 gap-1">
                      <Clock className="w-4 h-4 text-[#800000]" />
                      Enrolled {new Date(enrollment.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Course Progress</span>
                      <span>{calculateProgress(enrollment)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-[#800000] h-2 rounded-full" style={{ width: `${calculateProgress(enrollment)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {enrolledSubjects.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              You haven&apos;t enrolled in any courses yet. Visit the Subjects page to enroll in courses.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
