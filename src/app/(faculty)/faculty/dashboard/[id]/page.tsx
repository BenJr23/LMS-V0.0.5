"use client";

import { useState, use, useEffect } from 'react';
import { Bell, FileText, ClipboardList, File, FileText as FileTextIcon, UserCircle2, Settings, MessageSquare, HelpCircle, Users, Calendar, Plus, Eye, Trash2, AlertTriangle, Pencil, X } from 'lucide-react';
import { getSubjectInstance, deleteSubjectInstance, editSubjectInstance } from '@/app/_actions/subjectInstance';
import { getImageUrl } from '@/app/_actions/uploadIcon';
import { createRequirement, getRequirements, editRequirement, deleteRequirement } from '@/app/_actions/requirement';
import { createModuleFolder, uploadModuleFile, createUploadedContent } from '@/app/_actions/modules';
import toast from 'react-hot-toast';
import RichTextEditor from '@/components/RichTextEditor';
import { useRouter } from 'next/navigation';

interface SubjectInstance {
  id: string;
  teacherName: string;
  grade: string;
  section: string;
  icon: string;
  enrollment: number;
  enrolmentCode: number;
  subject: {
    id: string;
    name: string;
    code: string;
    createdAt: Date;
    updatedAt: Date;
    createdById: string;
  };
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    subjectInstanceId: string;
  }>;
  moduleFolders: Array<{
    id: string;
    folderName: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    subjectInstanceId: string;
  }>;
  uploadedContents: Array<{
    id: string;
    fileName: string;
    filePath: string;
    createdAt: Date;
    updatedAt: Date;
    subjectInstanceId: string;
    moduleFolderId: string;
  }>;
}

interface Requirement {
  id: string;
  title: string;
  content: string;
  scoreBase: number;
  deadline: Date;
  type: string;
  requirementNumber: number;
  createdAt: Date;
  updatedAt: Date;
  subjectInstanceId: string;
}

const ENROLLMENT_STATUS = [
  { value: 1, label: 'Active' },
  { value: 0, label: 'Inactive' },
  { value: 3, label: 'Completed' }
] as const;

