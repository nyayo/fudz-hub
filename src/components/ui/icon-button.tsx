import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface IconButtonProps extends ButtonProps {
  label: string;     // aria-label, and the tooltip text unless `tooltip` is given
  tooltip?: string;  // optional different tooltip text (e.g. why a button is disabled)
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, tooltip, variant = "ghost", size = "icon", disabled, ...props }, ref) => {
    const button = (
      <Button ref={ref} variant={variant} size={size} disabled={disabled} aria-label={label} {...props} />
    );
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Disabled buttons swallow hover events, so the trigger moves to a wrapper */}
          {disabled ? <span className="inline-flex" tabIndex={0}>{button}</span> : button}
        </TooltipTrigger>
        <TooltipContent>{tooltip ?? label}</TooltipContent>
      </Tooltip>
    );
  },
);
IconButton.displayName = "IconButton";

