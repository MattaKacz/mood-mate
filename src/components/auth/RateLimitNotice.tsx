import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RateLimitNoticeProps {
  remainingSeconds?: number;
}

export default function RateLimitNotice({ remainingSeconds }: RateLimitNoticeProps) {
  const countdown =
    typeof remainingSeconds === "number" && remainingSeconds > 0 ? `${remainingSeconds}s` : "kilka sekund";

  return (
    <Alert
      className="border-amber-400/60 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-100"
      role="status"
    >
      <AlertTitle>Zbyt wiele prób</AlertTitle>
      <AlertDescription>Odczekaj {countdown}, zanim spróbujesz ponownie. To chroni społeczność.</AlertDescription>
    </Alert>
  );
}
