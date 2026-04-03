import React from "react";
import { Toaster as SonnerToaster } from "sonner";
import { cn } from "../utils";

interface ToasterProps {
  className?: string;
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
  theme?: "light" | "dark" | "system";
  richColors?: boolean;
  expand?: boolean;
  closeButton?: boolean;
}

const Toaster: React.FC<ToasterProps> = ({ theme = "light", ...props }) => {
  return (
    <SonnerToaster
      theme={theme}
      className="toaster group"
      style={
      {
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
        "--border-radius": "var(--radius)"
      } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast"
        }
      }}
      {...props} />);


};

export { Toaster };