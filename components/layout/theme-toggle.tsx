"use client";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
const subscribe = () => () => {};
export function ThemeToggle() {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const { resolvedTheme, setTheme } = useTheme();
  const dark = mounted && resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={!mounted}
      aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {mounted && (dark ? <Sun /> : <Moon />)}
    </Button>
  );
}
