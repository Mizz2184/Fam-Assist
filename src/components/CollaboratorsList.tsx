import { useState } from 'react';
import { Collaborator } from '@/lib/types/store';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Trash, 
  UserCog, 
  Settings, 
  Send, 
  UserPlus, 
  User,
  MoreHorizontal,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface CollaboratorsListProps {
  collaborators: Collaborator[];
  simpleCollaborators?: string[];
  isOwner: boolean;
  onRemove?: (email: string) => void;
  onResend?: (email: string) => void;
  onAddClick?: () => void;
}

const CollaboratorsList = ({
  collaborators,
  simpleCollaborators = [],
  isOwner,
  onRemove,
  onResend,
  onAddClick
}: CollaboratorsListProps) => {
  const { toast } = useToast();

  // Convert simple collaborators (just email strings) to Collaborator objects
  const allCollaborators = [
    ...collaborators,
    ...simpleCollaborators.map(email => ({
      email,
      permissions: 'write' as const,
      status: 'pending' as const,
      addedAt: new Date().toISOString()
    }))
  ];

  // Get initials from email for avatar
  const getInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  // Get status badge
  const getStatusBadge = (status: 'pending' | 'active') => {
    if (status === 'pending') {
      return (
        <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800">
          Pending
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="ml-2 bg-green-100 text-green-800">
        Active
      </Badge>
    );
  };

  // Get permission badge
  const getPermissionBadge = (permission: 'read' | 'write' | 'admin') => {
    switch (permission) {
      case 'read':
        return (
          <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800">
            Read
          </Badge>
        );
      case 'write':
        return (
          <Badge variant="outline" className="ml-2 bg-purple-100 text-purple-800">
            Edit
          </Badge>
        );
      case 'admin':
        return (
          <Badge variant="outline" className="ml-2 bg-red-100 text-red-800">
            Admin
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Collaborators</CardTitle>
            <CardDescription>
              People with access to this grocery list
            </CardDescription>
          </div>
          {isOwner && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onAddClick}
              className="h-8"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Invite
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {allCollaborators.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="mx-auto h-8 w-8 opacity-50 mb-2" />
            <p>No collaborators yet</p>
            <p className="text-sm mt-1">Invite someone to share this list</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allCollaborators.map((collaborator) => (
              <div 
                key={collaborator.email} 
                className="flex items-center justify-between p-2 hover:bg-muted rounded-md"
              >
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(collaborator.email)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium">{collaborator.email}</span>
                      {getStatusBadge(collaborator.status)}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      {getPermissionBadge(collaborator.permissions)}
                      <span className="ml-2 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Added {formatDistanceToNow(new Date(collaborator.addedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>

                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {collaborator.status === 'pending' && onResend && (
                        <DropdownMenuItem onClick={() => onResend(collaborator.email)}>
                          <Send className="mr-2 h-4 w-4" />
                          Resend invitation
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => {
                        if (onRemove) {
                          onRemove(collaborator.email);
                        }
                      }}>
                        <Trash className="mr-2 h-4 w-4" />
                        Remove access
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CollaboratorsList; 