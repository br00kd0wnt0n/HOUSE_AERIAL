// client/src/components/AdminPanel/LoginForm.js - Login form for admin access

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { useToast } from '../ui/use-toast';

const LoginForm = () => {
  const { isInitialized, login, initializePassword, isLoading, error } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { toast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!password) {
      setPasswordError('Password is required');
      return;
    }

    const result = await login(password);
    if (!result.success) {
      setPasswordError(result.error || 'Login failed');
      toast({
        title: 'Login Failed',
        description: result.error || 'Invalid password',
        variant: 'destructive',
      });
    }
  };

  const handleInitialize = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!password) {
      setPasswordError('Password is required');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    const result = await initializePassword(password);
    if (!result.success) {
      setPasswordError(result.error || 'Failed to set password');
      toast({
        title: 'Password Setup Failed',
        description: result.error || 'Failed to set password',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Password Set',
        description: 'Admin password has been set successfully',
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-netflix-black p-4">
      <Card className="w-full max-w-md bg-netflix-black border-netflix-medium-gray">
        <CardHeader>
          <CardTitle className="text-netflix-red text-xl">
            {isInitialized ? 'Admin Login' : 'Set Admin Password'}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {isInitialized
              ? 'Enter your password to access the admin panel'
              : 'Create a password to secure the admin panel'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isInitialized ? handleLogin : handleInitialize}>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isInitialized ? "Enter password" : "Create password"}
                  className="bg-netflix-dark-gray border-netflix-dark-gray text-black"
                  disabled={isLoading}
                />
              </div>

              {!isInitialized && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="bg-netflix-dark-gray border-netflix-dark-gray text-black"
                    disabled={isLoading}
                  />
                </div>
              )}

              {passwordError && (
                <div className="text-red-500 text-sm mt-1">{passwordError}</div>
              )}

              {error && (
                <div className="text-red-500 text-sm mt-1">{error}</div>
              )}
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full bg-netflix-red hover:bg-netflix-red-hover"
            onClick={isInitialized ? handleLogin : handleInitialize}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isInitialized ? 'Logging in...' : 'Setting password...'}
              </span>
            ) : (
              isInitialized ? 'Login' : 'Set Password'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginForm; 