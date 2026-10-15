import { TeamPanel } from "@/components/TeamPanel";

/**
 * Standalone Team page — always-visible entry point (nav item) that works at
 * every viewport width, unlike the chat side panel which is hidden in
 * narrow layouts. Team chat is local to this machine (see TeamPanel).
 */
export default function TeamPage() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <TeamPanel active />
    </div>
  );
}
