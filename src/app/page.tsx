'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { GraduationCap, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Home() {
  const router = useRouter();

  const handleStudentLogin = () => {
    try {
      router.push('/student-login');
    } catch (error) {
      console.error('Failed to navigate to student login:', error);
      toast.error('Failed to access student login');
    }
  };

  const handleFacultyLogin = () => {
    try {
      router.push('/faculty-login');
    } catch (error) {
      console.error('Failed to navigate to faculty login:', error);
      toast.error('Failed to access faculty login');
    }
  };

  return (
    <div className="flex h-screen w-screen bg-white min-width-[360px]">
      <div className="container">
        {/* Main Screen - BG IMAGE */}
        <div
          style={{ backgroundImage: "url('/assets/sis_bg.webp')" }}
          className="h-screen w-screen bg-cover bg-center"
        >
          {/* LOGIN FORM BG */}
          <div className="absolute right-0 w-full md:w-[450px] min-h-screen min-w-[360px] flex items-center justify-center overflow-hidden bg-white/70 backdrop-blur-[20px] backdrop-saturate-[168%] shadow-md m-0 rounded-none flex flex-col bg-clip-border border border-transparent break-words">
            {/* WRAPPER */}
            <div className="flex flex-col items-center w-full px-8">
              {/* HEADER */}
              <div className="flex flex-col items-center justify-center w-full mb-8">
                <Image
                  src="/assets/sjsfi_logo.svg"
                  alt="SJSFI Logo"
                  width={90}
                  height={90}
                  className="mb-4"
                />
                <h1 className="text-3xl text-center text-[#800000] w-full">
                  Welcome to <span className='font-bold'>SJSFI-LMS Portal</span>
                </h1>
              </div>

              {/* BODY */}
              <div className="flex flex-col items-center justify-center w-full">
                <p className='text-center text-black text-sm mb-6'>
                  Please click or tap your role to sign in
                </p>

                <div className="w-full space-y-4">
                  <div className="w-full">
                    <button
                      onClick={handleStudentLogin}
                      className="w-full py-3 px-4 bg-[#800000] text-white rounded-md hover:bg-[#600000] transition-colors flex items-center justify-center gap-3"
                    >
                      <GraduationCap size={24} />
                      <span className="text-lg">Student</span>
                    </button>
                  </div>
                  <div className="w-full">
                    <button
                      onClick={handleFacultyLogin}
                      className="w-full py-3 px-4 bg-[#ffd700] text-white rounded-md hover:bg-[#DAA520] transition-colors flex items-center justify-center gap-3"
                    >
                      <User size={24} />
                      <span className="text-lg">Faculty</span>
                    </button>
                  </div>

                  {/* Footer */}
                  <div className="text-center text-sm text-gray-500 mt-8">
                    <p>© 2024 SJSFI. All rights reserved.</p>
                    <p className="mt-1">For technical support, contact your administrator.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}