import React from "react";
import { cn } from "../utils";

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) =>
  <div
    ref={ref}
    data-slot="scroll-area"
    className={cn("relative overflow-auto", className)}
    {...props}>
    
      {children}
    </div>

);
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };