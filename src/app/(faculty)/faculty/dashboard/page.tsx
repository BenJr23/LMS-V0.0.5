/* eslint-disable @next/next/no-img-element */
'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Plus, X, RefreshCw, ChevronDown, Image as ImageIcon, Users } from 'lucide-react';
import { getSubjects } from '@/app/_actions/subject';
import { uploadSectionIcon } from '@/app/_actions/uploadSectionIcon';
import { createSubjectInstance, getSubjectInstances } from '@/app/_actions/subjectInstance';
import Image from 'next/image';
import { getImageUrl } from '@/app/_actions/uploadIcon';
import Link from "next/link";

type Subject = {
  id: string;
  name: string;
  code: string;
};

type SubjectInstance = {
  id: string;
  subjectId: string;
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
  };
};

type NewSubjectInstance = {
  subjectId: string;
  teacherName: string;
  grade: string;
  section: string;
  enrolmentCode: number;
  enrollment: number;
  photo?: File;
  photoPath?: string;
};

const GRADE_LEVELS = [
  { value: '7', label: 'Grade 7' },
  { value: '8', label: 'Grade 8' },
  { value: '9', label: 'Grade 9' },
  { value: '10', label: 'Grade 10' }
] as const;

const SECTIONS = ['A', 'B'] as const;

const ENROLLMENT_STATUS = [
  { value: 1, label: 'Active' },
  { value: 0, label: 'Inactive' },
  { value: 3, label: 'Completed' }
] as const;

