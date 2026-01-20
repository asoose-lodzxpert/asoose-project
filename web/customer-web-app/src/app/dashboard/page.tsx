'use client';
import { createClient } from "../../../utils/supabase/client"
import { useEffect, useState } from 'react'
import { Copy, Check, User, Key } from 'lucide-react'

// Force dynamic rendering to prevent prerendering errors
export const dynamic = 'force-dynamic';

const Dashboard = () => {
    const supabase = createClient()
    const [token, setToken] = useState<string>('')
    const [role, setRole] = useState<string>('')
    const [email, setEmail] = useState<string>('')
    const [copied, setCopied] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const getUserData = async () => {
            try {
                // Get the current session
                const { data: sessionData } = await supabase.auth.getSession()
                
                if (sessionData.session) {
                    setToken(sessionData.session.access_token)
                    setEmail(sessionData.session.user.email || '')
                    
                    // Get user's role from profiles table
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', sessionData.session.user.id)
                        .single()
                    
                    setRole(profile?.role || 'No role assigned')
                } else {
                    console.log('No user is logged in')
                }
            } catch (error) {
                console.error('Error fetching user data:', error)
            } finally {
                setLoading(false)
            }
        }
        
        getUserData()
    }, [])

    const copyToken = async () => {
        try {
            await navigator.clipboard.writeText(token)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a]">
                <div className="text-gray-600 dark:text-gray-400">Loading...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0a] p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-8">Dashboard</h1>
                
                <div className="space-y-6">
                    {/* User Info Card */}
                    <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <User className="w-5 h-5 text-yellow-500" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">User Information</h2>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
                                <p className="text-gray-900 dark:text-white font-mono text-sm mt-1">{email}</p>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Role</label>
                                <div className="mt-1">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                                        role.includes('ADMIN') 
                                            ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400' 
                                            : 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400'
                                    }`}>
                                        {role}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Auth Token Card */}
                    <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Key className="w-5 h-5 text-yellow-500" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Authentication Token</h2>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 block mb-2">
                                    Access Token (JWT)
                                </label>
                                <div className="relative">
                                    <div className="bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg p-4 pr-12 overflow-auto">
                                        <code className="text-xs font-mono text-gray-900 dark:text-white break-all">
                                            {token}
                                        </code>
                                    </div>
                                    <button
                                        onClick={copyToken}
                                        className="absolute top-3 right-3 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                        title="Copy token"
                                    >
                                        {copied ? (
                                            <Check className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        )}
                                    </button>
                                </div>
                                {copied && (
                                    <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                                        ✓ Token copied to clipboard!
                                    </p>
                                )}
                            </div>
                            
                            <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg p-3">
                                <p className="text-xs text-yellow-800 dark:text-yellow-400">
                                    ⚠️ Keep this token secure. Don't share it publicly or commit it to version control.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Decode Token Section (Optional) */}
                    <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Token Info</h3>
                        <div className="space-y-2 text-sm">
                            <p className="text-gray-600 dark:text-gray-400">
                                You can decode this JWT token at{' '}
                                <a 
                                    href="https://jwt.io" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-yellow-600 dark:text-yellow-400 hover:underline font-medium"
                                >
                                    jwt.io
                                </a>
                                {' '}to inspect its contents.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard