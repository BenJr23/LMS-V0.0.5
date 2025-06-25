'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FileText, Calendar, Award, MessageSquare, Upload, X, Loader2, Download, AlertTriangle, MessageCircle, Send, Bot } from 'lucide-react';
import { getStudentRequirementDetail } from '@/app/_actions/requirement';
import { createSubmission, updateSubmissionStatus, editSubmission, deleteSubmission } from '@/app/_actions/submission';
import { getAIResponse } from '@/app/_actions/ai';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import RichTextEditor from '@/components/RichTextEditor';
import { uploadRequirementFile } from '@/app/_actions/uploadRequirement';
import DOMPurify from 'dompurify';

interface RequirementDetail {
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
  submissionStatus: 'GRADED' | 'SUBMITTED' | 'NOT_SUBMITTED';
  submission: {
    id: string;
    title: string;
    content: string;
    filePath: string;
    status: number;
    graded: boolean;
    score: number | null;
    feedback: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  subjectInstance: {
    subject: {
      name: string;
      code: string;
    };
  };
}

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirementId: string;
  onSuccess: () => void;
  initialData?: { title: string; content: string; filePath: string };
}

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function FileUploadBox({ onFileSelect }: { onFileSelect: (file: File | null) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      setUploadedFile(file);
      onFileSelect(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setUploadedFile(file);
      onFileSelect(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setUploadedFile(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragging ? 'border-[#800000] bg-pink-50' : 'border-gray-300 hover:border-[#800000]'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt"
      />
      
      {uploadedFile ? (
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-[#800000]" />
            <span className="text-sm text-gray-700">{uploadedFile.name}</span>
          </div>
          <button
            onClick={removeFile}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <Upload className="w-12 h-12 text-gray-400 mx-auto" />
          <div className="space-y-2">
            <p className="text-gray-600">
              Drag and drop your file here, or{' '}
              <button
                type="button"
                onClick={handleButtonClick}
                className="text-[#800000] hover:text-[#800000]/80 font-medium"
              >
                browse
              </button>
            </p>
            <p className="text-sm text-gray-500">
              Supported formats: PDF, DOC, DOCX, TXT
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionModal({ isOpen, onClose, requirementId, onSuccess, initialData }: SubmissionModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [requirementType, setRequirementType] = useState<string>('');

  useEffect(() => {
    const fetchRequirementType = async () => {
      try {
        const response = await getStudentRequirementDetail(requirementId);
        if (response.success && response.data) {
          setRequirementType(response.data.type);
        }
      } catch (error) {
        console.error('Error fetching requirement type:', error);
      }
    };
    if (isOpen) {
      fetchRequirementType();
    }
  }, [requirementId, isOpen]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setFile(null);
    setUploadProgress(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(0);
      
      let filePath = initialData?.filePath || '';
      if (file && requirementType !== 'QUIZ') {
        const uploadResponse = await uploadRequirementFile(file);
        if (!uploadResponse.success || !uploadResponse.path) {
          throw new Error(uploadResponse.error || 'Failed to upload file');
        }
        filePath = uploadResponse.path;
        setUploadProgress(100);
      }

      const response = initialData 
        ? await editSubmission({
            submissionId: requirementId,
            title,
            content,
            filePath
          })
        : await createSubmission({
            requirementId,
            title,
            content,
            filePath
          });

      if (response.success) {
        toast.success(initialData ? 'Submission updated successfully' : 'Submission created successfully');
        resetForm();
        onSuccess();
        onClose();
      } else {
        toast.error(response.error || (initialData ? 'Failed to update submission' : 'Failed to create submission'));
      }
    } catch (error) {
      console.error('Error handling submission:', error);
      toast.error(initialData ? 'Failed to update submission' : 'Failed to create submission');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            {requirementType === 'QUIZ' ? 'Take Quiz' : 'Create Submission'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              {requirementType === 'QUIZ' ? 'Quiz Title' : 'Submission Title'}
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-gray-900 placeholder-gray-500"
              placeholder={requirementType === 'QUIZ' ? 'Enter quiz title' : 'Enter submission title'}
              required
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              {requirementType === 'QUIZ' ? 'Quiz Answers' : 'Content'}
            </label>
            <div className="border border-gray-300 rounded-lg">
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder={requirementType === 'QUIZ' ? 'Enter your quiz answers...' : 'Enter your submission content...'}
              />
            </div>
          </div>

          {requirementType !== 'QUIZ' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attach File (Optional)
              </label>
              <FileUploadBox onFileSelect={setFile} />
            </div>
          )}

          {uploadProgress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#800000] h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#800000] text-white rounded-lg hover:bg-[#800000]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {requirementType === 'QUIZ' ? 'Submitting...' : 'Creating...'}
                </>
              ) : (
                requirementType === 'QUIZ' ? 'Submit Quiz' : 'Create Submission'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, isDeleting }: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 p-2 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Delete Submission</h2>
          </div>
          <p className="text-gray-600">
            Are you sure you want to delete this submission? This action cannot be undone.
          </p>
        </div>
        <div className="p-6 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function CompleteSubmissionConfirmationModal({ isOpen, onClose, onConfirm, isCompleting }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; isCompleting: boolean }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-full">
              <Upload className="w-6 h-6 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Complete Submission</h2>
          </div>
          <p className="text-gray-600">
            Are you sure you want to mark this submission as complete? You will not be able to edit it after this.
          </p>
        </div>
        <div className="p-6 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isCompleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#800000]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            disabled={isCompleting}
          >
            {isCompleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Completing...
              </>
            ) : (
              'Complete Submission'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function getSubmissionStatusColor(submission: RequirementDetail['submission']) {
  if (!submission) return 'bg-gray-100 text-gray-600';
  if (submission.graded) return 'bg-green-100 text-green-600';
  if (submission.status === 1) return 'bg-blue-100 text-blue-600';
  return 'bg-yellow-100 text-yellow-600';
}

function getSubmissionStatusText(submission: RequirementDetail['submission']) {
  if (!submission) return 'Not Submitted';
  if (submission.graded) return 'Graded';
  if (submission.status === 1) return 'Complete';
  return 'Draft';
}

export default function RequirementDetail({ 
  id,
  requirementId
}: { 
  id: string;
  requirementId: string;
}) {
  const router = useRouter();
  const [requirement, setRequirement] = useState<RequirementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteModalLoading, setIsDeleteModalLoading] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; text: string; isUser: boolean; timestamp: Date }>>([
    {
      id: '1',
      text: 'Hello! I\'m your AI study assistant. How can I help you with this requirement?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const fetchRequirement = async () => {
    try {
      setLoading(true);
      const response = await getStudentRequirementDetail(requirementId);
      
      if (response.success && response.data) {
        setRequirement(response.data as RequirementDetail);
      } else {
        toast.error('Failed to load requirement details');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching requirement:', error);
      toast.error('Failed to load requirement details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirement();
  }, [requirementId, router, id]);

  const handleCompleteSubmission = async () => {
    if (!requirement?.submission) return;
    try {
      setIsCompleting(true);
      const response = await updateSubmissionStatus({
        submissionId: requirement.submission.id,
        status: 1 // Complete
      });
      if (response.success) {
        toast.success('Submission completed successfully');
        fetchRequirement();
        setIsCompleteModalOpen(false);
      } else {
        toast.error(response.error || 'Failed to complete submission');
      }
    } catch (error) {
      console.error('Error completing submission:', error);
      toast.error('Failed to complete submission');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDeleteSubmission = async () => {
    if (!requirement?.submission) return;

    try {
      setIsDeleteModalLoading(true);
      const response = await deleteSubmission(requirement.submission.id);

      if (response.success) {
        toast.success('Submission deleted successfully');
        fetchRequirement();
        setIsDeleteModalOpen(false);
      } else {
        toast.error(response.error || 'Failed to delete submission');
      }
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast.error('Failed to delete submission');
    } finally {
      setIsDeleteModalLoading(false);
    }
  };

  const handleSubmissionSuccess = () => {
    fetchRequirement();
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !requirement) return;

    const userMessage = {
      id: Date.now().toString(),
      text: chatInput,
      isUser: true,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsTyping(true);

    try {
      // Prepare requirement context for AI
      const requirementContext = {
        title: requirement.title,
        content: requirement.content,
        type: requirement.type,
        scoreBase: requirement.scoreBase,
        deadline: requirement.deadline,
        subjectName: requirement.subjectInstance.subject.name,
        subjectCode: requirement.subjectInstance.subject.code
      };

      // Get AI response using Gemini
      const response = await getAIResponse(chatInput, requirementContext, chatMessages);

      if (response.success && response.data) {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          text: response.data,
          isUser: false,
          timestamp: new Date()
        };

        setChatMessages(prev => [...prev, aiMessage]);
      } else {
        // Fallback response if AI fails
        const fallbackMessage = {
          id: (Date.now() + 1).toString(),
          text: "I'm having trouble connecting right now. Please try again in a moment or contact your teacher for assistance.",
          isUser: false,
          timestamp: new Date()
        };

        setChatMessages(prev => [...prev, fallbackMessage]);
        toast.error('AI service temporarily unavailable');
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Fallback response on error
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm experiencing technical difficulties. Please try again later or reach out to your teacher for help.",
        isUser: false,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to get AI response');
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  if (!requirement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[#800000] mb-2">Requirement Not Found</h2>
          <p className="text-gray-600">The requested requirement could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center text-[#800000] hover:text-[#800000]/80 mb-8 group"
      >
        <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
        <span className="text-lg">Back to Requirements</span>
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-pink-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {requirement.title}
            </h1>
            <p className="text-base text-gray-600">
              {requirement.subjectInstance.subject.code} - {requirement.subjectInstance.subject.name}
            </p>
          </div>
          <span className={`px-5 py-2.5 text-base font-semibold rounded-full ${getSubmissionStatusColor(requirement.submission)}`}>
            {getSubmissionStatusText(requirement.submission)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 p-6 bg-pink-50/50 rounded-xl">
          <div className="flex items-center text-gray-700">
            <FileText className="w-6 h-6 text-[#800000] mr-3" />
            <span className="text-base">{requirement.type} {requirement.requirementNumber}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <Calendar className="w-6 h-6 text-[#800000] mr-3" />
            <span className="text-base">Due: {new Date(requirement.deadline).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <Award className="w-6 h-6 text-[#800000] mr-3" />
            <span className="text-base">{requirement.scoreBase} points</span>
          </div>
        </div>

        <div className="prose max-w-none">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Description</h3>
          <div 
            className="text-gray-700 prose prose-lg mx-auto [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6 [&>p]:mb-6 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mb-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-bold [&>h3]:mb-3 [&>blockquote]:border-l-4 [&>blockquote]:border-[#800000] [&>blockquote]:pl-6 [&>blockquote]:italic [&>pre]:bg-gray-100 [&>pre]:p-6 [&>pre]:rounded-lg [&>code]:bg-gray-100 [&>code]:px-2 [&>code]:py-1 [&>code]:rounded [&>a]:text-[#800000] [&>a]:underline [&>a]:font-medium"
            dangerouslySetInnerHTML={{ __html: requirement.content }}
          />
        </div>
      </div>

      {/* Submission Section */}
      {requirement.submission ? (
        <div className="bg-white rounded-xl shadow-lg p-8 border border-pink-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
            <Upload className="w-6 h-6 mr-3 text-[#800000]" />
            Your Submission
          </h2>
          
          <div className="space-y-8">
            <div className="p-6 bg-pink-50/50 rounded-xl">
              <h3 className="text-base font-semibold text-gray-700 mb-2">Status</h3>
              <p className="text-gray-600 text-lg">
                {requirement.submission.status === 1 ? 'Complete' : 'Draft'}
              </p>
            </div>

            <div className="p-6 bg-pink-50/50 rounded-xl">
              <h3 className="text-base font-semibold text-gray-700 mb-2">Submitted On</h3>
              <p className="text-gray-600 text-lg">
                {new Date(requirement.submission.createdAt).toLocaleString()}
              </p>
            </div>

            {requirement.submission.filePath && (
              <div className="p-6 bg-pink-50/50 rounded-xl">
                <h3 className="text-base font-semibold text-gray-700 mb-3">Attached File</h3>
                {requirement.submission.filePath.toLowerCase().endsWith('.pdf') ? (
                  <a 
                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lms/${requirement.submission.filePath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-5 py-2.5 bg-[#800000] text-white rounded-lg hover:bg-[#800000]/90 transition-colors text-base"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    View PDF
                  </a>
                ) : (
                  <a 
                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lms/${requirement.submission.filePath}`}
                    download
                    className="inline-flex items-center px-5 py-2.5 bg-[#800000] text-white rounded-lg hover:bg-[#800000]/90 transition-colors text-base"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download File
                  </a>
                )}
              </div>
            )}

            {requirement.submission.content && (
              <div className="p-6 bg-pink-50/50 rounded-xl">
                <h3 className="text-base font-semibold text-gray-700 mb-3">Submission Content</h3>
                <div 
                  className="text-gray-600 prose prose-lg mx-auto [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6 [&>p]:mb-6 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mb-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-bold [&>h3]:mb-3 [&>blockquote]:border-l-4 [&>blockquote]:border-[#800000] [&>blockquote]:pl-6 [&>blockquote]:italic [&>pre]:bg-gray-100 [&>pre]:p-6 [&>pre]:rounded-lg [&>code]:bg-gray-100 [&>code]:px-2 [&>code]:py-1 [&>code]:rounded [&>a]:text-[#800000] [&>a]:underline [&>a]:font-medium"
                  dangerouslySetInnerHTML={{ __html: requirement.submission.content }}
                />
              </div>
            )}

            {requirement.submission.graded && (
              <div className="space-y-6">
                <div className="p-6 bg-green-50 rounded-xl">
                  <h3 className="text-base font-semibold text-gray-700 mb-2">Score</h3>
                  <p className="text-gray-600 text-2xl font-semibold">
                    {requirement.submission.score} / {requirement.scoreBase}
                  </p>
                </div>

                {requirement.submission.feedback && (
                  <div className="p-6 bg-blue-50 rounded-xl">
                    <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Feedback
                    </h3>
                    <div 
                      className="text-gray-600 prose prose-lg mx-auto [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6 [&>p]:mb-6 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mb-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-bold [&>h3]:mb-3 [&>blockquote]:border-l-4 [&>blockquote]:border-[#800000] [&>blockquote]:pl-6 [&>blockquote]:italic [&>pre]:bg-gray-100 [&>pre]:p-6 [&>pre]:rounded-lg [&>code]:bg-gray-100 [&>code]:px-2 [&>code]:py-1 [&>code]:rounded [&>a]:text-[#800000] [&>a]:underline [&>a]:font-medium"
                      dangerouslySetInnerHTML={{ __html: requirement.submission.feedback }}
                    />
                  </div>
                )}
              </div>
            )}

            {!requirement.submission.graded && requirement.submission.status === 0 && (
              <div className="mt-8 flex justify-end gap-4">
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-6 py-3 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors text-lg font-medium"
                >
                  Delete Submission
                </button>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-6 py-3 border border-[#800000] text-[#800000] rounded-lg hover:bg-pink-50 transition-colors text-lg font-medium"
                >
                  Edit Submission
                </button>
                <button
                  onClick={() => setIsCompleteModalOpen(true)}
                  className="px-6 py-3 bg-[#800000] text-white rounded-lg hover:bg-[#800000]/90 transition-colors text-lg font-medium"
                >
                  Complete Submission
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-8 border border-pink-100">
          <div className="text-center py-12">
            <button
              onClick={() => setIsSubmissionModalOpen(true)}
              className="px-6 py-3 bg-[#800000] text-white rounded-lg hover:bg-[#800000]/90 transition-colors text-lg font-medium"
            >
              Start Submission
            </button>
          </div>
        </div>
      )}

      {/* Add the Submission Modal */}
      <SubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        requirementId={requirementId}
        onSuccess={handleSubmissionSuccess}
      />

      {/* Add the Edit Submission Modal */}
      <SubmissionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        requirementId={requirement.submission?.id || ''}
        onSuccess={handleSubmissionSuccess}
        initialData={requirement.submission ? {
          title: requirement.submission.title,
          content: requirement.submission.content,
          filePath: requirement.submission.filePath
        } : undefined}
      />

      {/* Add the Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteSubmission}
        isDeleting={isDeleteModalLoading}
      />

      {/* Add the Complete Submission Confirmation Modal */}
      <CompleteSubmissionConfirmationModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        onConfirm={handleCompleteSubmission}
        isCompleting={isCompleting}
      />

      {/* Chatbot */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Chat Button */}
        {!isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="bg-[#800000] text-white p-4 rounded-full shadow-lg hover:bg-[#600000] transition-all duration-200 hover:scale-110"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        )}

        {/* Chat Window */}
        {isChatOpen && (
          <div className={`bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col transition-all duration-300 ${isChatExpanded ? 'h-[70vh] w-[28rem]' : 'h-96 w-80'}`}>
            {/* Chat Header */}
            <div className="bg-[#800000] text-white p-4 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <span className="font-semibold">Study Assistant</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsChatExpanded((prev) => !prev)}
                  className="text-white hover:text-gray-200 transition-colors"
                  title={isChatExpanded ? 'Collapse' : 'Expand'}
                >
                  {isChatExpanded ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  )}
                </button>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className={`flex-1 p-4 overflow-y-auto space-y-3`}>
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.isUser
                        ? 'bg-[#800000] text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {message.isUser ? (
                      <p className="text-sm">{message.text}</p>
                    ) : (
                      <div
                        className="text-sm prose max-w-full"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.text) }}
                      />
                    )}
                    <p className={`text-xs mt-1 ${
                      message.isUser ? 'text-gray-200' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask for help with this requirement..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm text-gray-900 bg-white"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim()}
                  className="bg-[#800000] text-white p-2 rounded-lg hover:bg-[#600000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 