export default function FacultyDashboard() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [newSection, setNewSection] = useState<NewSubjectInstance>({
    subjectId: '',
    teacherName: '',
    grade: '',
    section: '',
    enrolmentCode: generateEnrollmentCode(),
    enrollment: 1,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const subjectDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [subjectInstances, setSubjectInstances] = useState<SubjectInstance[]>([]);
  const [isLoadingInstances, setIsLoadingInstances] = useState(true);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [isImageLoading, setIsImageLoading] = useState(true);

  useEffect(() => {
    if (isModalOpen) {
      fetchSubjects();
    }
  }, [isModalOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target as Node)) {
        setIsSubjectDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSubjects = async () => {
    try {
      setIsLoadingSubjects(true);
      const data = await getSubjects();
      setSubjects(data);
    } catch {
      toast.error('Failed to load subjects');
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  function generateEnrollmentCode(): number {
    return Math.floor(1000 + Math.random() * 9000);
  }

  const handleRegenerateCode = () => {
    setNewSection(prev => ({ ...prev, enrolmentCode: generateEnrollmentCode() }));
  };

  useEffect(() => {
    if (isLoaded && !user) {
      toast.error('Please sign in to access the dashboard');
      router.push('/faculty-login');
    }
  }, [isLoaded, user, router]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setNewSection({
      subjectId: '',
      teacherName: '',
      grade: '',
      section: '',
      enrolmentCode: generateEnrollmentCode(),
      enrollment: 1,
    });
    setPhotoPreview(null);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      console.log('Starting upload for file:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // Upload to Supabase
      const result = await uploadSectionIcon(file);
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      if (!result.path) {
        throw new Error('No path returned from upload');
      }

      console.log('Upload completed successfully:', result.path);

      setNewSection(prev => ({ 
        ...prev, 
        photo: file,
        photoPath: result.path 
      }));
      
      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Upload error in component:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload photo');
      setPhotoPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setNewSection(prev => ({ 
      ...prev, 
      photo: undefined,
      photoPath: undefined 
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateSection = async () => {
    try {
      setIsCreating(true);
      
      if (!newSection.photoPath) {
        throw new Error('Please upload a section photo');
      }

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const result = await createSubjectInstance({
        subjectId: newSection.subjectId,
        teacherName: newSection.teacherName,
        grade: newSection.grade,
        section: newSection.section,
        enrolmentCode: newSection.enrolmentCode,
        icon: newSection.photoPath,
        enrollment: newSection.enrollment
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create section');
      }

      toast.success('Section created successfully');
      handleModalClose();
      // Refresh the list of subject instances
      await fetchSubjectInstances();
    } catch (error) {
      console.error('Error creating section:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create section');
    } finally {
      setIsCreating(false);
    }
  };

  // Add function to fetch subject instances
  const fetchSubjectInstances = async () => {
    try {
      setIsLoadingInstances(true);
      const result = await getSubjectInstances();
      if (result.success && result.data) {
        setSubjectInstances(result.data);
      } else {
        toast.error(result.error || 'Failed to fetch sections');
        setSubjectInstances([]);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Failed to fetch sections');
      setSubjectInstances([]);
    } finally {
      setIsLoadingInstances(false);
    }
  };

  // Add useEffect to fetch instances on component mount
  useEffect(() => {
    if (user) {
      fetchSubjectInstances();
    }
  }, [user]);

  // Add this useEffect to handle image URLs
  useEffect(() => {
    const updateImageUrls = async () => {
      setIsImageLoading(true);
      try {
        console.log('Starting to update image URLs for instances:', subjectInstances);
        const newUrls: Record<string, string> = {};
        for (const instance of subjectInstances) {
          if (instance.icon && !imageUrls[instance.icon]) {
            console.log('Processing icon for instance:', instance.subject.name, 'Icon path:', instance.icon);
            try {
              const url = await getImageUrl(instance.icon);
              console.log('Got URL for instance:', instance.subject.name, 'URL:', url);
              if (url) {
                newUrls[instance.icon] = url;
              }
            } catch (error) {
              console.error(`Failed to load image for ${instance.subject.name}:`, error);
            }
          }
        }
        if (Object.keys(newUrls).length > 0) {
          console.log('Updating image URLs with new URLs:', newUrls);
          setImageUrls(prev => ({ ...prev, ...newUrls }));
        }
      } catch (error) {
        console.error('Failed to update image URLs:', error);
      } finally {
        setIsImageLoading(false);
      }
    };

    updateImageUrls();
  }, [subjectInstances, imageUrls]);

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
    subject.code.toLowerCase().includes(subjectSearchQuery.toLowerCase())
  );

  const selectedSubject = subjects.find(subject => subject.id === newSection.subjectId);

  // Add this filtered list for subject instances
  const filteredSubjectInstances = subjectInstances.filter((instance) => {
    const query = searchQuery.toLowerCase();
    return (
      instance.subject.name.toLowerCase().includes(query) ||
      instance.subject.code.toLowerCase().includes(query) ||
      instance.teacherName.toLowerCase().includes(query) ||
      instance.grade.toLowerCase().includes(query) ||
      instance.section.toLowerCase().includes(query)
    );
  });

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-800"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Toaster />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#800000]">My Teaching Sections</h2>
            <p className="text-gray-600">Welcome back! Here are your teaching assignments.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 items-center">
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#800000] text-sm shadow-sm bg-white text-gray-800 placeholder-gray-400"
            />
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] transition-colors duration-200 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Add Section
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoadingInstances ? (
            <div className="col-span-full flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#800000]"></div>
            </div>
          ) : filteredSubjectInstances.length > 0 ? (
            filteredSubjectInstances.map((instance) => (
              <Link
                key={instance.id}
                href={`/faculty/dashboard/${instance.id}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] transform cursor-pointer block"
              >
                <div className="relative h-40 w-full">
                  {isImageLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#800000]"></div>
                    </div>
                  ) : (
                    <Image
                      src={imageUrls[instance.icon] || '/assets/depositphotos_121012076-stock-illustration-blank-photo-icon.jpg'}
                      alt={instance.subject.name || 'Subject'}
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
                      Active
                    </div>
                    <div className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                      Code: {instance.enrolmentCode}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500">
              No sections found. Add your first teaching section to get started.
            </div>
          )}
        </div>
      </div>

      {/* Add Section Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Add New Section</h3>
              <button
                onClick={handleModalClose}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <input 
                    type="hidden" 
                    value={user?.id || ''} 
                    readOnly 
                  />
                  <div>
                    <label htmlFor="subjectId" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <div className="relative" ref={subjectDropdownRef}>
                      <div className="relative">
                        <input
                          type="text"
                          value={selectedSubject ? `${selectedSubject.name} - ${selectedSubject.code}` : subjectSearchQuery}
                          onChange={(e) => {
                            setSubjectSearchQuery(e.target.value);
                            setIsSubjectDropdownOpen(true);
                          }}
                          onFocus={() => setIsSubjectDropdownOpen(true)}
                          placeholder="Search or select a subject..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent text-gray-900 placeholder-gray-400 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isSubjectDropdownOpen ? 'transform rotate-180' : ''}`} />
                        </button>
                      </div>
                      {isSubjectDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                          <div className="max-h-60 overflow-y-auto">
                            {filteredSubjects.length > 0 ? (
                              filteredSubjects.map((subject) => (
                                <button
                                  key={subject.id}
                                  onClick={() => {
                                    setNewSection(prev => ({ ...prev, subjectId: subject.id }));
                                    setIsSubjectDropdownOpen(false);
                                    setSubjectSearchQuery('');
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                                >
                                  <div className="font-medium text-gray-900">{subject.name}</div>
                                  <div className="text-sm text-gray-500">{subject.code}</div>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-sm text-gray-500">
                                No subjects found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {isLoadingSubjects && (
                      <p className="mt-1 text-sm text-gray-500">Loading subjects...</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="teacherName" className="block text-sm font-medium text-gray-700 mb-1">
                      Teacher Name
                    </label>
                    <input
                      type="text"
                      id="teacherName"
                      value={newSection.teacherName}
                      onChange={(e) => setNewSection(prev => ({ ...prev, teacherName: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent text-gray-900 placeholder-gray-400 bg-white"
                      placeholder="Enter teacher name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">
                        Grade Level
                      </label>
                      <select
                        id="grade"
                        value={newSection.grade}
                        onChange={(e) => setNewSection(prev => ({ ...prev, grade: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent text-gray-900 bg-white"
                      >
                        <option value="" className="text-gray-500">Select grade level</option>
                        {GRADE_LEVELS.map((grade) => (
                          <option key={grade.value} value={grade.value}>
                            {grade.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="section" className="block text-sm font-medium text-gray-700 mb-1">
                        Section
                      </label>
                      <select
                        id="section"
                        value={newSection.section}
                        onChange={(e) => setNewSection(prev => ({ ...prev, section: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent text-gray-900 bg-white"
                      >
                        <option value="" className="text-gray-500">Select section</option>
                        {SECTIONS.map((section) => (
                          <option key={section} value={section}>
                            Section {section}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="enrolmentCode" className="block text-sm font-medium text-gray-700 mb-1">
                      Enrollment Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="enrolmentCode"
                        value={newSection.enrolmentCode}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-mono text-lg text-center"
                      />
                      <button
                        type="button"
                        onClick={handleRegenerateCode}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center gap-2"
                        title="Generate new code"
                      >
                        <RefreshCw className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      This code will be used by students to enroll in this section
                    </p>
                  </div>
                  <div>
                    <label htmlFor="enrollment" className="block text-sm font-medium text-gray-700 mb-1">
                      Enrollment Status
                    </label>
                    <select
                      id="enrollment"
                      value={newSection.enrollment}
                      onChange={(e) => setNewSection(prev => ({ ...prev, enrollment: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent text-gray-900 bg-white"
                    >
                      {ENROLLMENT_STATUS.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      Active: Currently accepting enrollments
                      <br />
                      Inactive: Not accepting enrollments
                      <br />
                      Completed: Course has ended
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section Photo
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                    <div className="space-y-1 text-center">
                      {photoPreview ? (
                        <div className="relative">
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="mx-auto h-48 w-48 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="absolute -top-2 -right-2 p-1 bg-red-100 rounded-full hover:bg-red-200 transition-colors duration-200"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center h-48 w-48 rounded-lg bg-gray-50">
                              <ImageIcon className="h-12 w-12 text-gray-400" />
                            </div>
                            <div className="mt-4 flex text-sm text-gray-600">
                              <label
                                htmlFor="photo-upload"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-red-800 hover:text-red-900 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-red-800"
                              >
                                <span>Upload a photo</span>
                                <input
                                  id="photo-upload"
                                  name="photo-upload"
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  onChange={handlePhotoChange}
                                  ref={fileInputRef}
                                  disabled={isUploading}
                                />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              PNG, JPG, GIF up to 5MB
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {isUploading && (
                    <div className="mt-2 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-red-800"></div>
                      <span className="ml-2 text-sm text-gray-500">Uploading...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleModalClose}
                disabled={isCreating}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSection}
                disabled={!newSection.subjectId || !newSection.teacherName || !newSection.grade || !newSection.section || !newSection.photo || isCreating}
                className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  'Create Section'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}