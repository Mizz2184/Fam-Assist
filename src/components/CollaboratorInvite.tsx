import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserPlus, Send, X, Check, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { addCollaborator } from '@/lib/services/groceryListService';
import { Collaborator } from '@/lib/types/store';

interface CollaboratorInviteProps {
  listId: string;
  userId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  existingCollaborators?: Collaborator[];
  simpleCollaborators?: string[];
  onSuccess?: () => void;
}

const CollaboratorInvite = ({
  listId,
  userId,
  open,
  setOpen,
  existingCollaborators = [],
  simpleCollaborators = [],
  onSuccess
}: CollaboratorInviteProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState('email');
  const [permission, setPermission] = useState<'read' | 'write' | 'admin'>('write');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Generate a shareable link that includes the list ID
  const shareLink = `${window.location.origin}/share-list/${listId}`;
  
  const handleEmailInvite = async () => {
    if (!email.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter a valid email address.',
        variant: 'destructive'
      });
      return;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive'
      });
      return;
    }
    
    // Check if email is already a collaborator
    const isExistingCollaborator = existingCollaborators.some(
      c => c.email.toLowerCase() === email.toLowerCase()
    ) || simpleCollaborators.some(
      e => e.toLowerCase() === email.toLowerCase()
    );
    
    if (isExistingCollaborator) {
      toast({
        title: 'Already invited',
        description: 'This person is already a collaborator on this list.',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log(`Attempting to add collaborator to list ${listId}`);
      console.log(`User ID: ${userId}, Email: ${email}, Permission: ${permission}`);
      
      const success = await addCollaborator(listId, userId, email, permission);
      
      if (success) {
        toast({
          title: 'Invitation sent',
          description: `${email} has been invited to collaborate on this list.`,
        });
        
        setEmail('');
        setPermission('write');
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        console.error('Collaborator invitation failed in UI');
        
        // Show different message based on the likely cause
        toast({
          title: 'Invitation failed',
          description: 'There was a problem sending the invitation. Please try again later.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error inviting collaborator:', error);
      
      // Log detailed error for debugging
      if (error instanceof Error) {
        console.error(`Error message: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
      }
      
      toast({
        title: 'Invitation failed',
        description: 'Unexpected error when sending the invitation. Our team has been notified.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      toast({
        title: 'Link copied',
        description: 'Share link copied to clipboard.',
      });
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Collaborators</DialogTitle>
          <DialogDescription>
            Share your grocery list with friends and family.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="email" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">By Email</TabsTrigger>
            <TabsTrigger value="link">Share Link</TabsTrigger>
          </TabsList>
          
          <TabsContent value="email" className="space-y-4 pt-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Permissions</Label>
              <RadioGroup value={permission} onValueChange={(val: 'read' | 'write' | 'admin') => setPermission(val)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="read" id="read" />
                  <Label htmlFor="read">Read only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="write" id="write" />
                  <Label htmlFor="write">Can edit</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="admin" id="admin" />
                  <Label htmlFor="admin">Admin</Label>
                </div>
              </RadioGroup>
            </div>
            
            <Button 
              onClick={handleEmailInvite} 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>Sending</>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </TabsContent>
          
          <TabsContent value="link" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Share link</Label>
              <div className="flex space-x-2">
                <Input 
                  value={shareLink} 
                  readOnly 
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Anyone with this link can view this grocery list.
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex flex-row justify-between">
          <Button variant="outline" onClick={() => setOpen(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          
          {activeTab === 'email' ? (
            <Button onClick={handleEmailInvite} disabled={isSubmitting}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite
            </Button>
          ) : (
            <Button onClick={handleCopyLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CollaboratorInvite; 