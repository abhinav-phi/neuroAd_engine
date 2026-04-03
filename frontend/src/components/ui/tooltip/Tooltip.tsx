import React from "react";
import { cn } from "../utils";

interface TooltipContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const TooltipContext = React.createContext<TooltipContextType>({
  open: false,
  setOpen: () => {}
});

const TooltipProvider: React.FC<{children: React.ReactNode;delayDuration?: number;}> = ({ children }) => {
  return <>{children}</>;
};

interface TooltipProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Tooltip: React.FC<TooltipProps> = ({ children, open, defaultOpen = false, onOpenChange }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const controlledOpen = open !== undefined ? open : isOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (open === undefined) setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <TooltipContext.Provider value={{ open: controlledOpen, setOpen: handleOpenChange }}>
      <div className="relative inline-block">{children}</div>
    </TooltipContext.Provider>);

};

const TooltipTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ onMouseEnter, onMouseLeave, ...props }, ref) => {
    const { setOpen } = React.useContext(TooltipContext);
    return (
      <button
        ref={ref}
        type="button"
        data-slot="tooltip-trigger"
        onMouseEnter={(e) => {setOpen(true);onMouseEnter?.(e);}}
        onMouseLeave={(e) => {setOpen(false);onMouseLeave?.(e);}}
        {...props} />);


  }
);
TooltipTrigger.displayName = "TooltipTrigger";

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, ...props }, ref) => {
    const { open } = React.useContext(TooltipContext);
    if (!open) return null;

    return (
      <div
        ref={ref}
        data-slot="tooltip-content"
        className={cn(
          "absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 inline-flex w-fit max-w-xs items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background",
          className
        )}
        {...props} />);


  }
);
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };