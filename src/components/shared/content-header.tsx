import { cn } from "@/src/lib/utils";
import { Button } from "../ui/button";
import Link from "next/link";

interface ContentHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  buttonTitle?: string;
  buttonLink?: string;
  onButtonClick?: () => void;
  customRight?: React.ReactNode;
}

export function ContentHeader({
  title,
  subtitle,
  className,
  buttonTitle,
  buttonLink,
  onButtonClick,
  customRight,
}: ContentHeaderProps) {
  const handleButtonClick = () => {
    if (onButtonClick) onButtonClick();
  };

  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {!!subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
      </div>
      {!!customRight && customRight}
      {!customRight && !!buttonTitle && !!buttonLink && (
        <Link href={buttonLink}>
          <Button>{buttonTitle}</Button>
        </Link>
      )}
      {!customRight && !!buttonTitle && !buttonLink && !!onButtonClick && (
        <Button onClick={handleButtonClick}>{buttonTitle}</Button>
      )}
    </div>
  );
}
