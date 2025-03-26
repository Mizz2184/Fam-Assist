import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { getGroceryListById, checkListPermission } from '@/lib/services/groceryListService';
import { GroceryList } from '@/utils/productData';
import { ShoppingCart, UserCheck, UserPlus, AlertTriangle, LockIcon, CheckCircle } from 'lucide-react';

const ShareList = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<GroceryList | null>(null);
  const [accessStatus, setAccessStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [joining, setJoining] = useState(false);

  // Fetch the shared list
  useEffect(() => {
    const fetchList = async () => {
      if (!id) {
        setLoading(false);
        setAccessStatus('denied');
        return;
      }

      try {
        console.log('Fetching shared list with ID:', id);
        
        // First, just get the list basic info - we'll check access after
        const { data, error } = await supabase
          .from('grocery_lists')
          .select('id, name, user_id, created_at, collaborators')
          .eq('id', id)
          .single();
          
        if (error) {
          console.error('Error fetching shared list:', error);
          setAccessStatus('denied');
          setLoading(false);
          return;
        }
        
        console.log('Found list:', data);

        // If the user is logged in, check if they already have access
        if (user) {
          // Check if the user is the owner
          if (data.user_id === user.id) {
            console.log('User is the owner of this list');
            navigate(`/grocery-list?id=${id}`);
            return;
          }
          
          // Check if the user is already a collaborator
          const userEmail = user.email || '';
          if (data.collaborators?.includes(userEmail)) {
            console.log('User is already a collaborator');
            setAccessStatus('granted');
            setList({
              id: data.id,
              name: data.name,
              createdBy: data.user_id,
              createdAt: data.created_at,
              collaborators: data.collaborators || [],
              items: []
            });
            setLoading(false);
            return;
          }
        }
        
        // For public share links, we'll grant access by default
        // In a more secure app, you'd have a separate 'public' flag
        setAccessStatus('granted');
        setList({
          id: data.id,
          name: data.name,
          createdBy: data.user_id,
          createdAt: data.created_at,
          collaborators: data.collaborators || [],
          items: []
        });
      } catch (error) {
        console.error('Error in fetchList:', error);
        setAccessStatus('denied');
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [id, user, navigate]);

  // Handle joining the list as a collaborator
  const handleJoinList = async () => {
    if (!user || !list) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to join this grocery list.',
        variant: 'destructive'
      });
      return;
    }

    setJoining(true);

    try {
      // Get current collaborators
      const { data, error: fetchError } = await supabase
        .from('grocery_lists')
        .select('collaborators, collaboration_details')
        .eq('id', list.id)
        .single();
        
      if (fetchError) {
        throw new Error('Could not fetch list details');
      }

      // Add user to collaborators
      const collaborators = [...(data.collaborators || [])];
      const userEmail = user.email;
      
      if (userEmail && !collaborators.includes(userEmail)) {
        collaborators.push(userEmail);
      }
      
      // Also add to detailed collaborators if that exists
      const collaborationDetails = [...(data.collaboration_details || [])];
      if (userEmail && !collaborationDetails.some(c => c.email === userEmail)) {
        collaborationDetails.push({
          email: userEmail,
          permissions: 'write',
          status: 'active', // Auto-accept for direct link joins
          addedAt: new Date().toISOString()
        });
      }

      // Update the list
      const { error: updateError } = await supabase
        .from('grocery_lists')
        .update({ 
          collaborators,
          collaboration_details: collaborationDetails
        })
        .eq('id', list.id);

      if (updateError) {
        throw new Error('Failed to join the list');
      }

      toast({
        title: 'Success!',
        description: `You have joined "${list.name}"`,
      });

      // Navigate to the list
      navigate(`/grocery-list?id=${list.id}`);
    } catch (error) {
      console.error('Error joining list:', error);
      toast({
        title: 'Failed to join',
        description: 'There was a problem joining this list. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setJoining(false);
    }
  };

  // Handle navigating to the list (if already a collaborator)
  const handleViewList = () => {
    if (list) {
      navigate(`/grocery-list?id=${list.id}`);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-md">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (accessStatus === 'denied' || !list) {
    return (
      <div className="container mx-auto p-4 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
              List Not Found
            </CardTitle>
            <CardDescription>
              The grocery list you're looking for doesn't exist or you don't have permission to view it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Possible reasons:</p>
            <ul className="list-disc ml-5 mt-2">
              <li>The link is incorrect or expired</li>
              <li>The list has been deleted by its owner</li>
              <li>You need to be signed in to access this list</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => navigate('/')}>
              Go to Home Page
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart className="mr-2 h-5 w-5" />
            Shared Grocery List
          </CardTitle>
          <CardDescription>
            You've been invited to collaborate on a grocery list
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">{list.name}</h3>
            <p className="text-sm text-muted-foreground">
              This list has {list.collaborators.length} collaborator(s)
            </p>
          </div>

          {user ? (
            list.collaborators.includes(user.email || '') ? (
              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                <div>
                  <p className="font-medium">You're already a collaborator</p>
                  <p className="text-sm">You can view and edit this list</p>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                <p>Join this list to view items and collaborate with others</p>
              </div>
            )
          ) : (
            <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md flex items-center">
              <LockIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2" />
              <div>
                <p className="font-medium">Sign in required</p>
                <p className="text-sm">Please sign in to join this grocery list</p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          {user ? (
            list.collaborators.includes(user.email || '') ? (
              <Button className="w-full" onClick={handleViewList}>
                <UserCheck className="mr-2 h-4 w-4" />
                View Grocery List
              </Button>
            ) : (
              <Button 
                className="w-full" 
                onClick={handleJoinList}
                disabled={joining}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {joining ? 'Joining...' : 'Join Grocery List'}
              </Button>
            )
          ) : (
            <Button className="w-full" onClick={() => navigate('/login')}>
              Sign In to Continue
            </Button>
          )}
          
          <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ShareList; 