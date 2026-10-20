import { BookOpen, CreditCard, ExternalLink, ShieldCheck } from "lucide-react";
import { useLayoutEffect } from "react";

import { usePageHeader } from "@/contexts/usePageHeader";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { PluginSlot } from "@/plugins";

export const HEBRI_DOCS_URL = "https://github.com/satoshilove/hebri#readme";

const DOC_LINKS = [
  {
    description: "Install Hebri on Windows, macOS, Omarchy, and other Linux distributions.",
    href: HEBRI_DOCS_URL,
    icon: BookOpen,
    label: "Install and use Hebri"
  },
  {
    description: "Review the supported versions, reporting process, and security policy.",
    href: "https://github.com/satoshilove/hebri/blob/main/SECURITY.md",
    icon: ShieldCheck,
    label: "Security"
  },
  {
    description: "See the production checklist for Synapsek account login and Stripe billing.",
    href: "https://github.com/satoshilove/hebri/blob/main/docs/SYNAPSEK_ACCOUNT_AND_BILLING_INTEGRATION.md",
    icon: CreditCard,
    label: "Accounts and billing"
  }
] as const;

const BUTTON_CN = cn(
  "group relative inline-grid grid-cols-[auto_1fr_auto] items-center",
  "gap-2 px-[.9em_.75em] py-[1.25em]",
  "bg-transparent font-bold uppercase leading-0 tracking-[0.2em] text-midground shadow-midground",
  "shadow-[inset_-1px_-1px_0_0_#00000080,inset_1px_1px_0_0_#ffffff80]"
);

export default function DocsPage() {
  const { t } = useI18n();
  const { setEnd } = usePageHeader();

  useLayoutEffect(() => {
    setEnd(
      <a className={BUTTON_CN} href={HEBRI_DOCS_URL} rel="noopener noreferrer" target="_blank">
        <ExternalLink className="size-3.5" />
        {t.app.openDocumentation}
      </a>
    );

    return () => setEnd(null);
  }, [setEnd, t]);

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-6 overflow-auto p-4 sm:p-6">
      <PluginSlot name="docs:top" />
      <div className="max-w-3xl">
        <p className="text-sm text-muted-foreground">
          Hebri documentation is maintained with the application source so every guide matches the released code.
        </p>
      </div>
      <div className="grid max-w-5xl gap-4 md:grid-cols-3">
        {DOC_LINKS.map(({ description, href, icon: Icon, label }) => (
          <a
            className="group flex min-h-40 flex-col gap-4 rounded-sm border border-current/20 bg-card p-5 transition-colors hover:border-primary/60 hover:bg-accent/30"
            href={href}
            key={href}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon className="size-5 text-primary" />
            <div>
              <div className="flex items-center gap-2 font-semibold">
                {label}
                <ExternalLink className="size-3.5 opacity-60" />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </a>
        ))}
      </div>
      <PluginSlot name="docs:bottom" />
    </div>
  );
}
