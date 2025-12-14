"use client"
import React, { useState } from 'react';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '../../../utils/supabase/client';

const ForgotPasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const supabase = createClient();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError("Input field cannot be empty");
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        throw error;
      }
      
      // Show success state
      setEmailSent(true);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Check your email</h1>
            <p className="text-sm text-gray-600">
              We've sent a password reset link to <span className="font-medium text-gray-900">{email}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Didn't receive the email?</p>
              <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                <li>Check your spam or junk folder</li>
                <li>Make sure the email address is correct</li>
                <li>Wait a few minutes and check again</li>
              </ul>
            </div>

            <button
              onClick={() => {
                setEmailSent(false);
                setEmail('');
                setError('');
              }}
              className="w-full bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Try another email
            </button>

            <Link
              href="/sign-in"
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={16} />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/sign-in"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Forgot password?</h1>
          <p className="text-sm text-gray-600">
            No worries, we'll send you reset instructions
          </p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}

          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </span>
            ) : (
              'Reset password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;