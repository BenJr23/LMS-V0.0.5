import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json();
    
    console.log('setRole API called with:', { role });
    
    // Check if CLERK_SECRET_KEY is available
    if (!process.env.CLERK_SECRET_KEY) {
      console.error('CLERK_SECRET_KEY environment variable is not set');
      return NextResponse.json(
        { success: false, error: 'Server configuration error: CLERK_SECRET_KEY not found' },
        { status: 500 }
      );
    }
    
    console.log('Getting current user...');
    const user = await currentUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    console.log('Getting Clerk client with secret key...');
    const client = await clerkClient();
    console.log('Clerk client obtained, updating user metadata...');
    
    await client.users.updateUserMetadata(user.id, {
      privateMetadata: { role },
    });
    
    console.log(`Role '${role}' set as private metadata for user ${user.id}`);
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error in setRole API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to set role' 
      },
      { status: 500 }
    );
  }
}
