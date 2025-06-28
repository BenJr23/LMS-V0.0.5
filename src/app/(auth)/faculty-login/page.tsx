'use client';

import { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import Image from 'next/image';
import { useSignIn } from '@clerk/nextjs';
import toast from 'react-hot-toast';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [focused, setFocused] = useState({ email: false, password: false });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, setActive, isLoaded } = useSignIn();

  // More flexible email regex that accepts common email formats
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,14}$/;

  const isEmailValid = emailRegex.test(email);
  const isPasswordValid = passwordRegex.test(password);

  const inputClass = (isValid: boolean, fieldTouched: boolean, value: string, isFocused: boolean) => {
    if (isFocused && value === '') {
      return 'w-full h-10 pl-10 pr-4 border rounded-md placeholder-gray-400 text-gray-800 border-gray-400 focus:ring-2 focus:ring-gray-300';
    }

    return `w-full h-10 pl-10 pr-4 border rounded-md placeholder-gray-400 text-gray-800 focus:outline-none transition-all duration-200 ${fieldTouched && value !== ''
      ? isValid
        ? 'border-green-500 focus:ring-2 focus:ring-green-300'
        : 'border-red-500 focus:ring-2 focus:ring-red-300'
      : 'border-gray-300 focus:ring-2 focus:ring-gray-300'
    }`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!isLoaded) {
      setIsLoading(false);
      return;
    }

    try {
      // Step 1: Call the fetch-faculty API with the inputted email
      const facultyRes = await fetch(`/api/fetch-faculty?email=${encodeURIComponent(email)}`);
      const facultyData = await facultyRes.json();
      if (!facultyRes.ok || !facultyData.role) {
        const errorMsg = facultyData.error || 'Faculty not found or not authorized.';
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      // Step 1.5: Validate role is one of the allowed roles
      const validRoles = ['faculty', 'admin'];
      if (!validRoles.includes(facultyData.role)) {
        const errorMsg = 'Invalid email or password';
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      // Step 2: Handle sign-in directly
      console.log('Attempting to sign in...');
      const signInAttempt = await signIn.create({
        identifier: email,
      });
      
      const result = await signInAttempt.attemptFirstFactor({
        strategy: "password",
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: result.createdSessionId });
        console.log('Sign-in completed, session is ready...');
        
        // Set role as private metadata via API
        const roleResponse = await fetch('/api/nr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: facultyData.role }),
        });
        
        const roleResult = await roleResponse.json();
        console.log('Role setting result:', roleResult);
        
        if (roleResult.success) {
          console.log('Session created successfully for', email);
          
          // Step 3: Redirect based on role
          if (facultyData.role === 'faculty') {
            window.location.href = '/faculty/dashboard';
          } else if (facultyData.role === 'admin') {
            window.location.href = '/admin/dashboard';
          } else {
            window.location.href = '/';
          }
        } else {
          console.log('Role setting failed:', roleResult.error);
          setError(roleResult.error || 'Failed to set role');
          toast.error(roleResult.error || 'Failed to set role');
        }
      } else {
        console.log('Sign-in not complete, status:', signInAttempt.status);
        setError('Verification step required.');
        toast.error('Verification step required.');
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      let errorMsg = 'Invalid email or password';
      if (
        typeof err === 'object' &&
        err !== null &&
        'errors' in err &&
        Array.isArray((err as { errors?: unknown }).errors)
      ) {
        const errorsArr = (err as { errors: { message?: string }[] }).errors;
        errorMsg = errorsArr[0]?.message || errorMsg;
      }
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/assets/sis_bg.webp)' }}
      />

      {/* Login Sidebar */}
      <div className="absolute right-0 top-0 h-full w-full md:w-[450px] bg-white shadow-lg">
        <div className="h-full flex flex-col justify-center p-8">
          <div className="text-center mb-8">
            <Image src="/favicon.ico" alt="Favicon" width={120} height={120} className="mx-auto mb-2" />
            <h2 className="text-3xl font-bold text-red-800 mb-1">SJSFI</h2>
            <p className="text-sm text-gray-600 mb-2">AI-POWERED</p>
            <h1 className="text-2xl font-bold text-red-800">Learning Management System</h1>
            <p className="text-gray-600 text-sm">Sign in to access your account</p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            {/* Email */}
            <div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Mail className="text-gray-500" size={18} />
                </div>
                <input
                  type="email"
                  placeholder="Email address"
                  className={inputClass(isEmailValid, touched.email, email, focused.email)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, email: true }));
                    setFocused((prev) => ({ ...prev, email: false }));
                  }}
                  onFocus={() => setFocused((prev) => ({ ...prev, email: true }))}
                  autoComplete="off"
                  disabled={isLoading}
                />
              </div>
              <div className="min-h-[1rem]">
                {touched.email && email !== '' && !isEmailValid && (
                  <p className="text-[10px] text-red-600 mt-1">
                    Please enter a valid email address
                  </p>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Lock className="text-gray-500" size={18} />
                </div>
                <input
                  type="password"
                  placeholder="Password"
                  className={inputClass(isPasswordValid, touched.password, password, focused.password)}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, password: true }));
                    setFocused((prev) => ({ ...prev, password: false }));
                  }}
                  onFocus={() => setFocused((prev) => ({ ...prev, password: true }))}
                  autoComplete="off"
                  disabled={isLoading}
                />
              </div>
              <div className="min-h-[1rem]">
                {touched.password && password !== '' && !isPasswordValid && (
                  <p className="text-[10px] text-red-600 mt-1">
                    Password must be 8–14 chars with 1 uppercase, 1 lowercase, 1 special character.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center space-x-1 text-gray-700">
                <input type="checkbox" disabled={isLoading} />
                <span>Remember me</span>
              </label>
              <a href="#" className="text-gray-700 hover:underline font-medium">
                Forgot your password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 rounded-md transition ${isLoading
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-red-700 text-white hover:bg-red-800'
                }`}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>

            {error && <p className="text-xs text-red-600 text-center mt-2">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}