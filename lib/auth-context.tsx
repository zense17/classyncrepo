import { createContext, useContext, useEffect, useState } from "react";
import { ID, Models } from "react-native-appwrite";
import { account } from "./appwrite";

type AuthResponse = {
  success: boolean;
  error?: string;
  userId?: string;
  requiresOTP?: boolean;
};

type AuthContextType = {
  user: Models.User<Models.Preferences> | null;
  isLoadingUser: boolean;
  signUp: (email: string, password: string, username: string) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  verifyOTP: (userId: string, secret: string) => Promise<AuthResponse>;
  resendOTP: (email: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    try {
      const session = await account.get();
      setUser(session);
    } catch {
      setUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    username: string
  ): Promise<AuthResponse> => {
    try {
      // Create the user account
      const newUser = await account.create(ID.unique(), email, password, username);
      
      // Create OTP session (sends 6-digit code to email)
      const token = await account.createEmailToken(ID.unique(), email);
      
      return {
        success: true,
        userId: token.userId,
        requiresOTP: true,
      };
    } catch (error) {
      console.error("Sign up error:", error);
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: "An error occurred during signup",
      };
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<AuthResponse> => {
    try {
      // Try to create email session first
      try {
        await account.createEmailPasswordSession(email, password);
        const session = await account.get();
        
        // Successfully logged in
        setUser(session);
        return {
          success: true,
        };
      } catch (sessionError) {
        // If session creation fails, send OTP
        const token = await account.createEmailToken(ID.unique(), email);
        
        return {
          success: true,
          userId: token.userId,
          requiresOTP: true,
        };
      }
    } catch (error) {
      console.error("Sign in error:", error);
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: "An error occurred during sign in",
      };
    }
  };

  const verifyOTP = async (
    userId: string,
    secret: string
  ): Promise<AuthResponse> => {
    try {
      // Create session using the OTP code
      await account.createSession(userId, secret);
      
      // Get the updated user session
      const session = await account.get();
      setUser(session);
      
      return {
        success: true,
      };
    } catch (error) {
      console.error("OTP verification error:", error);
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: "Invalid or expired verification code",
      };
    }
  };

  const resendOTP = async (email: string): Promise<AuthResponse> => {
    try {
      // Resend OTP email
      await account.createEmailToken(ID.unique(), email);
      
      return {
        success: true,
      };
    } catch (error) {
      console.error("Resend OTP error:", error);
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: "Failed to resend verification code",
      };
    }
  };

  const signOut = async () => {
    try {
      await account.deleteSession("current");
      setUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoadingUser,
        signUp,
        signIn,
        verifyOTP,
        resendOTP,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be inside of the AuthProvider");
  }

  return context;
}