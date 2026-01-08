'use client';

import { createClient } from "../../../utils/supabase/client"
import { useEffect } from 'react'

const Dashboard = ()=> {
    const supabase = createClient()

    useEffect(() => {
        const getToken = async () => {
            // Get the current session
            const { data } = await supabase.auth.getSession()
            console.log(data)
            if (data.session) {
                // Access token is available in the session
                console.log('User Token (JWT):', data.session.access_token)
            } else {
                console.log('No user is logged in')
            }
        }
        
        getToken()
    }, []) // Empty dependency array means this runs once when component mounts

    return <div>Dashboard page</div>
}

export default Dashboard