'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, X, Loader2, MessageCircle, Send, Bot } from 'lucide-react';
import { getStudentRequirementDetail } from '@/app/_actions/requirement';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import RichTextEditor from '@/components/RichTextEditor';
import { createSubmission, updateSubmissionStatus, editSubmission } from '@/app/_actions/submission';
import { getAIResponse } from '@/app/_actions/ai';
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

interface ForumPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirementId: string;
  onSuccess: () => void;
  initialData?: { title: string; content: string };
}

function ForumPostModal({ isOpen, onClose, requirementId, onSuccess, initialData }: ForumPostModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setContent('');
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
      
      const response = initialData 
        ? await editSubmission({
            submissionId: requirementId,
            title,
            content,
            filePath: ''
          })
        : await createSubmission({
            requirementId,
            title,
            content,
            filePath: ''
          });

      if (response.success) {
        toast.success(initialData ? 'Post updated successfully' : 'Post created successfully');
        resetForm();
        onSuccess();
        onClose();
      } else {
        toast.error(response.error || (initialData ? 'Failed to update post' : 'Failed to create post'));
      }
    } catch (error) {
      console.error('Error handling post:', error);
      toast.error(initialData ? 'Failed to update post' : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            {initialData ? 'Edit Forum Post' : 'Create Forum Post'}
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
              Post Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-gray-900 placeholder-gray-500"
              placeholder="Enter post title"
              required
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Post Content
            </label>
            <div className="border border-gray-300 rounded-lg">
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Write your post content..."
              />
            </div>
          </div>

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
                  {initialData ? 'Updating...' : 'Posting...'}
                </>
              ) : (
                initialData ? 'Update Post' : 'Create Post'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface PlagiarismMatch {
  source: string;
  percentage: number;
  matchedText: string;
  originalText: string;
}

interface PlagiarismCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isChecking: boolean;
  checkResults?: {
    similarity: number;
    matches: PlagiarismMatch[];
  };
}

function PlagiarismCheckModal({ isOpen, onClose, onConfirm, isChecking, checkResults }: PlagiarismCheckModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-full">
              <MessageSquare className="w-6 h-6 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Plagiarism Check Results</h2>
          </div>
          
          {!checkResults ? (
            <p className="text-gray-600">
              Checking your post for potential plagiarism. This may take a few moments...
            </p>
          ) : (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Overall Similarity</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    checkResults.similarity < 15 ? 'bg-green-100 text-green-700' :
                    checkResults.similarity < 30 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {checkResults.similarity}% Similar
                  </span>
                </div>
                
                {checkResults.matches.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700">Matched Sources:</h4>
                    <div className="space-y-4">
                      {checkResults.matches.map((match, index) => (
                        <div key={index} className="p-4 bg-white rounded border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">{match.source}</span>
                            <span className="text-sm font-medium text-gray-900">{match.percentage}% match</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Matched Text:</p>
                              <p className="text-sm text-gray-700 bg-yellow-50 p-2 rounded">{match.matchedText}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Original Source:</p>
                              <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded">{match.originalText}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-lg bg-blue-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Recommendation</h3>
                <p className="text-gray-600">
                  {checkResults.similarity < 15 ? 
                    "Your post shows low similarity with other sources. You can proceed with submission." :
                    checkResults.similarity < 30 ?
                    "Your post shows moderate similarity. Please review the matched sources and ensure proper citations." :
                    "Your post shows high similarity. Please review and revise your content to ensure originality."
                  }
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="p-6 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isChecking}
          >
            {checkResults ? 'Close' : 'Cancel'}
          </button>
          {checkResults && (
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                checkResults.similarity < 30 
                  ? 'bg-[#800000] text-white hover:bg-[#800000]/90' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={checkResults.similarity >= 30}
            >
              Complete Post
            </button>
          )}
          {!checkResults && (
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#800000]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                'Check Plagiarism'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForumRequirement({ 
  id,
  requirementId
}: { 
  id: string;
  requirementId: string;
}) {
  const router = useRouter();
  const [requirement, setRequirement] = useState<RequirementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPlagiarismModalOpen, setIsPlagiarismModalOpen] = useState(false);
  const [isCheckingPlagiarism, setIsCheckingPlagiarism] = useState(false);
  const [checkResults, setCheckResults] = useState<{
    similarity: number;
    matches: PlagiarismMatch[];
  } | undefined>();
  // --- AI Chatbot State ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; text: string; isUser: boolean; timestamp: Date }>>([
    {
      id: '1',
      text: "Hello! I'm your AI study assistant. How can I help you with this requirement?",
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
        if (response.data.type !== 'FORUM') {
          router.push(`/student/dashboard/${id}/requirements/${requirementId}`);
          return;
        }
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

  const handlePlagiarismCheck = async () => {
    if (!requirement?.submission) return;

    try {
      setIsCheckingPlagiarism(true);
      // Simulate plagiarism check delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock plagiarism check results
      const mockResults = {
        similarity: Math.floor(Math.random() * 40), // Random similarity between 0-40%
        matches: [
          {
            source: "Academic Database - Research Paper",
            percentage: Math.floor(Math.random() * 20),
            matchedText: "The implementation of machine learning algorithms in educational systems has shown significant improvements in student performance and engagement.",
            originalText: "The implementation of machine learning algorithms in educational systems has shown significant improvements in student performance and engagement."
          },
          {
            source: "Online Journal Article",
            percentage: Math.floor(Math.random() * 15),
            matchedText: "Recent studies indicate that blended learning approaches combining traditional classroom methods with digital tools yield better learning outcomes.",
            originalText: "Recent studies indicate that blended learning approaches combining traditional classroom methods with digital tools yield better learning outcomes."
          },
          {
            source: "Conference Proceedings",
            percentage: Math.floor(Math.random() * 10),
            matchedText: "The integration of artificial intelligence in assessment systems has revolutionized the way educators evaluate student progress.",
            originalText: "The integration of artificial intelligence in assessment systems has revolutionized the way educators evaluate student progress."
          }
        ].filter(match => match.percentage > 0)
      };

      setCheckResults(mockResults);

      // Update submission with plagiarism results
      const response = await updateSubmissionStatus({
        submissionId: requirement.submission.id,
        status: 0, // Keep as draft
        plagiarismScore: mockResults.similarity,
        plagiarismContent: JSON.stringify(mockResults.matches)
      });

      if (!response.success) {
        toast.error('Failed to save plagiarism results');
      }
    } catch (error) {
      console.error('Error checking plagiarism:', error);
      toast.error('Failed to check plagiarism');
    } finally {
      setIsCheckingPlagiarism(false);
    }
  };

  const handleCompleteSubmission = async () => {
    if (!requirement?.submission) return;

    try {
      const response = await updateSubmissionStatus({
        submissionId: requirement.submission.id,
        status: 1 // Complete
      });

      if (response.success) {
        toast.success('Post completed successfully');
        fetchRequirement();
        setIsPlagiarismModalOpen(false);
        setCheckResults(undefined);
      } else {
        toast.error(response.error || 'Failed to complete post');
      }
    } catch (error) {
      console.error('Error completing post:', error);
      toast.error('Failed to complete post');
    }
  };

  const handleSubmissionSuccess = () => {
    fetchRequirement();
  };

  // --- AI Chatbot Handlers ---
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
        </div>

        <div className="prose max-w-none">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Description</h3>
          <div 
            className="text-gray-700 prose prose-lg mx-auto [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6 [&>p]:mb-6 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mb-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-bold [&>h3]:mb-3 [&>blockquote]:border-l-4 [&>blockquote]:border-[#800000] [&>blockquote]:pl-6 [&>blockquote]:italic [&>pre]:bg-gray-100 [&>pre]:p-6 [&>pre]:rounded-lg [&>code]:bg-gray-100 [&>code]:px-2 [&>code]:py-1 [&>code]:rounded [&>a]:text-[#800000] [&>a]:underline [&>a]:font-medium"
            dangerouslySetInnerHTML={{ __html: requirement.content }}
          />
        </div>
      </div>

      {/* Forum Post Section */}
      {requirement.submission ? (
        <div className="bg-white rounded-xl shadow-lg p-8 border border-pink-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
            <MessageSquare className="w-6 h-6 mr-3 text-[#800000]" />
            Your Forum Post
          </h2>
          
          <div className="space-y-8">
            <div className="p-6 bg-pink-50/50 rounded-xl">
              <h3 className="text-base font-semibold text-gray-700 mb-2">Status</h3>
              <p className="text-gray-600 text-lg">
                {requirement.submission.status === 1 ? 'Complete' : 'Draft'}
              </p>
            </div>

            <div className="p-6 bg-pink-50/50 rounded-xl">
              <h3 className="text-base font-semibold text-gray-700 mb-2">Posted On</h3>
              <p className="text-gray-600 text-lg">
                {new Date(requirement.submission.createdAt).toLocaleString()}
              </p>
            </div>

            {requirement.submission.content && (
              <div className="p-6 bg-pink-50/50 rounded-xl">
                <h3 className="text-base font-semibold text-gray-700 mb-3">Post Content</h3>
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
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-6 py-3 border border-[#800000] text-[#800000] rounded-lg hover:bg-pink-50 transition-colors text-lg font-medium"
                >
                  Edit Post
                </button>
                <button
                  onClick={() => setIsPlagiarismModalOpen(true)}
                  className="px-6 py-3 bg-[#800000] text-white rounded-lg hover:bg-[#800000]/90 transition-colors text-lg font-medium"
                >
                  Check for Plagiarism
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-8 border border-pink-100">
          <div className="text-center py-12">
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="px-6 py-3 bg-[#800000] text-white rounded-lg hover:bg-[#800000]/90 transition-colors text-lg font-medium"
            >
              Create Forum Post
            </button>
          </div>
        </div>
      )}

      {/* Add the Forum Post Modal */}
      <ForumPostModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        requirementId={requirementId}
        onSuccess={handleSubmissionSuccess}
      />

      {/* Add the Edit Forum Post Modal */}
      <ForumPostModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        requirementId={requirement.submission?.id || ''}
        onSuccess={handleSubmissionSuccess}
        initialData={requirement.submission ? {
          title: requirement.submission.title,
          content: requirement.submission.content
        } : undefined}
      />

      {/* Add the Plagiarism Check Modal */}
      <PlagiarismCheckModal
        isOpen={isPlagiarismModalOpen}
        onClose={() => {
          setIsPlagiarismModalOpen(false);
          setCheckResults(undefined);
        }}
        onConfirm={checkResults ? handleCompleteSubmission : handlePlagiarismCheck}
        isChecking={isCheckingPlagiarism}
        checkResults={checkResults}
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