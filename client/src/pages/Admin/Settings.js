// client/src/pages/Admin/Settings.js - Admin settings page

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { useToast } from '../../components/ui/use-toast';
import { useState } from 'react';

const Settings = () => {
  const { changePassword, isLoading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { toast } = useToast();

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate inputs
    if (!currentPassword) {
      setError('Current password is required');
      return;
    }

    if (!newPassword) {
      setError('New password is required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    // Submit password change
    const result = await changePassword(currentPassword, newPassword);
    
    if (result.success) {
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: 'Password Changed',
        description: 'Your password has been updated successfully',
      });
    } else {
      setError(result.error || 'Failed to change password');
      toast({
        title: 'Error',
        description: result.error || 'Failed to change password',
        variant: 'destructive',
      });
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 bg-netflix-black text-white">
        <div className="w-12 h-12 border-4 border-netflix-red border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Processing...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-netflix-black text-white">
      <Card className="bg-netflix-dark border-netflix-gray max-w-md">
        <CardHeader>
          <h2 className="text-xl font-bold text-white">Change Password</h2>
          <p className="text-netflix-lightgray text-sm">Update your admin password</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="currentPassword" className="block font-medium text-white">
                Current Password
              </label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="bg-netflix-black border-netflix-gray text-white"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="newPassword" className="block font-medium text-white">
                New Password
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="bg-netflix-black border-netflix-gray text-white"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block font-medium text-white">
                Confirm New Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="bg-netflix-black border-netflix-gray text-white"
              />
            </div>
            
            {error && (
              <div className="text-red-500 text-sm p-2 bg-red-500/10 rounded-md">
                {error}
              </div>
            )}
            
            {success && (
              <div className="text-green-500 text-sm p-2 bg-green-500/10 rounded-md">
                {success}
              </div>
            )}
            
            <Button 
              type="submit"
              className="w-full bg-netflix-red hover:bg-netflix-red/80"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Updating Password...
                </span>
              ) : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings; 