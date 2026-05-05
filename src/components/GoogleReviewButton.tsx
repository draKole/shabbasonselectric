import { Button, ButtonProps } from "@/components/ui/button";
import { useAppSetting } from "@/lib/useAppSettings";
import { useAuth } from "@/contexts/AuthContext";

interface Props extends Omit<ButtonProps, "onClick"> {
  label?: string;
}

export function GoogleReviewButton({ label = "Leave a Google Review", className, ...rest }: Props) {
  const { value: url, loading } = useAppSetting("google_review_url");
  const { isAdmin } = useAuth();
  if (loading) return null;
  if (!url) {
    return (
      <div className="text-sm text-muted-foreground">
        {isAdmin ? "Add your Google review link in Admin Settings." : null}
      </div>
    );
  }
  return (
    <Button asChild className={className} {...rest}>
      <a href={url} target="_blank" rel="noopener noreferrer">{label}</a>
    </Button>
  );
}
