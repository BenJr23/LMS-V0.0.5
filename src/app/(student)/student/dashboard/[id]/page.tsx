'use client';

import { useState, useEffect, use } from 'react';
import { Bell, FileText, ClipboardList, File, FileText as FileTextIcon, UserCircle2, Calendar, MessageSquare, HelpCircle, Users, Folder } from 'lucide-react';
import { getStudentSubjectInstance } from '@/app/_actions/subjectInstance';
import { getStudentRequirements } from '@/app/_actions/requirement';
import { getImageUrl } from '@/app/_actions/uploadIcon';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface SubjectInstance {
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
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  moduleFolders: Array<{
    id: string;
    folderName: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  uploadedContents: Array<{
    id: string;
    fileName: string;
    filePath: string;
    moduleFolderId: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

interface Submission {
  id: string;
  title: string;
  content: string;
  filePath: string;
  graded: boolean;
  score: number | null;
  feedback: string | null;
  status: number;
  createdAt: Date;
  updatedAt: Date;
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
  submissionStatus: 'GRADED' | 'SUBMITTED' | 'NOT_SUBMITTED';
  submission: Submission | null;
}

export default function SubjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [activeTab, setActiveTab] = useState('announcements');
  const [subjectInstance, setSubjectInstance] = useState<SubjectInstance | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string>('');

  const REQUIREMENT_TYPES = [
    { key: 'FORUM', label: 'FORUM', icon: <MessageSquare className="w-5 h-5" /> },
    { key: 'QUIZ', label: 'QUIZ', icon: <HelpCircle className="w-5 h-5" /> },
    { key: 'ASSIGNMENT', label: 'ASSIGNMENT', icon: <FileText className="w-5 h-5" /> },
    { key: 'ACTIVITY', label: 'ACTIVITY', icon: <Users className="w-5 h-5" /> }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [subjectData, requirementsData] = await Promise.all([
          getStudentSubjectInstance(resolvedParams.id),
          getStudentRequirements(resolvedParams.id)
        ]);

        if (requirementsData.success && requirementsData.data) {
          setRequirements(requirementsData.data);
        } else {
          setRequirements([]);
        }

        setSubjectInstance(subjectData);
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
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedParams.id]);

  const tabs = [
    { id: 'announcements', label: 'Announcements', icon: <Bell className="w-4 h-4 mr-1" /> },
    { id: 'files', label: 'Files', icon: <FileText className="w-4 h-4 mr-1" /> },
    { id: 'requirements', label: 'Requirements', icon: <ClipboardList className="w-4 h-4 mr-1" /> },
  ];

  const handleViewRequirement = (requirementId: string) => {
    router.push(`/student/dashboard/${resolvedParams.id}/requirements/${requirementId}`);
  };

  const getRequirementStatus = (requirement: Requirement) => {
    if (!requirement.submission) {
      const isOverdue = new Date(requirement.deadline) < new Date();
      return {
        text: isOverdue ? 'Overdue' : 'Not Submitted',
        color: isOverdue ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
      };
    }

    if (requirement.submission.graded) {
      return {
        text: `Graded (${requirement.submission.score}/${requirement.scoreBase})`,
        color: 'bg-green-100 text-green-800'
      };
    }

    if (requirement.submission.status === 1) {
      return {
        text: 'Submitted',
        color: 'bg-blue-100 text-blue-800'
      };
    }

    return {
      text: 'Draft',
      color: 'bg-yellow-100 text-yellow-800'
    };
  };

  if (loading) {
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
      <Toaster position="top-right" />
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
        </div>
      </div>

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
            {subjectInstance.announcements.length === 0 ? (
              <div className="bg-white rounded-lg p-8 shadow border border-pink-100 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-700 mb-2">No Announcements Yet</h4>
                <p className="text-gray-500">Your teacher hasn't posted any announcements yet. Check back later for updates.</p>
              </div>
            ) : (
              subjectInstance.announcements.map((item) => (
                <div key={item.id} className="bg-white rounded-lg p-5 shadow flex gap-4 border-l-4 border-[#800000]/80">
                  <div className="flex flex-col items-center pt-1">
                    <Bell className="text-[#800000] w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-[#800000] text-lg">{item.title}</h4>
                    <p className="text-xs text-gray-500 mb-1">{subjectInstance.teacherName} • {formatDate(item.createdAt)}</p>
                    <div
                      className="mt-1 text-gray-800 text-sm prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: item.content }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#800000] mb-2 flex items-center gap-2">
              <FileTextIcon className="w-5 h-5" /> Course Files
            </h3>
            {subjectInstance.moduleFolders.length === 0 ? (
              <div className="bg-white rounded-lg p-8 shadow border border-pink-100 text-center">
                <FileTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-700 mb-2">No Files Available</h4>
                <p className="text-gray-500">Your teacher hasn&apos;t uploaded any course materials yet. Check back later for files.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {subjectInstance.moduleFolders.map((mod) => (
                  <div key={mod.id} className="bg-white rounded-lg shadow border border-pink-100 overflow-hidden">
                    {/* Folder Header */}
                    <div className="bg-pink-50 border-b border-pink-100 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Folder className="w-5 h-5 text-[#800000]" />
                        <h4 className="font-bold text-lg text-gray-900">{mod.folderName}</h4>
                      </div>
                    </div>
                    
                    {/* Files Content */}
                    <div className="p-4">
                      {subjectInstance.uploadedContents.filter(content => content.moduleFolderId === mod.id).length === 0 ? (
                        <div className="text-gray-400 italic text-sm">No files available for this module.</div>
                      ) : (
                        <ul className="space-y-2">
                          {subjectInstance.uploadedContents
                            .filter(content => content.moduleFolderId === mod.id)
                            .map((file) => (
                              <li key={file.id} className="flex items-center justify-between text-sm text-gray-700 py-2 px-3 rounded-md hover:bg-pink-50 transition-colors">
                                <a
                                  href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lms/${file.filePath}`}
                                  download
                                  className="flex items-center gap-2 hover:text-[#800000] transition-colors cursor-pointer"
                                  title={`Download ${file.fileName}`}
                                >
                                  {file.fileName.toLowerCase().endsWith('.pdf') ? <FileText className="w-4 h-4 text-red-500" /> : 
                                   file.fileName.toLowerCase().endsWith('.doc') || file.fileName.toLowerCase().endsWith('.docx') ? <FileText className="w-4 h-4 text-blue-500" /> :
                                   file.fileName.toLowerCase().endsWith('.xlsx') ? <FileText className="w-4 h-4 text-green-500" /> :
                                   file.fileName.toLowerCase().endsWith('.pptx') ? <FileText className="w-4 h-4 text-orange-500" /> : 
                                   <File className="w-4 h-4 text-gray-400" />}
                                  <span className="hover:underline">{file.fileName}</span>
                                </a>
                                <span className="text-xs text-gray-500">
                                  {new Date(file.updatedAt).toLocaleDateString()}
                                </span>
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Requirements Tab */}
        {activeTab === 'requirements' && (
          <div>
            {REQUIREMENT_TYPES.map(({ key, label, icon }) => {
              const typeRequirements = requirements.filter(req => req.type === key);
              return (
                <div key={key} className="mb-8">
                  <h4 className="text-lg font-bold text-[#800000] uppercase tracking-wide flex items-center gap-2 mb-3">
                    {icon}
                    {label}
                  </h4>
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-pink-100">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-pink-50 border-b border-pink-100">
                            <th className="p-4 text-left font-semibold text-[#800000] w-[15%]">Requirement</th>
                            <th className="p-4 text-left font-semibold text-[#800000] w-[25%]">Title</th>
                            <th className="p-4 text-left font-semibold text-[#800000] w-[20%]">Due Date</th>
                            <th className="p-4 text-left font-semibold text-[#800000] w-[15%]">Points</th>
                            <th className="p-4 text-left font-semibold text-[#800000] w-[15%]">Status</th>
                            <th className="p-4 text-left font-semibold text-[#800000] w-[10%]">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-pink-50">
                          {typeRequirements.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-gray-500 italic">
                                No {label.toLowerCase()} available yet.
                              </td>
                            </tr>
                          ) : (
                            typeRequirements.map((requirement) => {
                              const status = getRequirementStatus(requirement);
                              return (
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
                                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${status.color}`}>
                                      {status.text}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <button
                                      onClick={() => handleViewRequirement(requirement.id)}
                                      className="px-3 py-1.5 text-sm font-medium text-[#800000] bg-pink-50 hover:bg-pink-100 rounded-md transition-colors duration-150"
                                    >
                                      {requirement.submission ? 'View' : 'Start'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
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