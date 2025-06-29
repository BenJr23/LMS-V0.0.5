'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { Users } from 'lucide-react';
import EnrolmentModal from './EnrolmentModal';
import { getActiveSubjectInstances } from '@/app/_actions/availablesubjects';
import { getImageUrl } from '@/app/_actions/uploadIcon';
import { Toaster } from 'react-hot-toast';
import { toast } from 'react-hot-toast';

interface SubjectInstance {
  id: string;
  subjectId: string;
  userId: string;
  teacherName: string;
  grade: string;
  section: string;
  enrollment: number;
  enrolmentCode: number;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
  subject: {
    id: string;
    name: string;
    code: string;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export default function SubjectsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [subjects, setSubjects] = useState<SubjectInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<SubjectInstance | null>(null);

  const gradeOptions = ['all', '7', '8', '9', '10'];

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getActiveSubjectInstances();
      if (response.success && response.data) {
        setSubjects(response.data as SubjectInstance[]);
      } else {
        toast.error(response.error || 'Failed to fetch subjects');
        setSubjects([]);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to fetch subjects');
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // Add useEffect to handle image URLs
  useEffect(() => {
    const updateImageUrls = async () => {
      setIsImageLoading(true);
      try {
        const newUrls: Record<string, string> = {};
        for (const instance of subjects) {
          if (instance.icon && !imageUrls[instance.icon]) {
            try {
              const url = await getImageUrl(instance.icon);
              if (url) {
                newUrls[instance.icon] = url;
              }
            } catch (error) {
              console.error(`Failed to load image for ${instance.subject.name}:`, error);
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
  }, [subjects, imageUrls]);

  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch = subject.subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         subject.subject.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = selectedGrade === 'all' || subject.grade === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#000',
            border: '1px solid #e5e7eb',
          },
        }}
      />
      <div className={`space-y-8 p-6 transition-all duration-300 ${isModalOpen ? 'blur-sm' : ''}`}>
        {/* Available Subjects Section */}
        <section>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[#800000]">Available Subjects</h2>
              <p className="text-gray-600">Enroll in these subjects to start learning.</p>
            </div>
            <div className="flex flex-col md:flex-row gap-2 items-center">
              <input
                type="text"
                placeholder="Search by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#800000] text-sm shadow-sm bg-white text-gray-800 placeholder-gray-400"
              />
              <div className="relative">
                <button
                  onClick={() => setShowGradeDropdown(!showGradeDropdown)}
                  className="border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#800000] text-sm shadow-sm bg-white text-gray-800 hover:bg-gray-50"
                >
                  Grade {selectedGrade === 'all' ? 'All' : selectedGrade}
                </button>
                {showGradeDropdown && (
                  <div className="absolute right-0 mt-1 w-32 bg-white border rounded-md shadow-lg z-10">
                    {gradeOptions.map((grade) => (
                      <button
                        key={grade}
                        onClick={() => {
                          setSelectedGrade(grade);
                          setShowGradeDropdown(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          selectedGrade === grade ? 'bg-[#800000] text-white' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {grade === 'all' ? 'All Grades' : `Grade ${grade}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#800000]"></div>
              </div>
            ) : filteredSubjects.length > 0 ? (
              filteredSubjects.map((subject) => (
                <div key={subject.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] transform cursor-pointer">
                  <div className="relative h-40 w-full">
                    {isImageLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#800000]"></div>
                      </div>
                    ) : (
                      <Image
                        src={imageUrls[subject.icon] || '/assets/depositphotos_121012076-stock-illustration-blank-photo-icon.jpg'}
                        alt={subject.subject.name}
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
                        {subject.subject.code}
                      </span>
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-medium">
                        Section {subject.section}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900">
                      {subject.subject.name}
                    </h3>
                    <p className="text-sm text-gray-600">Grade {subject.grade}</p>
                    <p className="text-sm text-gray-600">Teacher: {subject.teacherName}</p>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-700 gap-1">
                        <Users className="w-4 h-4 text-[#800000]" />
                        Active
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedSubject(subject);
                        setIsModalOpen(true);
                      }}
                      className="block w-full text-center bg-[#800000] text-white py-2 rounded-md hover:bg-[#600000] transition-colors mt-2"
                    >
                      Enroll Now
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                No available subjects found.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Enrollment Modal */}
      {isModalOpen && selectedSubject && (
        <EnrolmentModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSubject(null);
          }}
          subjectInstanceId={selectedSubject.id}
          subjectName={selectedSubject.subject.name}
          onSuccess={() => {
            setIsModalOpen(false);
            setSelectedSubject(null);
            // Refresh the subjects list after successful enrollment
            fetchSubjects();
          }}
        />
      )}
    </>
  );
}
