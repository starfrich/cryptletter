import React from "react";

type PageContainerProps = {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
};

/**
 * Consistent page container component for all pages
 * Ensures uniform spacing and max-width across the application
 */
export const PageContainer = ({ children, maxWidth = "lg", className = "" }: PageContainerProps) => {
  const maxWidthClasses = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    full: "max-w-full",
  };

  return (
    <div className={`w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 ${maxWidthClasses[maxWidth]} ${className}`}>
      {children}
    </div>
  );
};
