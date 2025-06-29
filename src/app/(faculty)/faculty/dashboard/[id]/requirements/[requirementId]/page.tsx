/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, use } from 'react';
import { ArrowLeft, Calendar, Award, Eye } from 'lucide-react';
import { getTeacherRequirementDetail, submitGrade } from '@/app/_actions/teacherview';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import RichTextEditor from '@/components/RichTextEditor';

interface Submission {
  id: string;
  requirementId: string;
  enrollmentId: string;
  userId: string;
  title: string;
  content: string;
  filePath: string;
  plagiarismContent: string | null;
  plagiarismScore: number | null;
  status: string; // Coming as string from API
  graded: boolean;
  score: number | null;
  feedback: string | null;
  createdAt: Date;
  updatedAt: Date;
  studentEmail: string; // Added from transformed data
  enrollment: {
    studentId: string;
    email: string;
  };
}

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
  submissions: Submission[];
  subjectInstance: {
    subject: {
      name: string;
      code: string;
    };
  };
}

export default function TeacherRequirementDetailPage({ params }: { params: Promise<{ id: string; requirementId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [requirement, setRequirement] = useState<RequirementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [grade, setGrade] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');

  useEffect(() => {
    const fetchRequirement = async () => {
      try {
        setLoading(true);
        const response = await getTeacherRequirementDetail(resolvedParams.requirementId);
        if (response.success && response.data) {
          setRequirement(response.data as unknown as RequirementDetail);
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

    fetchRequirement();
  }, [resolvedParams.requirementId, router]);

  const handleViewSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setIsViewModalOpen(true);
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || !requirement) return;

    try {
      const gradeValue = parseFloat(grade);
      if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > requirement.scoreBase) {
        toast.error(`Grade must be between 0 and ${requirement.scoreBase}`);
        return;
      }

      const response = await submitGrade(
        selectedSubmission.id,
        gradeValue,
        feedback
      );

      if (!response.success) {
        throw new Error(response.error);
      }

      toast.success('Grade submitted successfully');
      setIsGradeModalOpen(false);
      setIsViewModalOpen(false);
      setGrade('');
      setFeedback('');
      
      // Refresh the requirement data
      const refreshResponse = await getTeacherRequirementDetail(resolvedParams.requirementId);
      if (refreshResponse.success && refreshResponse.data) {
        setRequirement(refreshResponse.data as unknown as RequirementDetail);
      }
    } catch (error) {
      console.error('Error submitting grade:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit grade');
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

      {/* Requirement Details */}
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 p-6 bg-pink-50/50 rounded-xl">
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

      {/* Submissions List */}
      <div className="bg-white rounded-xl shadow-lg p-8 border border-pink-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Submissions</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-pink-50 border-b border-pink-100">
                <th className="p-4 text-left font-semibold text-[#800000]">Student Email</th>
                <th className="p-4 text-left font-semibold text-[#800000]">Submission Title</th>
                <th className="p-4 text-left font-semibold text-[#800000]">Grading Status</th>
                <th className="p-4 text-left font-semibold text-[#800000]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50">
              {requirement.submissions
                .filter(submission => submission.status === 'complete')
                .map((submission) => (
                <tr key={submission.id} className="hover:bg-pink-50/50">
                  <td className="p-4 text-gray-700">
                    {submission.studentEmail}
                  </td>
                  <td className="p-4 text-gray-700 font-medium">
                    {submission.title}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      submission.graded 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {submission.graded ? 'Graded' : 'Pending'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleViewSubmission(submission)}
                      className="p-1.5 rounded-md hover:bg-pink-100 text-[#800000] transition-colors duration-200"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Submission Modal */}
      {isViewModalOpen && selectedSubmission && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Submission Details</h2>
              <div className="space-y-6">
                {/* Student Information */}
                <div className="bg-pink-50/50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Student Information</h3>
                  <p className="text-gray-700">
                    <span className="font-medium">Email:</span> {selectedSubmission.studentEmail || 'No student information available'}
                  </p>
                </div>

                {/* Submission Information */}
                <div className="bg-pink-50/50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Submission Information</h3>
                  <div className="space-y-2">
                    <p className="text-gray-700">
                      <span className="font-medium">Title:</span> {selectedSubmission.title || 'No title provided'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Status:</span> {selectedSubmission.status === 'complete' ? 'Completed' : 'Incomplete'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Submitted:</span> {selectedSubmission.createdAt ? new Date(selectedSubmission.createdAt).toLocaleString() : 'Not submitted yet'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Last Updated:</span> {selectedSubmission.updatedAt ? new Date(selectedSubmission.updatedAt).toLocaleString() : 'Not available'}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="bg-pink-50/50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Content</h3>
                  {selectedSubmission.content ? (
                    <div 
                      className="text-gray-700 prose prose-lg mx-auto [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6 [&>p]:mb-6 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mb-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-bold [&>h3]:mb-3 [&>blockquote]:border-l-4 [&>blockquote]:border-[#800000] [&>blockquote]:pl-6 [&>blockquote]:italic [&>pre]:bg-gray-100 [&>pre]:p-6 [&>pre]:rounded-lg [&>code]:bg-gray-100 [&>code]:px-2 [&>code]:py-1 [&>code]:rounded [&>a]:text-[#800000] [&>a]:underline [&>a]:font-medium"
                      dangerouslySetInnerHTML={{ __html: selectedSubmission.content }}
                    />
                  ) : (
                    <p className="text-gray-500 italic">No content provided yet</p>
                  )}
                </div>

                {/* Attached File - Only show if not a forum requirement */}
                {requirement.type !== 'FORUM' && (
                  <div className="bg-pink-50/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Attached File</h3>
                    {selectedSubmission.filePath ? (
                      selectedSubmission.filePath.toLowerCase().endsWith('.pdf') ? (
                        <a 
                          href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lms/${selectedSubmission.filePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#800000] hover:text-[#800000]/80 font-medium inline-flex items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                          </svg>
                          View PDF
                        </a>
                      ) : selectedSubmission.filePath.toLowerCase().endsWith('.jpg') || 
                           selectedSubmission.filePath.toLowerCase().endsWith('.jpeg') || 
                           selectedSubmission.filePath.toLowerCase().endsWith('.png') ? (
                        <div className="space-y-4">
                          <img 
                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lms/${selectedSubmission.filePath}`}
                            alt="Uploaded image"
                            className="max-w-full h-auto rounded-lg shadow-md border border-gray-200"
                            style={{ maxHeight: '400px' }}
                          />
                          <a 
                            href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lms/${selectedSubmission.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#800000] hover:text-[#800000]/80 font-medium inline-flex items-center gap-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                            </svg>
                            View Image
                          </a>
                        </div>
                      ) : (
                        <a 
                          href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lms/${selectedSubmission.filePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#800000] hover:text-[#800000]/80 font-medium inline-flex items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                          </svg>
                          View File
                        </a>
                      )
                    ) : (
                      <p className="text-gray-500 italic">No file attached yet</p>
                    )}
                  </div>
                )}

                {/* Grading Information */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Grading Information</h3>
                  {selectedSubmission.graded ? (
                    <div className="space-y-2">
                      <p className="text-gray-700">
                        <span className="font-medium">Score:</span> {selectedSubmission.score}/{requirement.scoreBase}
                      </p>
                      {selectedSubmission.feedback ? (
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Feedback:</p>
                          <div 
                            className="text-gray-600 prose prose-sm"
                            dangerouslySetInnerHTML={{ __html: selectedSubmission.feedback }}
                          />
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No feedback provided yet</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Not graded yet</p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 flex justify-end gap-4">
              {!selectedSubmission.graded && (
                <button
                  onClick={() => setIsGradeModalOpen(true)}
                  className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#800000]/90 transition-colors"
                >
                  Grade Submission
                </button>
              )}
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Modal */}
      {isGradeModalOpen && selectedSubmission && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Grade Submission</h2>
              <div className="space-y-6">
                {/* Grade Input */}
                <div>
                  <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">
                    Grade (out of {requirement?.scoreBase})
                  </label>
                  <input
                    type="number"
                    id="grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    min="0"
                    max={requirement?.scoreBase}
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000] text-gray-900"
                    placeholder="Enter grade"
                  />
                </div>

                {/* Feedback Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feedback
                  </label>
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <RichTextEditor
                      content={feedback}
                      onChange={setFeedback}
                      placeholder="Enter feedback for the student"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 flex justify-end gap-4">
              <button
                onClick={() => {
                  setIsGradeModalOpen(false);
                  setGrade('');
                  setFeedback('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGradeSubmission}
                className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#800000]/90 transition-colors"
              >
                Submit Grade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
