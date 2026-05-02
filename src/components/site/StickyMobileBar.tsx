import { Link } from "react-router-dom";
import { Calendar, MessageSquare, Phone } from "lucide-react";
import { telHref, smsHref } from "@/lib/business";

export const StickyMobileBar = () => {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur">
      <div className="grid grid-cols-3">
        <a
          href={telHref}
          className="flex flex-col items-center justify-center gap-1 py-3 text-success font-semibold"
        >
          <Phone className="h-5 w-5" />
          <span className="text-xs">Call</span>
        </a>
        <a
          href={smsHref()}
          className="flex flex-col items-center justify-center gap-1 py-3 text-secondary font-semibold border-x border-border"
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs">Text</span>
        </a>
        <Link
          to="/schedule"
          className="flex flex-col items-center justify-center gap-1 py-3 text-primary font-semibold"
        >
          <Calendar className="h-5 w-5" />
          <span className="text-xs">Schedule</span>
        </Link>
      </div>
    </div>
  );
};