export default function SubjectInstancePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [activeTab, setActiveTab] = useState('announcements');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddAssignmentModalOpen, setIsAddAssignmentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [editForm, setEditForm] = useState({
    teacherName: '',
    grade: '',
    section: '',
    enrollment: 1,
  });
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    content: '',
    deadline: '',
    baseScore: '',
    type: 'Assignment'
  });
  const [subjectInstance, setSubjectInstance] = useState<SubjectInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [selectedRequirementType, setSelectedRequirementType] = useState('ASSIGNMENTS');
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isSubjectDeleteModalOpen, setIsSubjectDeleteModalOpen] = useState(false);
  const [isDeletingSubject, setIsDeletingSubject] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [subjectData, requirementsData] = await Promise.all([
          getSubjectInstance(resolvedParams.id),
          getRequirements(resolvedParams.id)
        ]);

        if (requirementsData.success && requirementsData.data) {
          setRequirements(requirementsData.data);
        } else {
          setRequirements([]);
        }

        setSubjectInstance(subjectData);
        setEditForm({
          teacherName: subjectData.teacherName,
          grade: subjectData.grade,
          section: subjectData.section,
          enrollment: subjectData.enrollment,
        });

        if (subjectData.icon) {
          const url = await getImageUrl(subjectData.icon);
          if (url) {
            setImageUrl(url);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [resolvedParams.id]);

  const tabs = [
    { id: 'announcements', label: 'Announcements', icon: <Bell className="w-4 h-4 mr-1" /> },
    { id: 'files', label: 'Files', icon: <FileText className="w-4 h-4 mr-1" /> },
    { id: 'requirements', label: 'Requirements', icon: <ClipboardList className="w-4 h-4 mr-1" /> },
  ];

  const REQUIREMENT_TYPES = [
    { key: 'FORUM', label: 'FORUMS', icon: <MessageSquare className="w-5 h-5" /> },
    { key: 'QUIZ', label: 'QUIZZES', icon: <HelpCircle className="w-5 h-5" /> },
    { key: 'ASSIGNMENT', label: 'ASSIGNMENTS', icon: <FileText className="w-5 h-5" /> },
    { key: 'ACTIVITY', label: 'ACTIVITIES', icon: <Users className="w-5 h-5" /> }
  ];

  const handleDelete = async () => {
    try {
      setIsDeletingSubject(true);
      const result = await deleteSubjectInstance(resolvedParams.id);
      if (result.success) {
        toast.success('Subject instance deleted successfully');
        router.push('/faculty/dashboard'); // Redirect to dashboard after deletion
      } else {
        toast.error(result.error || 'Failed to delete subject instance');
      }
    } catch (error) {
      console.error('Error deleting subject instance:', error);
      toast.error('Failed to delete subject instance');
    } finally {
      setIsDeletingSubject(false);
      setIsSubjectDeleteModalOpen(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      setIsSavingChanges(true);
      
      if (!editForm.teacherName || !editForm.grade || !editForm.section) {
        toast.error('Please fill in all required fields');
        return;
      }

      const result = await editSubjectInstance({
        id: resolvedParams.id,
        teacherName: editForm.teacherName,
        grade: editForm.grade,
        section: editForm.section,
        enrollment: editForm.enrollment
      });

      if (result.success) {
        toast.success('Subject instance updated successfully');
        setIsEditModalOpen(false);
        
        // Update the local state with the new data
        if (result.data) {
          setSubjectInstance(prev => prev ? {
            ...prev,
            teacherName: result.data.teacherName,
            grade: result.data.grade,
            section: result.data.section,
            enrollment: result.data.enrollment
          } : null);
        }
      } else {
        toast.error(result.error || 'Failed to update subject instance');
      }
    } catch (error) {
      console.error('Error updating subject instance:', error);
      toast.error('Failed to update subject instance');
    } finally {
      setIsSavingChanges(false);
    }
  };

  const handleAddRequirement = (type: string) => {
    // Reset selected requirement when creating new
    setSelectedRequirement(null);
    setSelectedRequirementType(type);
    setAssignmentForm({
      title: '',
      content: '',
      deadline: '',
      baseScore: '',
      type: type.charAt(0) + type.slice(1).toLowerCase()
    });
    setIsAddAssignmentModalOpen(true);
  };

  const getRequirementLabels = (type: string) => {
    const baseType = type.replace('S', '');
    const formattedType = baseType.charAt(0) + baseType.slice(1).toLowerCase();
    const isEditing = !!selectedRequirement;
    return {
      title: isEditing ? `Edit ${formattedType}` : `Create new ${formattedType}`,
      titleField: `${formattedType} title`,
      contentField: `${formattedType} instructions`,
      deadlineField: `${formattedType} deadline`,
      pointsField: `${formattedType} points`,
      submitButton: isEditing ? `Save Changes` : `Create ${formattedType}`,
      description: isEditing 
        ? `Edit the details of this ${formattedType.toLowerCase()}.`
        : `Create a new ${formattedType.toLowerCase()} for your students to complete.`,
      titlePlaceholder: `Enter ${formattedType.toLowerCase()} title...`,
      contentPlaceholder: `Enter ${formattedType.toLowerCase()} instructions...`,
      pointsPlaceholder: `Enter ${formattedType.toLowerCase()} points...`
    };
  };

  const handleEditRequirement = (requirement: Requirement) => {
    setSelectedRequirement(requirement);
    setSelectedRequirementType(requirement.type);
    setAssignmentForm({
      title: requirement.title,
      content: requirement.content,
      deadline: new Date(requirement.deadline).toISOString().slice(0, 16),
      baseScore: requirement.scoreBase.toString(),
      type: requirement.type
    });
    setIsAddAssignmentModalOpen(true);
  };

  const handleCreateRequirement = async () => {
    try {
      if (!assignmentForm.title || !assignmentForm.content || !assignmentForm.deadline || !assignmentForm.baseScore) {
        toast.error('Please fill in all required fields');
        return;
      }

      const requirementType = selectedRequirementType as 'FORUM' | 'QUIZ' | 'ASSIGNMENT' | 'ACTIVITY';
      
      let result;
      if (selectedRequirement) {
        // Edit existing requirement
        result = await editRequirement({
          requirementId: selectedRequirement.id,
          title: assignmentForm.title,
          content: assignmentForm.content,
          scoreBase: parseInt(assignmentForm.baseScore),
          deadline: new Date(assignmentForm.deadline)
        });
      } else {
        // Create new requirement
        result = await createRequirement({
          subjectInstanceId: resolvedParams.id,
          title: assignmentForm.title,
          content: assignmentForm.content,
          scoreBase: parseInt(assignmentForm.baseScore),
          deadline: new Date(assignmentForm.deadline),
          type: requirementType
        });
      }

      if (result.success) {
        toast.success(selectedRequirement ? 'Requirement updated successfully!' : `${requirementType} created successfully!`);
        setIsAddAssignmentModalOpen(false);
        // Reset form and selected requirement
        setAssignmentForm({
          title: '',
          content: '',
          deadline: '',
          baseScore: '',
          type: 'Assignment'
        });
        setSelectedRequirement(null);
        // Refresh requirements data
        const updatedRequirements = await getRequirements(resolvedParams.id);
        if (updatedRequirements.success && updatedRequirements.data) {
          setRequirements(updatedRequirements.data);
        }
      } else {
        toast.error(result.error || (selectedRequirement ? 'Failed to update requirement' : `Failed to create ${requirementType.toLowerCase()}`));
      }
    } catch (error) {
      console.error('Error handling requirement:', error);
      const requirementType = selectedRequirementType as 'FORUM' | 'QUIZ' | 'ASSIGNMENT' | 'ACTIVITY';
      toast.error(selectedRequirement ? 'Failed to update requirement' : `Failed to create ${requirementType.toLowerCase()}`);
    }
  };

  const handleDeleteRequirement = (requirement: Requirement) => {
    setSelectedRequirement(requirement);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRequirement) return;

    try {
      const result = await deleteRequirement(selectedRequirement.id);
      if (result.success) {
        toast.success(`${selectedRequirement.type} deleted successfully`);
        // Refresh requirements data
        const updatedRequirements = await getRequirements(resolvedParams.id);
        if (updatedRequirements.success && updatedRequirements.data) {
          setRequirements(updatedRequirements.data);
        }
      } else {
        toast.error(result.error || 'Failed to delete requirement');
      }
    } catch (error) {
      console.error('Error deleting requirement:', error);
      toast.error('Failed to delete requirement');
    }
    setIsDeleteModalOpen(false);
    setSelectedRequirement(null);
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      setIsCreatingFolder(true);
      const result = await createModuleFolder({
        subjectInstanceId: resolvedParams.id,
        folderName: folderName.trim()
      });

      if (result.success) {
        toast.success('Folder created successfully!');
        setIsAddFolderModalOpen(false);
        setFolderName('');
        // Refresh subject instance data to show new folder
        const updatedSubjectData = await getSubjectInstance(resolvedParams.id);
        setSubjectInstance(updatedSubjectData);
      } else {
        toast.error(result.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleUploadFile = async () => {
    if (!uploadFile) {
      toast.error('Please select a file');
      return;
    }

    // Check file size (1MB = 1024 * 1024 bytes)
    const maxSize = 1024 * 1024; // 1MB
    if (uploadFile.size > maxSize) {
      toast.error('File size must be less than 1MB');
      return;
    }

    if (!selectedFolder) {
      toast.error('No folder selected');
      return;
    }

    try {
      setIsUploading(true);
      
      // Upload file to Supabase storage
      const uploadResult = await uploadModuleFile(uploadFile, selectedFolder.id, uploadFile.name);
      
      if (!uploadResult.success) {
        toast.error(uploadResult.error || 'Failed to upload file');
        return;
      }

      // Create database record
      const dbResult = await createUploadedContent({
        fileName: uploadFile.name,
        filePath: uploadResult.path!,
        subjectInstanceId: resolvedParams.id,
        moduleFolderId: selectedFolder.id
      });

      if (!dbResult.success) {
        toast.error(dbResult.error || 'Failed to save file information');
        return;
      }

      toast.success('File uploaded successfully!');
      setIsUploadModalOpen(false);
      setSelectedFolder(null);
      setUploadFile(null);
      
      // Refresh subject instance data to show new file
      const updatedSubjectData = await getSubjectInstance(resolvedParams.id);
      setSubjectInstance(updatedSubjectData);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewRequirement = (requirement: Requirement) => {
    router.push(`/faculty/dashboard/${resolvedParams.id}/requirements/${requirement.id}`);
  };

  const handleDownloadFile = (filePath: string, fileName: string) => {
    const downloadUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lms/${filePath}`;
    
    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFileSize = (file: File) => {
    const maxSize = 1024 * 1024; // 1MB
    return file.size <= maxSize;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  if (!subjectInstance) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[#800000] mb-2">Subject Not Found</h2>
          <p className="text-gray-600">The requested subject could not be found.</p>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
  };

  return (
    <div className="p-0 md:p-6">
      {/* Header Section */}
      <div className="relative bg-gradient-to-r from-pink-100 via-white to-pink-50 rounded-lg shadow-md mb-6 overflow-hidden flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-8 p-6 border border-pink-200 max-w-[1400px] mx-auto">
        <div className="flex-shrink-0 flex flex-col items-center md:items-start">
          <div className="bg-[#800000]/10 rounded-full p-3 mb-2">
            {imageUrl ? (
              <img src={imageUrl} alt={subjectInstance.subject.name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <UserCircle2 className="text-[#800000] w-12 h-12" />
            )}
          </div>
          <span className="bg-pink-200 text-[#800000] px-3 py-1 rounded font-bold text-sm tracking-widest shadow-sm mb-1">
            {subjectInstance.subject.code}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-1 leading-tight">
                {subjectInstance.subject.name}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-base text-gray-700 mt-1">
                <span className="flex items-center gap-1">
                  <UserCircle2 className="w-5 h-5 text-[#800000]" />
                  {subjectInstance.teacherName}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-5 h-5 text-[#800000]" />
                  Grade {subjectInstance.grade} - Section {subjectInstance.section}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 hover:bg-pink-100 rounded-full transition-colors duration-200"
            >
              <Settings className="w-5 h-5 text-[#800000]" />
            </button>
      </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h3 className="text-xl font-semibold text-[#800000] mb-4">Edit Subject Instance</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teacher Name</label>
                <input
                  type="text"
                  value={editForm.teacherName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, teacherName: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000] text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                <select
                  value={editForm.grade}
                  onChange={(e) => setEditForm(prev => ({ ...prev, grade: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000] text-gray-800 bg-white"
                >
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="9">9</option>
                  <option value="10">10</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select
                  value={editForm.section}
                  onChange={(e) => setEditForm(prev => ({ ...prev, section: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000] text-gray-800 bg-white"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Status</label>
                <select
                  value={editForm.enrollment}
                  onChange={(e) => setEditForm(prev => ({ ...prev, enrollment: parseInt(e.target.value) }))}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000] text-gray-800 bg-white"
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

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setIsSubjectDeleteModalOpen(true)}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors duration-200"
              >
                Delete Subject
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isSavingChanges}
                  className="px-4 py-2 rounded bg-[#800000] text-white hover:bg-[#600000] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSavingChanges ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subject Delete Confirmation Modal */}
      {isSubjectDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 transform transition-all duration-200 scale-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Delete Subject</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this subject instance? This action cannot be undone and will permanently remove all associated data including requirements, announcements, and student enrollments.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsSubjectDeleteModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeletingSubject}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 font-medium flex items-center gap-2"
              >
                {isDeletingSubject ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Subject
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Requirement Modal */}
      {isAddAssignmentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8">
            {/* Modal Header */}
            <div className="border-b border-gray-200 px-8 py-6 sticky top-0 bg-white z-10">
              <h3 className="text-2xl font-bold text-gray-900">
                {getRequirementLabels(selectedRequirementType).title}
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                {getRequirementLabels(selectedRequirementType).description}
              </p>
            </div>

            <div className="p-8 space-y-8 max-h-[calc(100vh-16rem)] overflow-y-auto">
              {/* Title Section */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  {getRequirementLabels(selectedRequirementType).titleField}
                </label>
                <input
                  type="text"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent text-gray-800 transition-all duration-200 placeholder-gray-400"
                  placeholder={getRequirementLabels(selectedRequirementType).titlePlaceholder}
                />
              </div>

              {/* Content Section */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  {getRequirementLabels(selectedRequirementType).contentField}
                </label>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <RichTextEditor
                    content={assignmentForm.content}
                    onChange={(content) => setAssignmentForm(prev => ({ ...prev, content }))}
                    placeholder={getRequirementLabels(selectedRequirementType).contentPlaceholder}
                    className="min-h-[300px]"
                  />
                </div>
              </div>

              {/* Deadline and Score Section */}
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    {getRequirementLabels(selectedRequirementType).deadlineField}
                  </label>
                  <input
                    type="datetime-local"
                    value={assignmentForm.deadline}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent text-gray-800 transition-all duration-200"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    {getRequirementLabels(selectedRequirementType).pointsField}
                  </label>
                  <input
                    type="number"
                    value={assignmentForm.baseScore}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, baseScore: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent text-gray-800 transition-all duration-200 placeholder-gray-400"
                    placeholder={getRequirementLabels(selectedRequirementType).pointsPlaceholder}
                    min="0"
                    step="1"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-8 py-6 bg-gray-50 rounded-b-xl sticky bottom-0">
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setIsAddAssignmentModalOpen(false)}
                  className="px-6 py-3 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRequirement}
                  className="px-6 py-3 rounded-lg bg-[#800000] text-white hover:bg-[#600000] transition-colors duration-200 font-medium text-base shadow-sm"
                >
                  {getRequirementLabels(selectedRequirementType).submitButton}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedRequirement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 transform transition-all duration-200 scale-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Delete {selectedRequirement.type}</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete &ldquo;{selectedRequirement.title}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedRequirement(null);
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Folder Modal */}
      {isAddFolderModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 transform transition-all duration-200 scale-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-full">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Add New Folder</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent text-gray-800 transition-all duration-200 placeholder-gray-400"
                  placeholder="Enter folder name..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setIsAddFolderModalOpen(false);
                  setFolderName('');
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={isCreatingFolder}
                className="px-4 py-2 rounded-lg bg-[#800000] text-white hover:bg-[#600000] transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreatingFolder ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  'Create Folder'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {isUploadModalOpen && selectedFolder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 transform transition-all duration-200 scale-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-full">
                <FileText className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Upload File</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Uploading to: <span className="font-medium">{selectedFolder.name}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    uploadFile ? 'border-[#800000] bg-pink-50' : 'border-gray-300 hover:border-[#800000]'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-[#800000]', 'bg-pink-50');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-[#800000]', 'bg-pink-50');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-[#800000]', 'bg-pink-50');
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      const file = files[0];
                      if (validateFileSize(file)) {
                        setUploadFile(file);
                      } else {
                        toast.error('File size must be less than 1MB');
                      }
                    }
                  }}
                >
                  {uploadFile ? (
                    <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-6 h-6 text-[#800000]" />
                        <div>
                          <span className="text-sm text-gray-700">{uploadFile.name}</span>
                          <p className="text-xs text-gray-500">{formatFileSize(uploadFile.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setUploadFile(null)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto" />
                      <div className="space-y-2">
                        <p className="text-gray-600">
                          Drag and drop your file here, or{' '}
                          <button
                            type="button"
                            onClick={() => document.getElementById('file-input')?.click()}
                            className="text-[#800000] hover:text-[#800000]/80 font-medium"
                          >
                            browse
                          </button>
                        </p>
                        <p className="text-sm text-gray-500">
                          Supported formats: PDF, DOC, DOCX, TXT, PPTX, XLSX
                        </p>
                        <p className="text-xs text-gray-400">
                          Maximum file size: 1MB
                        </p>
                      </div>
                    </div>
                  )}
                  <input
                    id="file-input"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (validateFileSize(file)) {
                          setUploadFile(file);
                        } else {
                          toast.error('File size must be less than 1MB');
                          e.target.value = ''; // Reset input
                        }
                      }
                    }}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.pptx,.xlsx"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setSelectedFolder(null);
                  setUploadFile(null);
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadFile}
                disabled={isUploading}
                className="px-4 py-2 rounded-lg bg-[#800000] text-white hover:bg-[#600000] transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Uploading...
                  </>
                ) : (
                  'Upload File'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <div className="max-w-[1400px] mx-auto">
        {/* Tabs */}
        <div className="border-b border-gray-200 flex gap-6 text-base font-semibold text-gray-700 mb-6">
          {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 border-b-2 transition-all duration-150 rounded-t-md focus:outline-none
                ${activeTab === tab.id
                  ? 'border-[#800000] text-[#800000] bg-pink-50 shadow-sm'
                  : 'border-transparent hover:text-[#800000] hover:bg-pink-100'}
              `}
          >
              {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#800000] mb-2 flex items-center gap-2">
              <Bell className="w-5 h-5" /> Announcements
            </h3>
            {subjectInstance.announcements.map((item) => (
              <div key={item.id} className="bg-white rounded-lg p-5 shadow flex gap-4 border-l-4 border-[#800000]/80">
                <div className="flex flex-col items-center pt-1">
                  <Bell className="text-[#800000] w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[#800000] text-lg">{item.title}</h4>
                  <p className="text-xs text-gray-500 mb-1">{subjectInstance.teacherName} • {formatDate(item.createdAt)}</p>
                  <p className="mt-1 text-gray-800 text-sm">{item.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-[#800000] flex items-center gap-2">
                <FileTextIcon className="w-5 h-5" /> Course Files
              </h3>
              <button
                onClick={() => setIsAddFolderModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-[#800000] text-white hover:bg-[#600000] transition-colors duration-200 font-medium text-sm flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Folder
              </button>
            </div>
            {subjectInstance.moduleFolders.map((mod) => (
              <div key={mod.id} className="bg-white rounded-lg p-4 shadow border border-pink-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{mod.folderName}</h4>
                  <button
                    onClick={() => {
                      setSelectedFolder({ id: mod.id, name: mod.folderName });
                      setIsUploadModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#800000] text-white hover:bg-[#600000] transition-colors duration-200 text-sm flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3 h-3" />
                    Upload
                  </button>
                </div>
                {subjectInstance.uploadedContents.filter(content => content.moduleFolderId === mod.id).length === 0 ? (
                  <div className="text-gray-400 italic text-sm">No files available for this module.</div>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {subjectInstance.uploadedContents
                      .filter(content => content.moduleFolderId === mod.id)
                      .map((file) => (
                        <li key={file.id} className="flex items-center justify-between text-sm text-gray-700 border-b pb-1 last:border-b-0">
                          <button
                            onClick={() => handleDownloadFile(file.filePath, file.fileName)}
                            className="flex items-center gap-2 hover:text-[#800000] transition-colors cursor-pointer"
                          >
                            {file.fileName.toLowerCase().endsWith('.pdf') ? <FileText className="w-4 h-4 text-red-500" /> : 
                             file.fileName.toLowerCase().endsWith('.pptx') ? <FileText className="w-4 h-4 text-orange-500" /> : 
                             <File className="w-4 h-4 text-gray-400" />}
                            <span className="hover:underline">{file.fileName}</span>
                          </button>
                          <span className="text-xs text-gray-500">
                            {new Date(file.updatedAt).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Requirements Tab */}
        {activeTab === 'requirements' && (
          <div>
            {REQUIREMENT_TYPES.map(({ key, label, icon }) => {
              const typeRequirements = requirements.filter(req => req.type === key);
              return (
                <div key={key} className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-lg font-bold text-[#800000] uppercase tracking-wide flex items-center gap-2">
                      {icon}
                      {label}
                    </h4>
                    <button
                      onClick={() => handleAddRequirement(key)}
                      className="p-1.5 rounded-md bg-[#800000] text-white hover:bg-[#a52a2a] transition-colors duration-200 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-pink-100">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-pink-50 border-b border-pink-100">
                            <th className="p-4 text-left font-semibold text-[#800000] w-[15%]">Requirement</th>
                            <th className="p-4 text-left font-semibold text-[#800000] w-[30%]">Title</th>
                            <th className="p-4 text-left font-semibold text-[#800000] w-[20%]">Due Date</th>
                            <th className="p-4 text-left font-semibold text-[#800000] w-[15%]">Points</th>
                            <th className="p-4 text-left font-semibold text-[#800000] w-[20%]">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-pink-50">
                          {typeRequirements.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-gray-500 italic">
                                No {label.toLowerCase()} available yet. Click the + button to add one.
                              </td>
                            </tr>
                          ) : (
                            typeRequirements.map((requirement) => (
                              <tr key={requirement.id} className="hover:bg-pink-50/50">
                                <td className="p-4 text-gray-700">
                                  {requirement.type} {requirement.requirementNumber}
                                </td>
                                <td className="p-4 text-gray-700 font-medium">
                                  {requirement.title}
                                </td>
                                <td className="p-4 text-gray-700">
                                  {new Date(requirement.deadline).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-gray-700">
                                  {requirement.scoreBase} points
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleViewRequirement(requirement)}
                                      className="p-1.5 rounded-md hover:bg-pink-100 text-[#800000] transition-colors duration-200"
                                      title="View Details"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleEditRequirement(requirement)}
                                      className="p-1.5 rounded-md hover:bg-pink-100 text-[#800000] transition-colors duration-200"
                                      title="Edit"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRequirement(requirement)}
                                      className="p-1.5 rounded-md hover:bg-red-100 text-red-600 transition-colors duration-200"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
