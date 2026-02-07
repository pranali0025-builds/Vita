import React from 'react';

// Define the shape of the context
interface AuthContextType {
  signOut: () => void;
}

// Create the context with a default empty function
export const AuthContext = React.createContext<AuthContextType>({
  signOut: () => {},
});